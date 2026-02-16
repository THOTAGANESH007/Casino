from sqlalchemy import Column, Integer, String, ForeignKey, Enum, Numeric, TIMESTAMP, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base
import enum

class PlayerRoles(str, enum.Enum):
    """Cricket player roles"""
    BATSMAN = "BATSMAN"
    BOWLER = "BOWLER"
    ALL_ROUNDER = "ALL_ROUNDER"
    WICKET_KEEPER = "WICKET_KEEPER"


class Player(Base):
    """Player model - specific to each match"""
    __tablename__ = "players"
    
    player_id = Column(Integer, primary_key=True, index=True)
    match_id = Column(Integer, ForeignKey("matches.match_id"), nullable=False, index=True)
    external_player_id = Column(String(100), nullable=False)  # From API
    
    # Player info
    name = Column(String(100), nullable=False)
    role = Column(Enum(PlayerRoles,name="player_roles", create_type=False, native_enum=True), nullable=False)
    team = Column(String(100), nullable=False)  # team_a or team_b
    
    # Fantasy credits
    credits = Column(Numeric(4, 1), nullable=False)  # e.g., 9.5
    
    # Player image/metadata
    image_url = Column(String(255))
    meta_data = Column(JSON)  # Additional data from API
    
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    
    # Relationships
    match = relationship("Match", back_populates="players")
    performances = relationship("PlayerPerformance", back_populates="player")
    team_selections = relationship("TeamPlayer", back_populates="player")


class PlayerPerformance(Base):
    """Player performance stats in a match"""
    __tablename__ = "player_performances"
    
    performance_id = Column(Integer, primary_key=True, index=True)
    match_id = Column(Integer, ForeignKey("matches.match_id"), nullable=False, index=True)
    player_id = Column(Integer, ForeignKey("players.player_id"), nullable=False, index=True)
    
    # Batting stats
    runs = Column(Integer, default=0)
    balls_faced = Column(Integer, default=0)
    fours = Column(Integer, default=0)
    sixes = Column(Integer, default=0)
    strike_rate = Column(Numeric(6, 2), default=0)
    
    # Bowling stats
    wickets = Column(Integer, default=0)
    overs = Column(Numeric(4, 1), default=0)
    runs_conceded = Column(Integer, default=0)
    maidens = Column(Integer, default=0)
    economy = Column(Numeric(5, 2), default=0)
    
    # Fielding stats
    catches = Column(Integer, default=0)
    stumpings = Column(Integer, default=0)
    run_outs = Column(Integer, default=0)
    
    # Calculated fantasy points
    fantasy_points = Column(Numeric(8, 2), default=0)
    
    # Last updated timestamp
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    match = relationship("Match", back_populates="player_performances")
    player = relationship("Player", back_populates="performances")