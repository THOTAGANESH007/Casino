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

# For Owner to create catalog items
class ProviderGameCreate(BaseModel):
    provider_id: int
    game_id: int
    cost_per_play: float

# For Tenant Admin to see Marketplace
class MarketplaceItemResponse(BaseModel):
    id: int # provider_game_id
    game_name: str
    provider_name: str
    cost_per_play: float
    is_enabled: bool # If the tenant already has it
    
    class Config:
        from_attributes = True

# For Tenant Admin to buy/enable
class TenantGameToggle(BaseModel):
    provider_game_id: int
    is_active: bool

# For Player to see available games
class PlayerGameResponse(BaseModel):
    game_id: int
    game_name: str
    provider_name: str
    rtp_percent: float