from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from decimal import Decimal
from typing import Dict, List, Optional
from pydantic import BaseModel
from ...database import get_db
from ...models.user import User
from ...models.game import Game, GameSession, GameRound, Bet, BetStatus
from ...models.wallet import WalletType
from ...utils.dependencies import get_current_active_user, require_tenant, require_tenant_admin
from ...services.wallet_service import wallet_service
from ...services.game_engines.fantasy_cricket_engine import (
    FantasyCricketEngine, FantasyPlayer, PlayerRole, MatchStatus
)

router = APIRouter(prefix="/games/fantasy-cricket", tags=["Fantasy Cricket"])

# Store active matches
active_matches: Dict[str, FantasyCricketEngine] = {}

class CreateMatchInput(BaseModel):
    match_id: str
    team1: str
    team2: str
    entry_fee: Decimal
    max_budget: Decimal = Decimal("100")

class AddPlayerInput(BaseModel):
    player_id: int
    name: str
    role: PlayerRole
    team: str
    base_price: Decimal

class CreateTeamInput(BaseModel):
    match_id: str
    player_ids: List[int]
    captain_id: int
    vice_captain_id: int

class UpdatePlayerStatsInput(BaseModel):
    player_id: int
    runs_scored: int = 0
    wickets_taken: int = 0
    catches: int = 0
    run_outs: int = 0
    strike_rate: float = 0.0
    economy_rate: float = 0.0

# ============= ADMIN ENDPOINTS =============

@router.post("/admin/matches", dependencies=[Depends(require_tenant_admin)])
async def create_match(match_data: CreateMatchInput):
    """Admin: Create a new fantasy cricket match"""
    
    if match_data.match_id in active_matches:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Match already exists"
        )
    
    engine = FantasyCricketEngine(
        match_id=match_data.match_id,
        team1=match_data.team1,
        team2=match_data.team2,
        max_budget=match_data.max_budget
    )
    engine.entry_fee = match_data.entry_fee
    
    active_matches[match_data.match_id] = engine
    
    return {
        "match_id": match_data.match_id,
        "team1": match_data.team1,
        "team2": match_data.team2,
        "entry_fee": match_data.entry_fee,
        "max_budget": match_data.max_budget,
        "status": engine.status
    }

@router.post("/admin/matches/{match_id}/players", dependencies=[Depends(require_tenant_admin)])
async def add_player_to_match(match_id: str, player_data: AddPlayerInput):
    """Admin: Add a player to the match"""
    
    if match_id not in active_matches:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Match not found"
        )
    
    engine = active_matches[match_id]
    
    player = FantasyPlayer(
        player_id=player_data.player_id,
        name=player_data.name,
        role=player_data.role,
        team=player_data.team,
        base_price=player_data.base_price
    )
    
    engine.add_available_player(player)
    
    return {
        "message": "Player added successfully",
        "player": {
            "player_id": player.player_id,
            "name": player.name,
            "role": player.role,
            "team": player.team,
            "base_price": player.base_price
        }
    }

@router.post("/admin/matches/{match_id}/start", dependencies=[Depends(require_tenant_admin)])
async def start_match(match_id: str):
    """Admin: Start the match (lock teams)"""
    
    if match_id not in active_matches:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Match not found"
        )
    
    engine = active_matches[match_id]
    engine.start_match()
    
    return {
        "match_id": match_id,
        "status": engine.status,
        "teams_count": len(engine.teams),
        "prize_pool": engine.prize_pool
    }

@router.post("/admin/matches/{match_id}/update-stats", dependencies=[Depends(require_tenant_admin)])
async def update_player_stats(match_id: str, stats: UpdatePlayerStatsInput):
    """Admin: Update player performance stats"""
    
    if match_id not in active_matches:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Match not found"
        )
    
    engine = active_matches[match_id]
    
    # Find player in available players
    player = next(
        (p for p in engine.available_players if p.player_id == stats.player_id),
        None
    )
    
    if not player:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Player not found"
        )
    
    # Update stats
    player.runs_scored = stats.runs_scored
    player.wickets_taken = stats.wickets_taken
    player.catches = stats.catches
    player.run_outs = stats.run_outs
    player.strike_rate = stats.strike_rate
    player.economy_rate = stats.economy_rate
    
    return {
        "message": "Player stats updated",
        "player_id": player.player_id,
        "stats": {
            "runs_scored": player.runs_scored,
            "wickets_taken": player.wickets_taken,
            "catches": player.catches,
            "run_outs": player.run_outs
        }
    }

