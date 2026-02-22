from sqlalchemy import Column, Integer, Numeric, ForeignKey, Enum, UniqueConstraint
from sqlalchemy.orm import relationship
import enum
from ..database import Base

class WalletType(str, enum.Enum):
    cash = "cash"
    bonus = "bonus"
    points = "points"


class Wallet(Base):
    __tablename__ = "wallet"
    
    wallet_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.tenant_id"), index=True)
    balance = Column(Numeric(18, 2), default=0.0)
    type_of_wallet = Column(Enum(WalletType, name="wallet_type", create_type=False, native_enum=True), default=WalletType.cash)
    UniqueConstraint('user_id', 'tenant_id', 'type_of_wallet', name='unique_user_tenant_wallet'),
    
    # Relationships
    user = relationship("User", back_populates="wallets")
    bets = relationship("Bet", back_populates="wallet")
