from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from decimal import Decimal
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from ...database import get_db
from ...models.user import User
from ...models.game import Game, GameSession, GameRound, Bet, BetStatus
from ...models.wallet import WalletType
from ...utils.dependencies import get_current_active_user, require_tenant
from ...services.wallet_service import wallet_service
from ...services.game_engines.roulette_engine import RouletteEngine

router = APIRouter(prefix="/games/roulette", tags=["Roulette"])

class RouletteBetInput(BaseModel):
    bet_type: str
    bet_value: Optional[Any] = None
    bet_amount: Decimal

class RouletteSpinInput(BaseModel):
    bets: List[RouletteBetInput]

@router.post("/spin")
async def spin_roulette(
    spin_data: RouletteSpinInput,
    current_user: User = Depends(require_tenant),
    db: Session = Depends(get_db)
):
    """Place bets and spin the roulette wheel"""
    
    # Validate at least one bet
    if not spin_data.bets:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one bet is required"
        )
    
    # Get or create roulette game entry
    game = db.query(Game).filter(Game.game_name == "Roulette").first()
    if not game:
        game = Game(game_name="Roulette", rtp_percent=Decimal("97.3"))
        db.add(game)
        db.commit()
        db.refresh(game)
    
    # Get user's cash wallet
    wallet = wallet_service.get_wallet(db, current_user.user_id, WalletType.cash)
    if not wallet:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wallet not found"
        )
    
    # Calculate total bet amount
    total_bet_amount = sum(bet.bet_amount for bet in spin_data.bets)
    
    # Debit total bet amount
    try:
        wallet_service.debit_wallet(db, wallet.wallet_id, total_bet_amount)
    except HTTPException:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Insufficient balance"
        )
    
    # Create game session
    session = GameSession(
        user_id=current_user.user_id,
        game_id=game.game_id
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    
    # Create game round
    round_obj = GameRound(session_id=session.session_id)
    db.add(round_obj)
    db.commit()
    db.refresh(round_obj)
    
    # Initialize roulette engine and play
    engine = RouletteEngine()
    bets_data = [
        {
            "bet_type": bet.bet_type,
            "bet_value": bet.bet_value,
            "bet_amount": bet.bet_amount
        }
        for bet in spin_data.bets
    ]
    
    result = engine.play_round(bets_data)
    
    # Create bet records for each bet
    bet_records = []
    for bet_data, bet_result in zip(spin_data.bets, result["bet_results"]):
        bet_record = Bet(
            round_id=round_obj.round_id,
            wallet_id=wallet.wallet_id,
            bet_amount=bet_data.bet_amount,
            payout_amount=bet_result["payout"],
            bet_status=BetStatus.won if bet_result["won"] else BetStatus.lost
        )
        db.add(bet_record)
        bet_records.append(bet_record)
    
    db.commit()
    
    # Credit total payout to wallet if any wins
    if result["total_payout"] > 0:
        wallet_service.credit_wallet(db, wallet.wallet_id, result["total_payout"])
    
    # Close session
    from datetime import datetime
    session.ended_at = datetime.utcnow()
    db.commit()
    
    return {
        "session_id": session.session_id,
        "winning_number": result["winning_number"],
        "color": result["color"],
        "bet_results": result["bet_results"],
        "total_bet": total_bet_amount,
        "total_payout": result["total_payout"],
        "net_result": result["total_payout"] - total_bet_amount
    }

@router.get("/table-info")
async def get_table_info():
    """Get roulette table information"""
    engine = RouletteEngine()
    
    return {
        "numbers": engine.NUMBERS,
        "red_numbers": engine.RED_NUMBERS,
        "black_numbers": engine.BLACK_NUMBERS,
        "bet_types": {
            "straight": {"description": "Single number", "payout": "35:1"},
            "split": {"description": "Two adjacent numbers", "payout": "17:1"},
            "street": {"description": "Row of three numbers", "payout": "11:1"},
            "corner": {"description": "Four numbers", "payout": "8:1"},
            "line": {"description": "Two streets (6 numbers)", "payout": "5:1"},
            "dozen": {"description": "12 numbers", "payout": "2:1"},
            "column": {"description": "Column of 12 numbers", "payout": "2:1"},
            "even_money": {"description": "Red/Black, Even/Odd, Low/High", "payout": "1:1"}
        }
    }