from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from decimal import Decimal
from pydantic import BaseModel
from ...database import get_db
from ...models.user import User
from ...models.game import Game, GameSession, GameRound, Bet, BetStatus
from ...models.wallet import WalletType
from ...utils.dependencies import get_current_active_user, require_tenant
from ...services.wallet_service import wallet_service
from ...services.game_engines.slots_engine import SlotsEngine

router = APIRouter(prefix="/games/slots", tags=["Slots"])

class SlotsSpinInput(BaseModel):
    bet_amount: Decimal

@router.post("/spin")
async def spin_slots(
    spin_data: SlotsSpinInput,
    current_user: User = Depends(require_tenant),
    db: Session = Depends(get_db)
):
    """Spin the slot machine"""
    
    # Get or create slots game entry
    game = db.query(Game).filter(Game.game_name == "Slots").first()
    if not game:
        game = Game(game_name="Slots", rtp_percent=Decimal("96.0"))
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
    
    # Debit bet amount
    try:
        wallet_service.debit_wallet(db, wallet.wallet_id, spin_data.bet_amount)
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
    
    # Play slots round
    engine = SlotsEngine()
    result = engine.play_round(spin_data.bet_amount)
    
    # Create bet record
    bet_record = Bet(
        round_id=round_obj.round_id,
        wallet_id=wallet.wallet_id,
        bet_amount=spin_data.bet_amount,
        payout_amount=result["payout"],
        bet_status=BetStatus.won if result["payout"] > 0 else BetStatus.lost
    )
    db.add(bet_record)
    db.commit()
    
    # Credit payout if won
    if result["payout"] > 0:
        wallet_service.credit_wallet(db, wallet.wallet_id, result["payout"])
    
    # Close session
    from datetime import datetime
    session.ended_at = datetime.utcnow()
    db.commit()
    
    return {
        "session_id": session.session_id,
        "bet_id": bet_record.bet_id,
        "grid": result["grid"],
        "wins": result["wins"],
        "total_multiplier": result["total_multiplier"],
        "bet_amount": result["bet_amount"],
        "payout": result["payout"],
        "net_result": result["payout"] - result["bet_amount"]
    }

@router.get("/symbols")
async def get_symbols():
    """Get slot symbols and their payouts"""
    engine = SlotsEngine()
    
    symbols_info = {}
    for symbol, data in engine.SYMBOLS.items():
        symbols_info[symbol] = {
            "rarity": "rare" if data["weight"] <= 2 else "common" if data["weight"] <= 8 else "very_common",
            "payouts": data["payout"]
        }
    
    return {
        "symbols": symbols_info,
        "grid_size": f"{engine.rows}x{engine.cols}",
        "rtp": f"{engine.rtp_percent}%"
    }