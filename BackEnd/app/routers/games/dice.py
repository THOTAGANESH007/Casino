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
from ...services.game_engines.dice_engine import DiceEngine

router = APIRouter(prefix="/games/dice", tags=["Dice"])

class DiceRollInput(BaseModel):
    bet_amount: Decimal
    target: float
    roll_over: bool = True
    client_seed: str
    nonce: int

class DiceVerifyInput(BaseModel):
    server_seed: str
    client_seed: str
    nonce: int
    claimed_result: float

@router.post("/roll")
async def roll_dice(
    roll_data: DiceRollInput,
    current_user: User = Depends(require_tenant),
    db: Session = Depends(get_db)
):
    """Roll the dice with provably fair mechanism"""
    
    # Validate target
    if roll_data.target < 0 or roll_data.target > 99.99:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Target must be between 0 and 99.99"
        )
    
    # Get or create dice game entry
    game = db.query(Game).filter(Game.game_name == "Dice").first()
    if not game:
        game = Game(game_name="Dice", rtp_percent=Decimal("99.0"))
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
        wallet_service.debit_wallet(db, wallet.wallet_id, roll_data.bet_amount)
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
    
    # Play dice round
    engine = DiceEngine()
    result = engine.play_round(
        bet_amount=roll_data.bet_amount,
        target=roll_data.target,
        roll_over=roll_data.roll_over,
        client_seed=roll_data.client_seed,
        nonce=roll_data.nonce
    )
    
    # Create bet record
    bet_record = Bet(
        round_id=round_obj.round_id,
        wallet_id=wallet.wallet_id,
        bet_amount=roll_data.bet_amount,
        payout_amount=result["payout"],
        bet_status=BetStatus.won if result["won"] else BetStatus.lost
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
        "roll_result": result["roll_result"],
        "target": result["target"],
        "roll_over": result["roll_over"],
        "won": result["won"],
        "multiplier": result["multiplier"],
        "bet_amount": result["bet_amount"],
        "payout": result["payout"],
        "server_seed": result["server_seed"],
        "server_seed_hash": result["server_seed_hash"],
        "client_seed": result["client_seed"],
        "nonce": result["nonce"]
    }

@router.post("/verify")
async def verify_dice_roll(verify_data: DiceVerifyInput):
    """Verify a dice roll result"""
    engine = DiceEngine()
    
    is_valid = engine.verify_roll(
        server_seed=verify_data.server_seed,
        client_seed=verify_data.client_seed,
        nonce=verify_data.nonce,
        claimed_result=verify_data.claimed_result
    )
    
    if is_valid:
        actual_result = engine.roll_dice(
            verify_data.server_seed,
            verify_data.client_seed,
            verify_data.nonce
        )
        return {
            "valid": True,
            "message": "Roll result is valid",
            "actual_result": actual_result
        }
    else:
        return {
            "valid": False,
            "message": "Roll result is invalid"
        }

@router.get("/calculate-multiplier")
async def calculate_multiplier(target: float, roll_over: bool = True):
    """Calculate win multiplier for given target"""
    if target < 0 or target > 99.99:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Target must be between 0 and 99.99"
        )
    
    engine = DiceEngine()
    multiplier = engine.calculate_multiplier(target, roll_over)
    
    # Calculate win chance
    if roll_over:
        win_chance = (100 - target)
    else:
        win_chance = target
    
    return {
        "target": target,
        "roll_over": roll_over,
        "multiplier": float(multiplier),
        "win_chance": win_chance
    }