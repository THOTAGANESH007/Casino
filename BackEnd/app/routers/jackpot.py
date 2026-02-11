from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models.user import User
from ..schemas.jackpot import JackpotResponse
from ..services.jackpot_service import jackpot_service
from ..utils.dependencies import require_tenant

router = APIRouter(prefix="/jackpot", tags=["Jackpot"])

@router.get("/current", response_model=List[JackpotResponse])
async def get_current_jackpots(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_tenant)
):
    """Get live jackpot amounts for the user's tenant"""
    return jackpot_service.get_jackpots(db, current_user.tenant_id)