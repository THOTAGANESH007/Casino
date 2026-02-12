from sqlalchemy import Column, Integer, String, Boolean, TIMESTAMP, Numeric, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..database import Base

class Jackpot(Base):
    __tablename__ = "jackpots"
    
    jackpot_id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.tenant_id"))
    name = Column(String) # e.g., "High Roller Pot"
    
    current_amount = Column(Numeric(18, 2), default=1000.00)
    start_amount = Column(Numeric(18, 2), default=1000.00) # Reset value
    
    contribution_percent = Column(Numeric(5, 4), default=0.01) # 1% = 0.01
    win_probability = Column(Numeric(10, 9)) # e.g., 0.00001
    
    is_active = Column(Boolean, default=True)
    updated_at = Column(TIMESTAMP(timezone=True), onupdate=func.now())

class JackpotWin(Base):
    __tablename__ = "jackpot_wins"
    
    jackpot_win_id = Column(Integer, primary_key=True, index=True)
    jackpot_id = Column(Integer, ForeignKey("jackpots.jackpot_id"))
    user_id = Column(Integer, ForeignKey("users.user_id"))
    amount_won = Column(Numeric(18, 2))
    won_at = Column(TIMESTAMP(timezone=True), server_default=func.now())