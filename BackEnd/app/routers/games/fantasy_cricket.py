from datetime import timezone, datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from decimal import Decimal
from typing import Dict, List, Optional
from pydantic import BaseModel

from ...database import get_db
from ...models.user import User
from ...models.game import Game, GameSession, GameRound, Bet, BetStatus
from ...models.fantasy import FantasyMatch, FantasyPlayer, FantasyUserTeam, MatchStatus, PlayerRole
from ...utils.dependencies import require_tenant, require_tenant_admin
from ...services.wallet_service import wallet_service
from ...services.fantasy_service import fantasy_service

router = APIRouter(prefix="/games/fantasy-cricket", tags=["Fantasy Cricket"])

# --- Pydantic Models ---
class CreateMatchInput(BaseModel):
    match_id: str # This maps to match_code
    team1: str
    team2: str
    entry_fee: Decimal
    max_budget: Decimal = Decimal("700")

class AddPlayerInput(BaseModel):
    name: str
    role: PlayerRole
    team: str
    base_price: Decimal

class CreateTeamInput(BaseModel):
    match_id: str # match_code
    player_ids: List[int]
    captain_id: int
    vice_captain_id: int

class UpdateStatsInput(BaseModel):
    player_id: int
    runs: int = 0
    wickets: int = 0
    catches: int = 0
    run_outs: int = 0

# ================= ADMIN ENDPOINTS =================

@router.post("/admin/matches", dependencies=[Depends(require_tenant_admin)])
async def create_match(match_data: CreateMatchInput, db: Session = Depends(get_db)):
    """Create a new match in DB"""
    exists = db.query(FantasyMatch).filter(FantasyMatch.match_code == match_data.match_id).first()
    if exists:
        raise HTTPException(status_code=400, detail="Match ID exists")
    
    new_match = FantasyMatch(
        match_code=match_data.match_id,
        team1=match_data.team1,
        team2=match_data.team2,
        entry_fee=match_data.entry_fee,
        max_budget=match_data.max_budget,
        status=MatchStatus.upcoming
    )
    db.add(new_match)
    db.commit()
    db.refresh(new_match)
    return new_match

@router.post("/admin/matches/{match_code}/players", dependencies=[Depends(require_tenant_admin)])
async def add_player(match_code: str, p_data: AddPlayerInput, db: Session = Depends(get_db)):
    match = db.query(FantasyMatch).filter(FantasyMatch.match_code == match_code).first()
    if not match: raise HTTPException(status_code=404, detail="Match not found")
    
    player = FantasyPlayer(
        match_id=match.id,
        name=p_data.name,
        role=p_data.role,
        team_name=p_data.team,
        credit_value=p_data.base_price,
        stats={"runs": 0, "wickets": 0, "catches": 0, "run_outs": 0}
    )
    db.add(player)
    db.commit()
    return {"message": "Player added"}

@router.post("/admin/matches/{match_code}/start", dependencies=[Depends(require_tenant_admin)])
async def start_match(match_code: str, db: Session = Depends(get_db)):
    match = db.query(FantasyMatch).filter(FantasyMatch.match_code == match_code).first()
    if not match: raise HTTPException(status_code=404, detail="Match not found")
    
    match.status = MatchStatus.live
    match.start_time = datetime.now(timezone.utc)
    db.commit()
    return {"status": match.status}

@router.post("/admin/matches/{match_code}/update-stats", dependencies=[Depends(require_tenant_admin)])
async def update_stats(match_code: str, stats: UpdateStatsInput, db: Session = Depends(get_db)):
    player = db.query(FantasyPlayer).filter(FantasyPlayer.id == stats.player_id).first()
    if not player: raise HTTPException(status_code=404, detail="Player not found")
    
    # Update JSON
    player.stats = {
        "runs": stats.runs,
        "wickets": stats.wickets,
        "catches": stats.catches,
        "run_outs": stats.run_outs
    }
    # Flag modification for SQLAlchemy to detect JSON change
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(player, "stats")
    
    db.commit()
    return {"message": "Stats updated"}

