from sqlalchemy import Column, Integer, String, Boolean, TIMESTAMP, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from ..database import Base

class UserType(str, enum.Enum):
    admin = "admin"
    player = "player"
    affiliate = "affiliate"
    casino_owner = "casino_owner"

class DocType(str, enum.Enum):
    aadhar = "aadhar"
    pan = "pan"


class User(Base):
    __tablename__ = "users"
    
    user_id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String)
    email = Column(String, nullable=False, index=True)
    phone = Column(String)
    password = Column(String, nullable=False)
    role = Column(Enum(UserType), default=UserType.player)
    tenant_id = Column(Integer, ForeignKey("tenants.tenant_id"), index=True)
    is_active = Column(Boolean, default=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    
    # Relationships
    tenant = relationship("Tenant", back_populates="users")
    kyc = relationship("UserKYC", back_populates="user", uselist=False)
    wallets = relationship("Wallet", back_populates="user")
    game_sessions = relationship("GameSession", back_populates="user")


class UserKYC(Base):
    __tablename__ = "user_kyc"
    
    kyc_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), unique=True)
    document_type = Column(Enum(DocType))
    document_number = Column(String)
    verified_status = Column(Boolean, default=False)
    verified_at = Column(TIMESTAMP(timezone=True))
    
    # Relationships
    user = relationship("User", back_populates="kyc")
