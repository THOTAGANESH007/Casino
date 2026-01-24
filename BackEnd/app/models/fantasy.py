from sqlalchemy import Column, Integer, String, Boolean, TIMESTAMP, Numeric, ForeignKey, Enum, JSON, Table
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from ..database import Base

class MatchStatus(str, enum.Enum):
    upcoming="upcoming"
    live="live"
    completed="completed"
    cancelled="cancelled"

class PlayerRole(str, enum.Enum):
    batsman="batsman"
    bowler="bowler"
    all_rounder="all_rounder"
    wicket_keeper="wicket_keeper"

# Association table for Many-to-Many relationship between UserTeam and RealPlayers
team_players_association = Table(
    'fantasy_team_players_link',
    Base.metadata,
    Column('user_team_id', Integer, ForeignKey('fantasy_user_teams.id')),
    Column('player_id', Integer, ForeignKey('fantasy_players.id'))
)

class FantasyMatch(Base):
    __tablename__ = "fantasy_matches"
    
    id = Column(Integer, primary_key=True, index=True)
    match_code = Column(String, unique=True, index=True)
    
    team1 = Column(String)
    team2 = Column(String)
    status = Column(Enum(MatchStatus, name="match_status", create_type=False, native_enum=True), default=MatchStatus.upcoming)
    
    entry_fee = Column(Numeric(18, 2))
    max_budget = Column(Numeric(18, 2), default=800)
    prize_pool = Column(Numeric(18, 2), default=0)
    
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    start_time = Column(TIMESTAMP(timezone=True), nullable=True)
    end_time = Column(TIMESTAMP(timezone=True), nullable=True)
    
    # Relationships
    roster = relationship("FantasyPlayer", back_populates="match")
    user_teams = relationship("FantasyUserTeam", back_populates="match")

class FantasyPlayer(Base):
    """Real cricketers added to a match"""
    __tablename__ = "fantasy_players"
    
    id = Column(Integer, primary_key=True, index=True)
    match_id = Column(Integer, ForeignKey("fantasy_matches.id"))
    
    name = Column(String)
    role = Column(Enum(PlayerRole, name="player_role", create_type=False, native_enum=True))
    team_name = Column(String)
    credit_value = Column(Numeric(5, 2)) # Cost to buy
    
    # Stores runs, wickets, etc. updated by admin
    # Default: {"runs": 0, "wickets": 0, "catches": 0, "run_outs": 0}
    stats = Column(JSON, default=dict) 
    
    match = relationship("FantasyMatch", back_populates="roster")

class FantasyUserTeam(Base):
    """Team created by a user"""
    __tablename__ = "fantasy_user_teams"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"))
    match_id = Column(Integer, ForeignKey("fantasy_matches.id"))
    
    captain_id = Column(Integer, ForeignKey("fantasy_players.id"))
    vice_captain_id = Column(Integer, ForeignKey("fantasy_players.id"))
    
    total_points = Column(Numeric(10, 2), default=0)
    rank = Column(Integer, nullable=True)
    prize_won = Column(Numeric(18, 2), default=0)
    
    # Relationships
    match = relationship("FantasyMatch", back_populates="user_teams")
    # This automatically fetches the 11 players
    players = relationship("FantasyPlayer", secondary=team_players_association)