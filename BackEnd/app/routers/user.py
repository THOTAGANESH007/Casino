from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List
from decimal import Decimal
from ..database import get_db
from ..models.user import User
from ..models.game import GameSession, GameRound, Bet, Game, BetStatus
from ..models.wallet import Wallet, WalletType
from ..models.tenant import Tenant
from ..schemas.user import ChangePasswordRequest, FullUserProfile, GameHistoryItem, ActiveSessionItem
from ..utils.dependencies import get_current_active_user
from ..utils.security import verify_password, get_password_hash

router = APIRouter(prefix="/user", tags=["User Profile"])

@router.get("/profile", response_model=FullUserProfile)
async def get_user_profile(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get detailed user profile with stats filtered by the ACTIVE Tenant"""
    
    # 1. Calculate Stats specifically for the current Tenant
    # We join Bet -> Wallet to ensure we only count money spent in the current casino
    stats_query = db.query(
        func.sum(Bet.bet_amount).label("total_bet"),
        func.sum(Bet.payout_amount).label("total_payout"),
        func.count(func.distinct(GameSession.session_id)).label("total_games")
    ).select_from(Bet)\
     .join(Wallet, Bet.wallet_id == Wallet.wallet_id)\
     .join(GameRound, Bet.round_id == GameRound.round_id)\
     .join(GameSession, GameRound.session_id == GameSession.session_id)\
     .filter(
         Wallet.user_id == current_user.user_id,
         Wallet.tenant_id == current_user.tenant_id, # Filter by active Casino
         Bet.bet_status != BetStatus.cancelled
     )
    
    stats_result = stats_query.first()
    
    total_bet = stats_result.total_bet or Decimal("0")
    total_payout = stats_result.total_payout or Decimal("0")
    
    # 2. Get Active Tenant Info
    tenant = db.query(Tenant).filter(Tenant.tenant_id == current_user.tenant_id).first()
    currency = tenant.default_currency if tenant and tenant.default_currency else "USD"

    return {
        "user_id": current_user.user_id,
        "full_name": f"{current_user.first_name} {current_user.last_name or ''}".strip(),
        "email": current_user.email,
        "tenant_name": tenant.tenant_name if tenant else "Unknown Casino",
        "currency": currency,
        "kyc_status": current_user.kyc.verified_status if current_user.kyc else False,
        "stats": {
            "total_wagered": total_bet,
            "total_payout": total_payout,
            "net_profit": total_payout - total_bet,
            "total_games_played": stats_result.total_games or 0
        },
        "region_name": current_user.region.region_name if current_user.region else None
    }

@router.get("/history", response_model=List[GameHistoryItem])
async def get_game_history(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get finished game sessions for the current active Tenant"""
    
    # We join with the Wallet table to filter history by the active casino
    sessions = db.query(GameSession)\
        .join(GameRound)\
        .join(Bet)\
        .join(Wallet)\
        .filter(
            GameSession.user_id == current_user.user_id,
            Wallet.tenant_id == current_user.tenant_id, # Only show history for this casino
            GameSession.ended_at.isnot(None)
        )\
        .order_by(desc(GameSession.started_at))\
        .distinct()\
        .limit(limit).all()
    
    history = []
    for session in sessions:
        # Calculate totals for this specific session
        bets = db.query(
            func.sum(Bet.bet_amount).label("total_bet"),
            func.sum(Bet.payout_amount).label("total_payout")
        ).join(GameRound).filter(GameRound.session_id == session.session_id).first()
        
        b_amt = bets.total_bet or Decimal("0")
        p_amt = bets.total_payout or Decimal("0")
        
        status = "won" if p_amt > b_amt else "lost"
        if p_amt == b_amt: status = "draw"

        history.append({
            "session_id": session.session_id,
            "game_name": session.game.game_name,
            "started_at": session.started_at,
            "ended_at": session.ended_at,
            "total_bet": b_amt,
            "total_payout": p_amt,
            "status": status
        })
        
    return history

@router.get("/active-sessions", response_model=List[ActiveSessionItem])
async def get_active_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get unfinished game sessions for the current active Tenant"""
    
    # Join with Bet and Wallet to ensure user can only resume games 
    # belonging to the casino they are currently logged into
    sessions = db.query(GameSession)\
        .join(GameRound)\
        .join(Bet)\
        .join(Wallet)\
        .filter(
            GameSession.user_id == current_user.user_id,
            Wallet.tenant_id == current_user.tenant_id,
            GameSession.ended_at.is_(None)
        )\
        .order_by(desc(GameSession.started_at))\
        .distinct()\
        .all()
    
    result = []
    for session in sessions:
        result.append({
            "session_id": session.session_id,
            "game_name": session.game.game_name,
            "started_at": session.started_at,
            "current_state": None 
        })
    return result

@router.put("/change-password")
async def change_password(
    data: ChangePasswordRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    # 1. Verify current password
    if not verify_password(data.current_password, current_user.password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    # 2. Hash and update
    current_user.password = get_password_hash(data.new_password)
    db.commit()
    
    return {"message": "Password updated successfully"}