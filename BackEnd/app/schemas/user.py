from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from ..models.user import UserType, DocType
from decimal import Decimal
class UserSignup(BaseModel):
    first_name: str
    last_name: Optional[str] = None
    email: EmailStr
    phone: Optional[str] = None
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserRegionSelect(BaseModel):
    region_id: int

class KYCSubmit(BaseModel):
    document_type: DocType
    document_number: str

class UserResponse(BaseModel):
    user_id: int
    first_name: str
    last_name: Optional[str]
    email: str
    phone: Optional[str]
    role: UserType
    tenant_id: Optional[int]
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class TenantAdminCreate(BaseModel):
    first_name: str
    last_name: Optional[str] = None
    email: str
    password: str
    tenant_id: int

class UserProfileStats(BaseModel):
    total_wagered: Decimal
    total_payout: Decimal
    net_profit: Decimal
    total_games_played: int

class GameHistoryItem(BaseModel):
    session_id: int
    game_name: str
    started_at: datetime
    ended_at: Optional[datetime]
    total_bet: Decimal
    total_payout: Decimal
    status: str # "won", "lost", "ongoing"

class ActiveSessionItem(BaseModel):
    session_id: int
    game_name: str
    started_at: datetime
    current_state: Optional[dict] = None

class FullUserProfile(BaseModel):
    user_id: int
    full_name: str
    email: str
    tenant_name: str
    currency: str
    kyc_status: bool
    stats: UserProfileStats

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    email: str
    otp: str
    new_password: str

class LimitSet(BaseModel):
    daily_loss_limit: Optional[Decimal] = Field(None, ge=0)
    daily_bet_limit: Optional[Decimal] = Field(None, ge=0)
    monthly_bet_limit: Optional[Decimal] = Field(None, ge=0)

class LimitResponse(BaseModel):
    daily_loss_limit: Optional[Decimal]
    daily_bet_limit: Optional[Decimal]
    monthly_bet_limit: Optional[Decimal]
    
    # Current usage stats (Useful for UI)
    current_daily_loss: Decimal = Decimal(0)
    current_daily_bet: Decimal = Decimal(0)
    current_monthly_bet: Decimal = Decimal(0)

    class Config:
        from_attributes = True