@router.post("/admin/matches/{match_code}/settle")
async def settle_match(match_code: str, current_user: User = Depends(require_tenant_admin), db: Session = Depends(get_db)):
    # 1. Validation
    match = db.query(FantasyMatch).filter(FantasyMatch.match_code == match_code).first()
    if not match or match.status != MatchStatus.live:
        raise HTTPException(status_code=400, detail="Match not live or found")
    
    # 2. Get the generic Game ID for Fantasy Cricket (needed to find the bets)
    fantasy_game_type = db.query(Game).filter(Game.game_name == "Fantasy Cricket").first()
    if not fantasy_game_type:
        raise HTTPException(status_code=500, detail="Fantasy Cricket game configuration missing")

    # 3. Fetch all real players for this match to optimize lookups
    all_players = {p.id: p for p in match.roster}
    
    # 4. Calculate scores for all user teams
    user_teams = db.query(FantasyUserTeam).filter(FantasyUserTeam.match_id == match.id).all()
    
    for team in user_teams:
        team.total_points = fantasy_service.calculate_team_score(team, all_players)
    
    # 5. Sort by points (Highest first)
    user_teams.sort(key=lambda t: t.total_points, reverse=True)
    
    # 6. Assign Ranks, Distribute Prizes, and Update Bets
    total_pool = match.prize_pool
    
    for rank, team in enumerate(user_teams, 1):
        team.rank = rank
        prize = Decimal(0)
        
        # --- Prize Distribution Logic ---
        if rank == 1: prize = total_pool * Decimal("0.50")
        elif rank == 2: prize = total_pool * Decimal("0.30")
        elif rank == 3: prize = total_pool * Decimal("0.20")
        
        team.prize_won = prize
        
        # We find the oldest 'placed' bet for this user, for this game type, 
        # that matches the entry fee amount. This handles cases where a user 
        # joins multiple matches.
        
        associated_bet = db.query(Bet)\
            .join(GameRound, Bet.round_id == GameRound.round_id)\
            .join(GameSession, GameRound.session_id == GameSession.session_id)\
            .filter(
                GameSession.user_id == team.user_id,
                GameSession.game_id == fantasy_game_type.game_id,
                Bet.bet_status == BetStatus.placed,
                Bet.bet_amount == match.entry_fee
            ).order_by(Bet.bet_id.asc()).first()

        if associated_bet:
            if prize > 0:
                # WINNER FLOW
                associated_bet.bet_status = BetStatus.won
                associated_bet.payout_amount = prize
                
                # Credit the winnings to the user's wallet
                wallet_service.credit_winnings(db, team.user_id, prize, fantasy_game_type.game_id, current_user.tenant_id, associated_bet.bet_id)
            else:
                # LOSER FLOW
                associated_bet.bet_status = BetStatus.lost
                associated_bet.payout_amount = Decimal(0)
            
            # Close the specific game session associated with this bet
            # (Navigating SQLAlchemy relationships: Bet -> Round -> Session)
            if associated_bet.round and associated_bet.round.session:
                associated_bet.round.session.ended_at = datetime.now(timezone.utc)

    # 7. Finalize Match
    match.status = MatchStatus.completed
    match.end_time = datetime.now(timezone.utc)
    
    db.commit()
    
    # 8. Return leaderboard
    leaderboard = []
    for team in user_teams:
        leaderboard.append({
            "rank": team.rank,
            "user_id": team.user_id,
            "points": team.total_points,
            "prize": team.prize_won
        })
        
    return {"leaderboard": leaderboard}

# ================= PLAYER ENDPOINTS =================

@router.get("/matches")
async def get_matches(db: Session = Depends(get_db)):
    matches = db.query(FantasyMatch).filter(FantasyMatch.status != MatchStatus.cancelled).all()
    result = []
    for m in matches:
        result.append({
            "match_id": m.match_code,
            "team1": m.team1,
            "team2": m.team2,
            "status": m.status,
            "entry_fee": m.entry_fee,
            "max_budget": m.max_budget,
            "teams_count": len(m.user_teams),
            "prize_pool": m.prize_pool
        })
    return {"matches": result}

