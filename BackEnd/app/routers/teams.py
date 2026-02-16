from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from ..models.game import Game
from ..models.user import User
from ..services import wallet_service
from ..utils.dependencies import require_tenant_admin
from ..database import get_db
from ..models.team import FantasyTeam, TeamPlayer, TeamStatus
from ..models.player import Player
from ..models.match import Match
from pydantic import BaseModel

router = APIRouter(prefix="/teams", tags=["Fantasy Teams"])

class CreateTeamRequest(BaseModel):
    match_id: int
    team_name: str
    player_ids: List[int]  # Must be exactly 11
    captain_id: int
    vice_captain_id: int


class TeamResponse(BaseModel):
    team_id: int
    team_name: str
    total_credits: float
    status: str


@router.post("/create", response_model=TeamResponse)
def create_fantasy_team(
    request: CreateTeamRequest,
    current_user: User = Depends(require_tenant_admin), # Ensure user is valid
    db: Session = Depends(get_db)
):
    """Create a fantasy team for Real Cricket with Payment"""
    
    # 1. Fetch Match
    match = db.query(Match).filter(Match.match_id == request.match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    
    if not match.is_active:
        raise HTTPException(status_code=400, detail="Match not active for fantasy")
    
    if match.teams_locked:
        raise HTTPException(status_code=400, detail="Team creation locked")

    # 2. PROCESS PAYMENT (Fix: Charging the user)
    # Ensure Game type exists for history
    game_type = db.query(Game).filter(Game.game_name == "Real Fantasy Cricket").first()
    if not game_type:
        game_type = Game(game_name="Real Fantasy Cricket", rtp_percent=Decimal("93.0"))
        db.add(game_type)
        db.commit()

    try:
        # Deduct entry fee
        wallet_service.process_game_bet(db, current_user.user_id, match.entry_fee)
        # Update prize pool
        match.prize_pool = (match.prize_pool or 0) + match.entry_fee
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    # 3. Validate Players
    if len(request.player_ids) != 11:
        raise HTTPException(status_code=400, detail="Team must have exactly 11 players")
    
    if request.captain_id == request.vice_captain_id:
        raise HTTPException(status_code=400, detail="Captain and VC must be different")

    players = db.query(Player).filter(
        Player.player_id.in_(request.player_ids),
        Player.match_id == request.match_id
    ).all()
    
    if len(players) != 11:
        raise HTTPException(status_code=400, detail="Invalid player selection")

    total_credits = sum(p.credits for p in players)
    if total_credits > match.max_budget:
        raise HTTPException(status_code=400, detail=f"Budget exceeded: {total_credits}")

    # 4. Save Team
    team = FantasyTeam(
        user_id=current_user.user_id,
        match_id=request.match_id,
        team_name=request.team_name,
        captain_id=request.captain_id,
        vice_captain_id=request.vice_captain_id,
        total_credits=total_credits,
        status=TeamStatus.SUBMITTED
    )
    
    db.add(team)
    db.flush()
    
    for player_id in request.player_ids:
        team_player = TeamPlayer(
            team_id=team.team_id,
            player_id=player_id,
            is_captain=(player_id == request.captain_id),
            is_vice_captain=(player_id == request.vice_captain_id)
        )
        db.add(team_player)
    
    db.commit()
    db.refresh(team)
    
    return TeamResponse(
        team_id=team.team_id,
        team_name=team.team_name,
        total_credits=float(team.total_credits),
        status=team.status.value
    )

@router.get("/{team_id}")
def get_team_details(team_id: int, db: Session = Depends(get_db)):
    """Get detailed team information with player stats"""
    team = db.query(FantasyTeam).filter(FantasyTeam.team_id == team_id).first()
    
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    # Get team players with stats
    players_data = []
    
    for team_player in team.team_players:
        player = team_player.player
        
        # Get performance if available
        from app.models.player import PlayerPerformance
        performance = db.query(PlayerPerformance).filter(
            PlayerPerformance.match_id == team.match_id,
            PlayerPerformance.player_id == player.player_id
        ).first()
        
        players_data.append({
            "player_id": player.player_id,
            "name": player.name,
            "role": player.role.value,
            "team": player.team,
            "credits": float(player.credits),
            "is_captain": team_player.is_captain,
            "is_vice_captain": team_player.is_vice_captain,
            "points": float(team_player.points) if team_player.points else 0,
            "performance": {
                "runs": performance.runs if performance else 0,
                "wickets": performance.wickets if performance else 0,
                "fantasy_points": float(performance.fantasy_points) if performance else 0
            } if performance else None
        })
    
    return {
        "team_id": team.team_id,
        "team_name": team.team_name,
        "total_credits": float(team.total_credits),
        "total_points": float(team.total_points),
        "rank": team.rank,
        "status": team.status.value,
        "players": players_data
    }


@router.get("/user/{user_id}/match/{match_id}")
def get_user_teams_for_match(
    user_id: int,
    match_id: int,
    db: Session = Depends(get_db)
):
    """Get all teams created by user for a match"""
    teams = db.query(FantasyTeam).filter(
        FantasyTeam.user_id == user_id,
        FantasyTeam.match_id == match_id
    ).all()
    
    return [
        {
            "team_id": team.team_id,
            "team_name": team.team_name,
            "total_points": float(team.total_points),
            "rank": team.rank,
            "status": team.status.value
        }
        for team in teams
    ]