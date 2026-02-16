from sqlalchemy import Column, Integer, String, ForeignKey, Enum, Numeric, TIMESTAMP, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base
import enum

class TeamStatus(str, enum.Enum):
    """Fantasy team status"""
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    LOCKED = "LOCKED"

class FantasyTeam(Base):
    """User's fantasy team for a match"""
    __tablename__ = "fantasy_teams"
    
    team_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False, index=True)
    match_id = Column(Integer, ForeignKey("matches.match_id"), nullable=False, index=True)
    
    team_name = Column(String(100), nullable=False)
    status = Column(Enum(TeamStatus,name="team_status", create_type=False, native_enum=True), default=TeamStatus.DRAFT, nullable=False)
    
    # Captain and Vice Captain
    captain_id = Column(Integer, ForeignKey("players.player_id"), nullable=False)
    vice_captain_id = Column(Integer, ForeignKey("players.player_id"), nullable=False)
    
    # Total credits used
    total_credits = Column(Numeric(5, 1), nullable=False)
    
    # Calculated total points
    total_points = Column(Numeric(10, 2), default=0)
    
    # Rank in leaderboard
    rank = Column(Integer)
    
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="fantasy_teams")
    match = relationship("Match", back_populates="fantasy_teams")
    team_players = relationship("TeamPlayer", back_populates="team", cascade="all, delete-orphan")


class TeamPlayer(Base):
    """Junction table for fantasy team and players"""
    __tablename__ = "team_players"
    
    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("fantasy_teams.team_id"), nullable=False, index=True)
    player_id = Column(Integer, ForeignKey("players.player_id"), nullable=False, index=True)
    
    is_captain = Column(Boolean, default=False)
    is_vice_captain = Column(Boolean, default=False)
    
    # Calculated points for this player in this team (with multipliers)
    points = Column(Numeric(8, 2), default=0)
    
    # Relationships
    team = relationship("FantasyTeam", back_populates="team_players")
    player = relationship("Player", back_populates="team_selections")