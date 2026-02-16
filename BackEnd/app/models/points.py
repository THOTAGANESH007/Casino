from sqlalchemy import Column, Integer, ForeignKey, Numeric, TIMESTAMP
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base


class ScoringRule(Base):
    """Scoring rules for a match - admin configurable"""
    __tablename__ = "scoring_rules"
    
    rule_id = Column(Integer, primary_key=True, index=True)
    match_id = Column(Integer, ForeignKey("matches.match_id"), unique=True, nullable=False)
    
    # Batting points
    run_points = Column(Numeric(5, 2), default=1.0)  # Points per run
    four_points = Column(Numeric(5, 2), default=1.0)  # Bonus for boundary
    six_points = Column(Numeric(5, 2), default=2.0)  # Bonus for six
    thirty_run_bonus = Column(Numeric(5, 2), default=4.0)
    half_century_bonus = Column(Numeric(5, 2), default=8.0)
    century_bonus = Column(Numeric(5, 2), default=16.0)
    duck_penalty = Column(Numeric(5, 2), default=-2.0)  # Out for 0
    
    # Bowling points
    wicket_points = Column(Numeric(5, 2), default=25.0)
    maiden_over_points = Column(Numeric(5, 2), default=12.0)
    three_wicket_bonus = Column(Numeric(5, 2), default=4.0)
    four_wicket_bonus = Column(Numeric(5, 2), default=8.0)
    five_wicket_bonus = Column(Numeric(5, 2), default=16.0)
    
    # Fielding points
    catch_points = Column(Numeric(5, 2), default=8.0)
    stumping_points = Column(Numeric(5, 2), default=12.0)
    run_out_direct_points = Column(Numeric(5, 2), default=12.0)
    run_out_indirect_points = Column(Numeric(5, 2), default=6.0)
    
    # Economy/Strike rate bonuses (for T20)
    economy_below_5_bonus = Column(Numeric(5, 2), default=6.0)  # Min 2 overs
    economy_below_6_bonus = Column(Numeric(5, 2), default=4.0)
    economy_above_10_penalty = Column(Numeric(5, 2), default=-4.0)
    
    strike_rate_above_150_bonus = Column(Numeric(5, 2), default=6.0)  # Min 10 balls
    strike_rate_above_130_bonus = Column(Numeric(5, 2), default=4.0)
    strike_rate_below_70_penalty = Column(Numeric(5, 2), default=-4.0)
    
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), onupdate=func.now())
    
    # Relationships
    match = relationship("Match", back_populates="scoring_rules")