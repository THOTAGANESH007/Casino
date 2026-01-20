from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List
from decimal import Decimal
from ..database import get_db
from ..models.user import User
from ..models.game import GameSession, GameRound, Bet, Game
from ..models.wallet import Wallet
from ..models.tenant import Tenant
from ..schemas.user import FullUserProfile, GameHistoryItem, ActiveSessionItem
from ..utils.dependencies import get_current_active_user

router = APIRouter(prefix="/user", tags=["User Profile"])

@router.get("/profile", response_model=FullUserProfile)
async def get_user_profile(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get detailed user profile with aggregate stats"""
    
    # 1. Calculate Stats (Aggregation)
    # Join Wallets -> Bets to get total wagered/won
    stats_query = db.query(
        func.sum(Bet.bet_amount).label("total_bet"),
        func.sum(Bet.payout_amount).label("total_payout"),
        func.count(GameSession.session_id).label("total_games")
    ).select_from(GameSession)\
     .join(GameRound, GameRound.session_id == GameSession.session_id)\
     .join(Bet, Bet.round_id == GameRound.round_id)\
     .filter(GameSession.user_id == current_user.user_id)
    
    stats_result = stats_query.first()
    
    total_bet = stats_result.total_bet or Decimal(0)
    total_payout = stats_result.total_payout or Decimal(0)
    
    # 2. Get Tenant Info
    tenant = db.query(Tenant).filter(Tenant.tenant_id == current_user.tenant_id).first()
    currency = tenant.default_currency if tenant and tenant.default_currency else "USD"

    return {
        "user_id": current_user.user_id,
        "full_name": f"{current_user.first_name} {current_user.last_name or ''}".strip(),
        "email": current_user.email,
        "tenant_name": tenant.tenant_name if tenant else "Unknown",
        "currency": currency,
        "kyc_status": current_user.kyc.verified_status if current_user.kyc else False,
        "stats": {
            "total_wagered": total_bet,
            "total_payout": total_payout,
            "net_profit": total_payout - total_bet,
            "total_games_played": stats_result.total_games or 0
        }
    }

@router.get("/history", response_model=List[GameHistoryItem])
async def get_game_history(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get finished game sessions"""
    sessions = db.query(GameSession).filter(
        GameSession.user_id == current_user.user_id,
        GameSession.ended_at.isnot(None)
    ).order_by(desc(GameSession.started_at)).limit(limit).all()
    
    history = []
    for session in sessions:
        # Calculate totals for this session
        bets = db.query(
            func.sum(Bet.bet_amount).label("total_bet"),
            func.sum(Bet.payout_amount).label("total_payout")
        ).join(GameRound).filter(GameRound.session_id == session.session_id).first()
        
        b_amt = bets.total_bet or Decimal(0)
        p_amt = bets.total_payout or Decimal(0)
        
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
    """Get unfinished game sessions"""
    sessions = db.query(GameSession).filter(
        GameSession.user_id == current_user.user_id,
        GameSession.ended_at.is_(None)
    ).order_by(desc(GameSession.started_at)).all()
    
    result = []
    for session in sessions:
        result.append({
            "session_id": session.session_id,
            "game_name": session.game.game_name,
            "started_at": session.started_at,
            "current_state": None # Complex state loading omitted for brevity
        })
    return result