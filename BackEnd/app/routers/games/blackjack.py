from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from decimal import Decimal
from typing import Dict
from ...database import get_db
from ...models.user import User
from ...models.game import Game, GameSession, GameRound, Bet, BetStatus
from ...models.wallet import WalletType
from ...utils.dependencies import get_current_active_user, require_tenant
from ...services.wallet_service import wallet_service
from ...services.game_engines.blackjack_engine import BlackjackEngine

router = APIRouter(prefix="/games/blackjack", tags=["Blackjack"])

# Store active game sessions in memory (in production, use Redis)
active_games: Dict[int, BlackjackEngine] = {}

@router.post("/start")
async def start_blackjack_game(
    bet_amount: Decimal,
    current_user: User = Depends(require_tenant),
    db: Session = Depends(get_db)
):
    """Start a new blackjack game"""
    # 1. Check for active session
    active_session = db.query(GameSession).filter(
        GameSession.user_id == current_user.user_id,
        GameSession.ended_at.is_(None)
    ).first()

    if active_session:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": "You have an unfinished game.",
                "session_id": active_session.session_id
            }
        )
    
    # Get or create blackjack game entry
    game = db.query(Game).filter(Game.game_name == "Blackjack").first()
    if not game:
        game = Game(game_name="Blackjack", rtp_percent=Decimal("99.5"))
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
    wallet_service.debit_wallet(db, wallet.wallet_id, bet_amount)
    
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
    bet = Bet(
        round_id=round_obj.round_id,
        wallet_id=wallet.wallet_id,
        bet_amount=bet_amount,
        payout_amount=Decimal("0"),
        bet_status=BetStatus.placed
    )
    db.add(bet)
    db.commit()
    db.refresh(bet)
    
    # Initialize game engine
    engine = BlackjackEngine()
    game_state = engine.start_game()
    
    # Store in memory
    active_games[session.session_id] = engine
    
    return {
        "session_id": session.session_id,
        "bet_id": bet.bet_id,
        "bet_amount": bet_amount,
        "game_state": game_state
    }

@router.post("/{session_id}/hit")
async def hit(
    session_id: int,
    current_user: User = Depends(require_tenant),
    db: Session = Depends(get_db)
):
    """Hit - draw another card"""
    
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
    if session_id not in active_games:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Game session expired"
        )
    
    engine = active_games[session_id]
    
    try:
        game_state = engine.hit()
        
        # If game over, settle
        if game_state["game_over"]:
            await _settle_blackjack_game(session_id, engine, db)
        
        return {"game_state": game_state}
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/{session_id}/stand")
async def stand(
    session_id: int,
    current_user: User = Depends(require_tenant),
    db: Session = Depends(get_db)
):
    """Stand - end turn and let dealer play"""
    
    session = db.query(GameSession).filter(
        GameSession.session_id == session_id,
        GameSession.user_id == current_user.user_id
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    if session_id not in active_games:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Game session expired"
        )
    
    engine = active_games[session_id]
    
    try:
        game_state = engine.stand()
        await _settle_blackjack_game(session_id, engine, db)
        
        return {"game_state": game_state}
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/{session_id}/double")
async def double_down(
    session_id: int,
    current_user: User = Depends(require_tenant),
    db: Session = Depends(get_db)
):
    """Double down - double bet and hit once"""
    
    session = db.query(GameSession).filter(
        GameSession.session_id == session_id,
        GameSession.user_id == current_user.user_id
    ).first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    if session_id not in active_games:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Game session expired"
        )
    
    engine = active_games[session_id]
    
    # Get original bet
    round_obj = db.query(GameRound).filter(
        GameRound.session_id == session_id
    ).first()
    
    bet = db.query(Bet).filter(Bet.round_id == round_obj.round_id).first()
    original_amount = bet.bet_amount
    
    # Get wallet and debit additional amount
    wallet = wallet_service.get_wallet(db, current_user.user_id, WalletType.cash)
    wallet_service.debit_wallet(db, wallet.wallet_id, original_amount)
    
    # Update bet amount
    bet.bet_amount = original_amount * 2
    db.commit()
    
    try:
        game_state = engine.double_down()
        await _settle_blackjack_game(session_id, engine, db)
        
        return {"game_state": game_state}
    
    except Exception as e:
        # Refund the additional bet
        wallet_service.credit_wallet(db, wallet.wallet_id, original_amount)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

async def _settle_blackjack_game(session_id: int, engine: BlackjackEngine, db: Session):
    """Settle blackjack game and update wallet"""
    
    # Get bet
    round_obj = db.query(GameRound).filter(
        GameRound.session_id == session_id
    ).first()
    
    bet = db.query(Bet).filter(Bet.round_id == round_obj.round_id).first()
    
    # Calculate payout
    payout = engine.calculate_payout(bet.bet_amount)
    
    # Update bet
    bet.payout_amount = payout
    
    if engine.result in ["win", "blackjack"]:
        bet.bet_status = BetStatus.won
    elif engine.result == "push":
        bet.bet_status = BetStatus.placed  # Push - return bet
    else:
        bet.bet_status = BetStatus.lost
    
    db.commit()
    
    # Credit payout to wallet
    if payout > 0:
        wallet_service.credit_wallet(db, bet.wallet_id, payout, commit=True)
    
    # Close session
    from datetime import datetime
    session = db.query(GameSession).filter(
        GameSession.session_id == session_id
    ).first()
    session.ended_at = datetime.utcnow()
    db.commit()
    
    # Remove from active games
    if session_id in active_games:
        del active_games[session_id]