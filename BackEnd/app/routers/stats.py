from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, cast, Date
from datetime import datetime, timedelta, timezone
from typing import List

from ..models.tenant import Tenant
from ..models.wallet import Wallet, WalletType
from ..database import get_db
from ..models.user import User
from ..models.game import Bet, GameSession, GameRound, Game, BetStatus
from ..schemas.stats import OwnerDashboardResponse, TenantDashboardResponse
from ..utils.dependencies import require_casino_owner, require_tenant_admin

router = APIRouter(prefix="/stats", tags=["Tenant Stats"])

@router.get("/tenant-profile", response_model=TenantDashboardResponse)
async def get_tenant_profile(
    db: Session = Depends(get_db),
    admin: User = Depends(require_tenant_admin)
):
    tid = admin.tenant_id
    now = datetime.now(timezone.utc)
    seven_days_ago = now - timedelta(days=7)

    # 1. NGR (Total Bets - Total Payouts)
    ngr_query = db.query(
        func.sum(Bet.bet_amount - Bet.payout_amount)
    ).select_from(Bet).join(GameRound).join(GameSession).join(User).filter(
        User.tenant_id == tid,
        Bet.bet_status != BetStatus.cancelled
    ).scalar() or 0

    # 2. Player Lifetime Spent Value (LTV)
    # Total wagered by all players in tenant / number of players
    total_wagered = db.query(func.sum(Bet.bet_amount))\
        .select_from(Bet).join(GameRound).join(GameSession).join(User)\
        .filter(User.tenant_id == tid).scalar() or 0
    
    total_players = db.query(func.count(User.user_id))\
        .filter(User.tenant_id == tid, User.role == "player").scalar() or 1
    
    avg_ltv = total_wagered / total_players

    # 3. Active Users Helper
    def get_active_count(days: int):
        start_date = now - timedelta(days=days)
        return db.query(func.count(func.distinct(GameSession.user_id)))\
            .join(User).filter(
                User.tenant_id == tid,
                GameSession.started_at >= start_date
            ).scalar() or 0

    # 4. Top 5 Users Weekly
    top_users = db.query(
        User.email,
        func.sum(Bet.bet_amount).label("total_wagered")
    ).select_from(User).join(GameSession).join(GameRound).join(Bet)\
     .filter(User.tenant_id == tid, GameSession.started_at >= seven_days_ago)\
     .group_by(User.email)\
     .order_by(desc("total_wagered"))\
     .limit(5).all()
    
    # 4.1 Get User Name for the top 5 users
    def get_user_name(email:str):
        user = db.query(User).filter(User.email == email).first()
        return user.first_name
    
    # 5. Game Popularity
    popularity = db.query(
        Game.game_name,
        func.count(GameSession.session_id).label("play_count")
    ).select_from(Game).join(GameSession).join(User)\
     .filter(User.tenant_id == tid)\
     .group_by(Game.game_name)\
     .order_by(desc("play_count")).all()

    # 6. Revenue Per Day
    daily_rev_results = db.query(
        cast(GameSession.started_at, Date).label("date"),
        func.sum(Bet.bet_amount - Bet.payout_amount).label("revenue")
    ).select_from(GameSession).join(GameRound).join(Bet).join(User)\
     .filter(User.tenant_id == tid, GameSession.started_at >= seven_days_ago.date())\
     .group_by(cast(GameSession.started_at, Date))\
     .order_by("date").all()

    return {
        "ngr": ngr_query,
        "avg_ltv": avg_ltv,
        "active_users_24h": get_active_count(1),
        "active_users_30d": get_active_count(30),
        "top_5_users_weekly": [{"email": u[0], "name":get_user_name(u[0]), "total_wagered": u[1]} for u in top_users],
        "game_popularity": [{"game_name": g[0], "play_count": g[1]} for g in popularity],
        "revenue_7d": [{"date": str(r[0]), "revenue": r[1]} for r in daily_rev_results]
    }
    

@router.get("/owner-profile", response_model=OwnerDashboardResponse)
async def get_owner_profile(
    db: Session = Depends(get_db),
    owner: User = Depends(require_casino_owner)
):
    now = datetime.now(timezone.utc)
    yesterday = now - timedelta(days=1)

    # 1. Global KPIs (Aggregation across the whole system)
    global_stats = db.query(
        func.sum(Bet.bet_amount).label("turnover"),
        func.sum(Bet.bet_amount - Bet.payout_amount).label("net_revenue")
    ).select_from(Bet).join(GameRound).join(GameSession).filter(
        Bet.bet_status != BetStatus.cancelled
    ).first()

    # 2. Tenant Counts
    active_tenants = db.query(func.count(Tenant.tenant_id)).filter(Tenant.status == True).scalar() or 0

    # 3. Global Active Users (24h)
    global_dau = db.query(func.count(func.distinct(GameSession.user_id)))\
        .filter(GameSession.started_at >= yesterday).scalar() or 0

    # 4. System Liquidity (Total Cash held in the system)
    liquidity = db.query(func.sum(Wallet.balance))\
        .filter(Wallet.type_of_wallet == WalletType.cash).scalar() or 0

    # 5. Tenant Leaderboard (Ranked by Turnover) - Including ALL tenants
    leaderboard_query = db.query(
        Tenant.tenant_name,
        func.count(func.distinct(User.user_id)).label("user_count"),
        func.coalesce(func.sum(Bet.bet_amount), 0).label("turnover"),
        func.coalesce(func.sum(Bet.bet_amount - Bet.payout_amount), 0).label("revenue")
    ).select_from(Tenant)\
     .outerjoin(User)\
     .outerjoin(GameSession)\
     .outerjoin(GameRound)\
     .outerjoin(Bet)\
     .group_by(Tenant.tenant_name)\
     .order_by(desc("turnover"))\
     .all()

    # 6. Global Top Games (Ranked by Revenue)
    top_games = db.query(
        Game.game_name,
        func.sum(Bet.bet_amount - Bet.payout_amount).label("revenue"),
        func.count(GameSession.session_id).label("plays")
    ).select_from(Game).join(GameSession).join(GameRound).join(Bet)\
     .group_by(Game.game_name)\
     .order_by(desc("revenue")).limit(5).all()

    return {
        "global_turnover": global_stats.turnover or 0,
        "global_net_revenue": global_stats.net_revenue or 0,
        "active_tenants_count": active_tenants,
        "global_active_users_24h": global_dau,
        "system_liquidity": liquidity,
        "tenant_leaderboard": [
            {
                "tenant_name": item[0],
                "user_count": item[1],
                "total_turnover": item[2],
                "revenue_contribution": item[3]
            } for item in leaderboard_query
        ],
        "top_performing_games": [
            {
                "game_name": item[0],
                "total_revenue": item[1],
                "play_count": item[2]
            } for item in top_games
        ]
    }