@router.get("/matches/{match_code}/players")
async def get_players(match_code: str, db: Session = Depends(get_db)):
    match = db.query(FantasyMatch).filter(FantasyMatch.match_code == match_code).first()
    if not match: raise HTTPException(status_code=404)
    
    return {"players": [
        {
            "player_id": p.id,
            "name": p.name,
            "role": p.role,
            "team": p.team_name,
            "base_price": p.credit_value
        } for p in match.roster
    ]}

@router.post("/matches/{match_code}/teams")
async def create_team(
    match_code: str, 
    data: CreateTeamInput, 
    current_user: User = Depends(require_tenant), 
    db: Session = Depends(get_db)
):
    match = db.query(FantasyMatch).filter(FantasyMatch.match_code == match_code).first()
    if not match or match.status != MatchStatus.upcoming:
        raise HTTPException(status_code=400, detail="Match not open")
    
    # 1. Payment
    txn = wallet_service.process_game_bet(db, current_user.user_id, current_user.tenant_id, match.entry_fee)
    
    # 2. Get Players from DB
    selected_players = db.query(FantasyPlayer).filter(FantasyPlayer.id.in_(data.player_ids)).all()
    fantasy_game_type = db.query(Game).filter(Game.game_name == "Fantasy Cricket").first()
    
    if len(selected_players) != 11:
        wallet_service.credit_winnings(db, current_user.user_id, match.entry_fee, fantasy_game_type.game_id, current_user.tenant_id) # Refund
        raise HTTPException(status_code=400, detail="Must select 11 players")
        
    total_cost = sum(p.credit_value for p in selected_players)
    if total_cost > match.max_budget:
        wallet_service.credit_winnings(db, current_user.user_id, match.entry_fee, fantasy_game_type.game_id, current_user.tenant_id) # Refund
        raise HTTPException(status_code=400, detail="Budget exceeded")

    # 3. Create Team
    user_team = FantasyUserTeam(
        user_id=current_user.user_id,
        match_id=match.id,
        captain_id=data.captain_id,
        vice_captain_id=data.vice_captain_id
    )
    user_team.players = selected_players # Magic of SQLAlchemy relationships
    
    match.prize_pool += match.entry_fee # Add to pool
    
    db.add(user_team)
    db.commit()
    
    # 4. Create Audit Log (Bet Record)
    # Get generic Game ID for 'Fantasy Cricket'
    game = db.query(Game).filter(Game.game_name == "Fantasy Cricket").first()
    if game:
        # Create Session/Round/Bet for history tracking
        sess = GameSession(user_id=current_user.user_id, game_id=game.game_id)
        db.add(sess)
        db.commit()
        rnd = GameRound(session_id=sess.session_id)
        db.add(rnd)
        db.commit()
        bet = Bet(
            round_id=rnd.round_id,
            wallet_id=txn["primary_wallet_id"],
            bet_amount=match.entry_fee,
            payout_amount=0,
            bet_status=BetStatus.placed
        )
        db.add(bet)
        db.commit()

    return {"message": "Team created successfully", "team_id": user_team.id}

@router.get("/matches/{match_code}/leaderboard")
async def get_leaderboard(match_code: str, db: Session = Depends(get_db)):
    match = db.query(FantasyMatch).filter(FantasyMatch.match_code == match_code).first()
    if not match: raise HTTPException(status_code=404)
    
    teams = db.query(FantasyUserTeam).filter(FantasyUserTeam.match_id == match.id).order_by(FantasyUserTeam.total_points.desc()).all()
    
    leaderboard = []
    for t in teams:
        leaderboard.append({
            "team_id": t.id,
            "user_id": t.user_id,
            "rank": t.rank,
            "total_points": t.total_points,
            "prize_amount": t.prize_won
        })
    return {"status": match.status, "leaderboard": leaderboard}