from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from decimal import Decimal
from typing import Dict, Optional
from pydantic import BaseModel
import secrets
import asyncio
from ...database import get_db
from ...models.user import User
from ...models.game import Game, GameSession, GameRound, Bet, BetStatus
from ...models.wallet import WalletType
from ...utils.dependencies import get_current_active_user, require_tenant
from ...services.wallet_service import wallet_service
from ...services.game_engines.crash_engine import CrashGame

router = APIRouter(prefix="/games/crash", tags=["Crash"])

# Store active crash games
active_crash_games: Dict[str, CrashGame] = {}
current_game_id: Optional[str] = None

class CrashBetInput(BaseModel):
    bet_amount: Decimal
    auto_cashout: Optional[Decimal] = None

@router.post("/join")
async def join_crash_game(
    bet_data: CrashBetInput,
    current_user: User = Depends(require_tenant),
    db: Session = Depends(get_db)
):
    """Join the current crash game before it starts"""
    global current_game_id
    
    # Validate auto_cashout
    if bet_data.auto_cashout and bet_data.auto_cashout < Decimal("1.01"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Auto cashout must be at least 1.01x"
        )
    
    # Get or create crash game entry
    game = db.query(Game).filter(Game.game_name == "Crash").first()
    if not game:
        game = Game(game_name="Crash", rtp_percent=Decimal("99.0"))
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
    
    # Create or get current game
    if not current_game_id or current_game_id not in active_crash_games:
        game_id = f"crash_{secrets.token_hex(8)}"
        server_seed = secrets.token_hex(32)
        current_game_id = game_id
        crash_game = CrashGame(game_id, server_seed)
        active_crash_games[game_id] = crash_game
    else:
        crash_game = active_crash_games[current_game_id]
    
    # Check if game already started
    if crash_game.game_started:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Game already started, wait for next round"
        )
    
    # Debit bet amount
    try:
        wallet_service.debit_wallet(db, wallet.wallet_id, bet_data.bet_amount)
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
    
    # Create bet record
    bet_record = Bet(
        round_id=round_obj.round_id,
        wallet_id=wallet.wallet_id,
        bet_amount=bet_data.bet_amount,
        payout_amount=Decimal("0"),
        bet_status=BetStatus.placed
    )
    db.add(bet_record)
    db.commit()
    db.refresh(bet_record)
    
    # Add player to crash game
    success = crash_game.add_player_bet(
        user_id=current_user.user_id,
        bet_amount=bet_data.bet_amount,
        auto_cashout=bet_data.auto_cashout
    )
    
    if not success:
        # Refund
        wallet_service.credit_wallet(db, wallet.wallet_id, bet_data.bet_amount)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to join game"
        )
    
    return {
        "game_id": crash_game.game_id,
        "session_id": session.session_id,
        "bet_id": bet_record.bet_id,
        "bet_amount": bet_data.bet_amount,
        "auto_cashout": bet_data.auto_cashout,
        "server_seed_hash": crash_game.server_seed_hash,
        "message": "Waiting for game to start..."
    }

@router.post("/{game_id}/cashout")
async def cashout_crash(
    game_id: str,
    current_user: User = Depends(require_tenant),
    db: Session = Depends(get_db)
):
    """Cash out from current crash game"""
    
    if game_id not in active_crash_games:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Game not found"
        )
    
    crash_game = active_crash_games[game_id]
    
    if not crash_game.game_started:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Game not started yet"
        )
    
    if crash_game.game_crashed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Game already crashed"
        )
    
    # Cash out player
    result = crash_game.cash_out_player(current_user.user_id)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot cash out (already cashed out or not in game)"
        )
    
    # Get user's session and bet
    session = db.query(GameSession).filter(
        GameSession.user_id == current_user.user_id,
        GameSession.ended_at == None
    ).order_by(GameSession.session_id.desc()).first()
    
    if session:
        round_obj = db.query(GameRound).filter(
            GameRound.session_id == session.session_id
        ).first()
        
        bet = db.query(Bet).filter(Bet.round_id == round_obj.round_id).first()
        
        # Update bet
        bet.payout_amount = result["payout"]
        bet.bet_status = BetStatus.won
        db.commit()
        
        # Credit payout
        wallet_service.credit_wallet(db, bet.wallet_id, result["payout"])
        
        # Close session
        from datetime import datetime
        session.ended_at = datetime.utcnow()
        db.commit()
    
    return {
        "game_id": game_id,
        "cashout_multiplier": result["cashout_multiplier"],
        "payout": result["payout"],
        "message": "Cashed out successfully"
    }

@router.get("/{game_id}/state")
async def get_crash_state(game_id: str):
    """Get current crash game state"""
    
    if game_id not in active_crash_games:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Game not found"
        )
    
    crash_game = active_crash_games[game_id]
    return crash_game.get_current_state()

@router.get("/current")
async def get_current_game():
    """Get current game ID"""
    global current_game_id
    
    if not current_game_id:
        return {"game_id": None, "message": "No active game"}
    
    if current_game_id in active_crash_games:
        crash_game = active_crash_games[current_game_id]
        return {
            "game_id": current_game_id,
            "state": crash_game.get_current_state()
        }
    
    return {"game_id": None, "message": "No active game"}