@router.post("/admin/matches/{match_id}/settle", dependencies=[Depends(require_tenant_admin)])
async def settle_match(
    match_id: str,
    db: Session = Depends(get_db)
):
    """Admin: Settle the match and distribute prizes"""
    
    if match_id not in active_matches:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Match not found"
        )
    
    engine = active_matches[match_id]
    
    if engine.status != MatchStatus.LIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Match must be live to settle"
        )
    
    # Settle match
    engine.settle_match()
    
    # Update database and distribute prizes
    for team in engine.teams.values():
        # Find user's session
        session = db.query(GameSession).filter(
            GameSession.user_id == team.user_id,
            GameSession.ended_at == None
        ).order_by(GameSession.session_id.desc()).first()
        
        if session:
            round_obj = db.query(GameRound).filter(
                GameRound.session_id == session.session_id
            ).first()
            
            bet = db.query(Bet).filter(Bet.round_id == round_obj.round_id).first()
            
            # Update bet
            bet.payout_amount = team.prize_amount
            bet.bet_status = BetStatus.won if team.prize_amount > 0 else BetStatus.won
            db.commit()
            
            # Credit prize to wallet
            if team.prize_amount > 0:
                wallet_service.credit_wallet(db, bet.wallet_id, team.prize_amount)
            
            # Close session
            from datetime import datetime
            session.ended_at = datetime.utcnow()
            db.commit()
    
    return {
        "match_id": match_id,
        "status": engine.status,
        "leaderboard": engine.get_leaderboard()
    }

# ============= PLAYER ENDPOINTS =============

@router.get("/matches")
async def get_available_matches():
    """Get all available matches"""
    
    matches = []
    for match_id, engine in active_matches.items():
        matches.append({
            "match_id": match_id,
            "team1": engine.team1,
            "team2": engine.team2,
            "status": engine.status,
            "entry_fee": engine.entry_fee,
            "max_budget": engine.max_budget,
            "teams_count": len(engine.teams),
            "prize_pool": engine.prize_pool
        })
    
    return {"matches": matches}

@router.get("/matches/{match_id}/players")
async def get_match_players(match_id: str):
    """Get available players for a match"""
    
    if match_id not in active_matches:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Match not found"
        )
    
    engine = active_matches[match_id]
    
    players = [
        {
            "player_id": p.player_id,
            "name": p.name,
            "role": p.role,
            "team": p.team,
            "base_price": p.base_price
        }
        for p in engine.available_players
    ]
    
    return {"players": players}

@router.post("/matches/{match_id}/teams")
async def create_fantasy_team(
    match_id: str,
    team_data: CreateTeamInput,
    current_user: User = Depends(require_tenant),
    db: Session = Depends(get_db)
):
    """Create a fantasy team for a match"""
    
    if match_id not in active_matches:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Match not found"
        )
    
    engine = active_matches[match_id]
    
    if engine.status != MatchStatus.UPCOMING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot create team after match starts"
        )
    
    # Get or create fantasy cricket game entry
    game = db.query(Game).filter(Game.game_name == "Fantasy Cricket").first()
    if not game:
        game = Game(game_name="Fantasy Cricket", rtp_percent=Decimal("95.0"))
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
    
    # Debit entry fee
    try:
        wallet_service.debit_wallet(db, wallet.wallet_id, engine.entry_fee)
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
        bet_amount=engine.entry_fee,
        payout_amount=Decimal("0"),
        bet_status=BetStatus.placed
    )
    db.add(bet_record)
    db.commit()
    
    # Create fantasy team
    team = engine.create_team(current_user.user_id)
    
    # Add players to team
    for player_id in team_data.player_ids:
        player = next(
            (p for p in engine.available_players if p.player_id == player_id),
            None
        )
        if player:
            team.add_player(player)
    
    # Set captain and vice captain
    team.set_captain(team_data.captain_id)
    team.set_vice_captain(team_data.vice_captain_id)
    
    # Validate team
    if not engine.validate_team(team):
        # Refund
        wallet_service.credit_wallet(db, wallet.wallet_id, engine.entry_fee)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid team composition"
        )
    
    return {
        "team_id": team.team_id,
        "match_id": match_id,
        "session_id": session.session_id,
        "entry_fee": engine.entry_fee,
        "players_count": len(team.players),
        "captain_id": team.captain_id,
        "vice_captain_id": team.vice_captain_id,
        "total_cost": team.calculate_total_cost()
    }

@router.get("/matches/{match_id}/leaderboard")
async def get_match_leaderboard(match_id: str):
    """Get match leaderboard"""
    
    if match_id not in active_matches:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Match not found"
        )
    
    engine = active_matches[match_id]
    
    return {
        "match_id": match_id,
        "status": engine.status,
        "leaderboard": engine.get_leaderboard()
    }