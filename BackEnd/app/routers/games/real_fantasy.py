from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ...database import get_db
from ...models.match import Match, MatchStatuses
from ...models.player import Player
from pydantic import BaseModel
from datetime import datetime

router = APIRouter(prefix="/games/real-fantasy", tags=["Real Fantasy"])

class RealMatchResponse(BaseModel):
    match_id: int
    match_name: str
    team_a: str
    team_b: str
    match_date: datetime
    status: str
    entry_fee: float
    prize_pool: float
    is_active: bool
    teams_locked: bool

    class Config:
        from_attributes = True

class RealPlayerResponse(BaseModel):
    player_id: int
    name: str
    role: str
    team: str
    credits: float
    
    class Config:
        from_attributes = True

@router.get("/matches", response_model=List[RealMatchResponse])
def get_real_matches(db: Session = Depends(get_db)):
    """Fetch matches synced from RapidAPI/Cricbuzz"""
    return db.query(Match).filter(
        Match.status != MatchStatuses.CANCELLED
    ).order_by(Match.match_date.asc()).all()

@router.get("/matches/{match_id}/players", response_model=List[RealPlayerResponse])
def get_match_players(match_id: int, db: Session = Depends(get_db)):
    """Fetch players for a specific real match"""
    match = db.query(Match).filter(Match.match_id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
        
    players = db.query(Player).filter(Player.match_id == match_id).all()
    return players