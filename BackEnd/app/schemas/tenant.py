from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class TenantCreate(BaseModel):
    tenant_name: str
    default_timezone: Optional[str] = None
    default_currency: Optional[str] = None

class TenantResponse(BaseModel):
    tenant_id: int
    tenant_name: str
    default_timezone: Optional[str]
    status: bool
    default_currency: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True

class RegionCreate(BaseModel):
    tenant_id: int
    region_name: str
    tax_rate: Optional[float] = None

class RegionResponse(BaseModel):
    region_id: int
    tenant_id: int
    region_name: str
    tax_rate: Optional[float]
    
    class Config:
        from_attributes = True

class RegionUpdate(BaseModel):
    tax_rate: float = Field(..., ge=0, le=100, description="Tax rate percentage (0-100)")