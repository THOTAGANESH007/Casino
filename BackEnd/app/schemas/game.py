from pydantic import BaseModel
from decimal import Decimal
from typing import Optional, Any, Dict
from datetime import datetime
from ..models.game import BetStatus

class GameSessionCreate(BaseModel):
    game_id: int

class GameSessionResponse(BaseModel):
    session_id: int
    user_id: int
    game_id: int
    started_at: datetime
    ended_at: Optional[datetime]
    
    class Config:
        from_attributes = True

class BetPlace(BaseModel):
    bet_amount: Decimal
    bet_data: Optional[Dict[str, Any]] = None

class BetResponse(BaseModel):
    bet_id: int
    round_id: int
    wallet_id: int
    bet_amount: Decimal
    payout_amount: Decimal
    bet_status: BetStatus
    
    class Config:
        from_attributes = True

class GameProviderCreate(BaseModel):
    provider_name: str
    api_url: Optional[str] = None

class GameProviderResponse(BaseModel):
    provider_id: int
    provider_name: str
    api_url: Optional[str]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True