from pydantic import BaseModel
from decimal import Decimal
from ..models.wallet import WalletType

class WalletResponse(BaseModel):
    wallet_id: int
    user_id: int
    balance: Decimal
    type_of_wallet: WalletType
    
    class Config:
        from_attributes = True

class WalletDeposit(BaseModel):
    amount: Decimal

class WalletWithdraw(BaseModel):
    amount: Decimal
