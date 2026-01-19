from sqlalchemy import Boolean, Column, Integer, String, Numeric, TIMESTAMP, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from ..database import Base

class BetType(str, enum.Enum):
    single_bet = "single_bet"
    multiple_bet = "multiple_bet"
    full_cover_bet = "full_cover_bet"

class BetStatus(str, enum.Enum):
    placed = "placed"
    won = "won"
    lost = "lost"
    cancelled = "cancelled"


class Game(Base):
    __tablename__ = "game"
    
    game_id = Column(Integer, primary_key=True, index=True)
    game_name = Column(String)
    rtp_percent = Column(Numeric(5, 2))
    
    # Relationships
    sessions = relationship("GameSession", back_populates="game")


class GameSession(Base):
    __tablename__ = "game_session"
    
    session_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"))
    game_id = Column(Integer, ForeignKey("game.game_id"))
    started_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    ended_at = Column(TIMESTAMP(timezone=True))
    
    # Relationships
    user = relationship("User", back_populates="game_sessions")
    game = relationship("Game", back_populates="sessions")
    rounds = relationship("GameRound", back_populates="session")


class GameRound(Base):
    __tablename__ = "game_round"
    
    round_id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("game_session.session_id"))
    
    # Relationships
    session = relationship("GameSession", back_populates="rounds")
    bets = relationship("Bet", back_populates="round")


class Bet(Base):
    __tablename__ = "bet"
    
    bet_id = Column(Integer, primary_key=True, index=True)
    round_id = Column(Integer, ForeignKey("game_round.round_id"))
    wallet_id = Column(Integer, ForeignKey("wallet.wallet_id"))
    bet_amount = Column(Numeric(18, 2))
    payout_amount = Column(Numeric(18, 2))
    bet_status = Column(Enum(BetStatus, native_enum=False, length=50), default=BetStatus.placed)
    
    # Relationships
    round = relationship("GameRound", back_populates="bets")
    wallet = relationship("Wallet", back_populates="bets")

class GameProvider(Base):
    __tablename__ = "game_provider"
    
    provider_id = Column(Integer, primary_key=True, index=True)
    provider_name = Column(String, unique=True, nullable=False)
    api_url = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())