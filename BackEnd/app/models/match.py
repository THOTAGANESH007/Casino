from sqlalchemy import Column, Integer, String, TIMESTAMP, Enum, Boolean, JSON, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base
import enum

class MatchStatuses(str, enum.Enum):
    UPCOMING = "UPCOMING"
    LIVE = "LIVE"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"

class MatchType(str, enum.Enum):
    TEST = "TEST"
    ODI = "ODI"
    T20 = "T20"
    T10 = "T10"

class Match(Base):
    """Cricket match model (Synced with External API)"""
    __tablename__ = "matches"
    
    match_id = Column(Integer, primary_key=True, index=True)
    external_match_id = Column(String(100), unique=True, nullable=False, index=True)
    match_name = Column(String(200), nullable=False)
    match_type = Column(Enum(MatchType,name="match_type", create_type=False, native_enum=True), nullable=False)
    venue = Column(String(200))
    match_date = Column(TIMESTAMP(timezone=True), nullable=False)
    team_a = Column(String(100), nullable=False)
    team_b = Column(String(100), nullable=False)
    status = Column(Enum(MatchStatuses, name="match_statuses", create_type=False, native_enum=True), default=MatchStatuses.UPCOMING, nullable=False)

    entry_fee = Column(Numeric(10, 2), default=10.00)
    max_budget = Column(Numeric(10, 1), default=100.0)
    prize_pool = Column(Numeric(10, 2), default=0.00)

    is_active = Column(Boolean, default=False)
    teams_locked = Column(Boolean, default=False)
    
    series_name = Column(String(200))
    match_number = Column(String(50))
    
    current_score = Column(JSON)
    match_data = Column(JSON)
    
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), onupdate=func.now())
    
    players = relationship("Player", back_populates="match")
    fantasy_teams = relationship("FantasyTeam", back_populates="match")
    scoring_rules = relationship("ScoringRule", back_populates="match", uselist=False)
    player_performances = relationship("PlayerPerformance", back_populates="match")