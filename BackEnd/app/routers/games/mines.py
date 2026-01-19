from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from decimal import Decimal
from typing import Dict
from pydantic import BaseModel
from ...database import get_db
from ...models.user import User
from ...models.game import Game, GameSession, GameRound, Bet, BetStatus
from ...models.wallet import WalletType
from ...utils.dependencies import get_current_active_user, require_tenant
from ...services.wallet_service import wallet_service
from ...services.game_engines.mines_engine import MinesEngine

router = APIRouter(prefix="/games/mines", tags=["Mines"])

# Store active games in memory
active_mines_games: Dict[int, MinesEngine] = {}

class MinesStartInput(BaseModel):
    bet_amount: Decimal
    num_mines: int = 5

class MinesRevealInput(BaseModel):
    position: int

@router.post("/start")
async def start_mines_game(
    game_data: MinesStartInput,
    current_user: User = Depends(require_tenant),
    db: Session = Depends(get_db)
):
    """Start a new mines game"""
    
    # Validate num_mines
    if game_data.num_mines < 1 or game_data.num_mines > 24:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Number of mines must be between 1 and 24"
        )
    
    # Get or create mines game entry
    game = db.query(Game).filter(Game.game_name == "Mines").first()
    if not game:
        game = Game(game_name="Mines", rtp_percent=Decimal("98.0"))
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
        wallet_service.debit_wallet(db, wallet.wallet_id, game_data.bet_amount)
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
    
    # Create bet record (payout updated on cashout)
    bet_record = Bet(
        round_id=round_obj.round_id,
        wallet_id=wallet.wallet_id,
        bet_amount=game_data.bet_amount,
        payout_amount=Decimal("0"),
        bet_status=BetStatus.placed
    )
    db.add(bet_record)
    db.commit()
    db.refresh(bet_record)
    
    # Initialize mines engine
    engine = MinesEngine(grid_size=25, num_mines=game_data.num_mines)
    game_state = engine.start_game()
    
    # Store in memory
    active_mines_games[session.session_id] = engine
    
    return {
        "session_id": session.session_id,
        "bet_id": bet_record.bet_id,
        "bet_amount": game_data.bet_amount,
        "game_state": game_state
    }

@router.post("/{session_id}/reveal")
async def reveal_tile(
    session_id: int,
    reveal_data: MinesRevealInput,
    current_user: User = Depends(require_tenant),
    db: Session = Depends(get_db)
):
    """Reveal a tile"""
    
    # Verify session belongs to user
    session = db.query(GameSession).filter(
        GameSession.session_id == session_id,
        GameSession.user_id == current_user.user_id
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Get game engine
    if session_id not in active_mines_games:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Game session expired or not found"
        )
    
    engine = active_mines_games[session_id]
    
    try:
        result = engine.reveal_tile(reveal_data.position)
        
        # If game over (hit mine or won), settle
        if result["game_over"]:
            await _settle_mines_game(session_id, engine, db)
        
        return {
            "session_id": session_id,
            "result": result
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/{session_id}/cashout")
async def cashout_mines(
    session_id: int,
    current_user: User = Depends(require_tenant),
    db: Session = Depends(get_db)
):
    """Cash out current game"""
    
    # Verify session belongs to user
    session = db.query(GameSession).filter(
        GameSession.session_id == session_id,
        GameSession.user_id == current_user.user_id
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Get game engine
    if session_id not in active_mines_games:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Game session expired or not found"
        )
    
    engine = active_mines_games[session_id]
    
    try:
        result = engine.cash_out()
        await _settle_mines_game(session_id, engine, db)
        
        return {
            "session_id": session_id,
            "result": result
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/{session_id}/state")
async def get_game_state(
    session_id: int,
    current_user: User = Depends(require_tenant),
    db: Session = Depends(get_db)
):
    """Get current game state"""
    
    # Verify session belongs to user
    session = db.query(GameSession).filter(
        GameSession.session_id == session_id,
        GameSession.user_id == current_user.user_id
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Get game engine
    if session_id not in active_mines_games:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Game session expired or not found"
        )
    
    engine = active_mines_games[session_id]
    
    return {
        "session_id": session_id,
        "game_state": engine.get_game_state(hide_mines=not engine.game_over)
    }

async def _settle_mines_game(session_id: int, engine: MinesEngine, db: Session):
    """Settle mines game and update wallet"""
    
    # Get bet
    round_obj = db.query(GameRound).filter(
        GameRound.session_id == session_id
    ).first()
    
    bet = db.query(Bet).filter(Bet.round_id == round_obj.round_id).first()
    
    # Calculate payout
    payout = engine.calculate_payout(bet.bet_amount)
    
    # Update bet
    bet.payout_amount = payout
    bet.bet_status = BetStatus.won if engine.game_won else BetStatus.lost
    db.commit()
    
    # Credit payout to wallet
    if payout > 0:
        wallet_service.credit_wallet(db, bet.wallet_id, payout)
    
    # Close session
    from datetime import datetime
    session = db.query(GameSession).filter(
        GameSession.session_id == session_id
    ).first()
    session.ended_at = datetime.utcnow()
    db.commit()
    
    # Remove from active games
    if session_id in active_mines_games:
        del active_mines_games[session_id]