from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from ..models.user import UserType, DocType

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
