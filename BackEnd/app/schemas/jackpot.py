from pydantic import BaseModel
from decimal import Decimal

class JackpotResponse(BaseModel):
    jackpot_id: int
    name: str
    current_amount: Decimal
    
    class Config:
        from_attributes = True