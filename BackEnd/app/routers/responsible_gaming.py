from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.user import User
from ..models.user import ResponsibleLimit
from ..schemas.user import LimitSet, LimitResponse
from ..utils.dependencies import get_current_active_user, require_tenant_admin
from ..services.limit_service import limit_service

router = APIRouter(prefix="/responsible-gaming", tags=["Responsible Gaming"])

@router.get("/limits", response_model=LimitResponse)
async def get_limits(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    limits = db.query(ResponsibleLimit).filter(ResponsibleLimit.user_id == current_user.user_id).first()
    
    # Get current usage
    stats = limit_service.get_usage_stats(db, current_user.user_id)
    
    if not limits:
        return {
            "daily_loss_limit": None,
            "daily_bet_limit": None,
            "monthly_bet_limit": None,
            **stats
        }
    
    return {
        "daily_loss_limit": limits.daily_loss_limit,
        "daily_bet_limit": limits.daily_bet_limit,
        "monthly_bet_limit": limits.monthly_bet_limit,
        **stats
    }


@router.get("/admin/limits/{user_id}", response_model=LimitResponse)
async def get_user_limits_admin(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_tenant_admin)
):
    """Admin views a specific player's limits"""
    # 1. Security: Ensure user belongs to Admin's tenant
    target_user = db.query(User).filter(User.user_id == user_id).first()
    if not target_user or target_user.tenant_id != admin.tenant_id:
        raise HTTPException(status_code=404, detail="User not found in your tenant")

    limits = db.query(ResponsibleLimit).filter(ResponsibleLimit.user_id == user_id).first()
    stats = limit_service.get_usage_stats(db, user_id)

    if not limits:
        return {
            "daily_loss_limit": None, "daily_bet_limit": None, "monthly_bet_limit": None,
            **stats
        }
    
    return {
        "daily_loss_limit": limits.daily_loss_limit,
        "daily_bet_limit": limits.daily_bet_limit,
        "monthly_bet_limit": limits.monthly_bet_limit,
        **stats
    }

@router.post("/admin/limits/{user_id}", response_model=LimitResponse)
async def set_user_limits_admin(
    user_id: int,
    limit_data: LimitSet,
    db: Session = Depends(get_db),
    admin: User = Depends(require_tenant_admin)
):
    """Admin sets limits for a specific player"""
    
    # 1. Security: Ensure user belongs to Admin's tenant
    target_user = db.query(User).filter(User.user_id == user_id).first()
    if not target_user or target_user.tenant_id != admin.tenant_id:
        raise HTTPException(status_code=404, detail="User not found in your tenant")

    limits = db.query(ResponsibleLimit).filter(ResponsibleLimit.user_id == user_id).first()
    
    if not limits:
        limits = ResponsibleLimit(user_id=user_id)
        db.add(limits)
    
    # Update fields
    limits.daily_loss_limit = limit_data.daily_loss_limit
    limits.daily_bet_limit = limit_data.daily_bet_limit
    limits.monthly_bet_limit = limit_data.monthly_bet_limit
    
    db.commit()
    db.refresh(limits)
    
    stats = limit_service.get_usage_stats(db, user_id)
    
    return {
        "daily_loss_limit": limits.daily_loss_limit,
        "daily_bet_limit": limits.daily_bet_limit,
        "monthly_bet_limit": limits.monthly_bet_limit,
        **stats
    }