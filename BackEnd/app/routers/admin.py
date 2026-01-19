from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.utils.security import get_password_hash
from ..database import get_db
from ..models.user import User, UserKYC, UserType
from ..models.tenant import Tenant, TenantRegion
from ..schemas.tenant import RegionUpdate, TenantCreate, TenantResponse, RegionCreate, RegionResponse
from ..schemas.user import TenantAdminCreate, UserResponse, UserSignup
from ..utils.dependencies import require_casino_owner, require_tenant_admin
from ..services.email_service import email_service
from ..models.game import GameProvider
from ..schemas.game import GameProviderCreate, GameProviderResponse

router = APIRouter(prefix="/admin", tags=["Admin"])

# ============= TENANT MANAGEMENT =============

@router.post("/tenants", response_model=TenantResponse, status_code=status.HTTP_201_CREATED)
async def create_tenant(
    tenant_data: TenantCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_casino_owner)
):
    """Create a new tenant"""
    
    new_tenant = Tenant(
        tenant_name=tenant_data.tenant_name,
        default_timezone=tenant_data.default_timezone,
        default_currency=tenant_data.default_currency,
        status=True
    )
    
    db.add(new_tenant)
    db.commit()
    db.refresh(new_tenant)
    
    return new_tenant

@router.get("/tenants", response_model=List[TenantResponse])
async def get_all_tenants(
    db: Session = Depends(get_db),
    # admin: User = Depends(require_casino_owner)
):
    """Get all tenants"""
    tenants = db.query(Tenant).all()
    return tenants

@router.get("/tenants/{tenant_id}", response_model=TenantResponse)
async def get_tenant(
    tenant_id: int,
    db: Session = Depends(get_db),
    # admin: User = Depends(require_casino_owner)
):
    """Get a specific tenant"""
    tenant = db.query(Tenant).filter(Tenant.tenant_id == tenant_id).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    return tenant

@router.patch("/tenants/{tenant_id}/status")
async def update_tenant_status(
    tenant_id: int,
    status: bool,
    db: Session = Depends(get_db),
    admin: User = Depends(require_casino_owner)
):
    """Enable or disable a tenant"""
    tenant = db.query(Tenant).filter(Tenant.tenant_id == tenant_id).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    
    tenant.status = status
    db.commit()
    
    return {"message": f"Tenant {'enabled' if status else 'disabled'} successfully"}

# ============= REGION MANAGEMENT =============

@router.post("/regions", response_model=RegionResponse, status_code=status.HTTP_201_CREATED)
async def create_region(
    region_data: RegionCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_casino_owner)
):
    """Create a new region for a tenant"""
    
    # Verify tenant exists
    tenant = db.query(Tenant).filter(Tenant.tenant_id == region_data.tenant_id).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    
    new_region = TenantRegion(
        tenant_id=region_data.tenant_id,
        tax_rate=region_data.tax_rate,
        region_name=region_data.region_name
    )
    
    db.add(new_region)
    db.commit()
    db.refresh(new_region)
    
    return new_region

@router.get("/regions", response_model=List[RegionResponse])
async def get_all_regions(
    tenant_id: int = None,
    db: Session = Depends(get_db),
    # admin: User = Depends(require_casino_owner)
):
    """Get all regions, optionally filtered by tenant"""
    query = db.query(TenantRegion)
    if tenant_id:
        query = query.filter(TenantRegion.tenant_id == tenant_id)
    
    regions = query.all()
    return regions


# Update region tax rate
@router.patch("/regions/{region_id}/tax")
async def update_region_tax(
    region_id: int,
    update_data: RegionUpdate,
    db: Session = Depends(get_db),
    owner: User = Depends(require_casino_owner)
):
    """Update tax rate for a specific region"""
    region = db.query(TenantRegion).filter(TenantRegion.region_id == region_id).first()
    
    if not region:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Region not found"
        )
    
    region.tax_rate = update_data.tax_rate
    db.commit()
    db.refresh(region)
    
    return region

# ============= USER & KYC MANAGEMENT =============

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.user import User, UserType
from ..schemas.user import UserResponse
from ..utils.dependencies import require_tenant_admin

# ... imports ...

@router.get("/users-admin", response_model=List[UserResponse])
async def get_all_users_admin(
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(require_tenant_admin)
):
    """
    Get all users belonging specifically to the logged-in admin's tenant.
    Filters out other admins, showing only players.
    """
    query = db.query(User).filter(User.tenant_id == admin.tenant_id)
    
    query = query.filter(User.role == UserType.player)
    
    if is_active is not None:
        query = query.filter(User.is_active == is_active)
    
    users = query.all()
    return users

@router.get("/kyc/pending")
async def get_pending_kyc(
    db: Session = Depends(get_db),
    admin: User = Depends(require_tenant_admin)
):
    """Get all pending KYC verifications"""
    pending_kyc = db.query(UserKYC).filter(
        UserKYC.verified_status == False
    ).all()
    
    result = []
    for kyc in pending_kyc:
        user = db.query(User).filter(User.user_id == kyc.user_id).first()
        result.append({
            "kyc_id": kyc.kyc_id,
            "user_id": kyc.user_id,
            "user_name": f"{user.first_name} {user.last_name or ''}",
            "email": user.email,
            "document_type": kyc.document_type,
            "document_number": kyc.document_number
        })
    
    return result

@router.post("/kyc/{kyc_id}/approve")
async def approve_kyc(
    kyc_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_tenant_admin)
):
    """Approve KYC verification"""
    
    kyc = db.query(UserKYC).filter(UserKYC.kyc_id == kyc_id).first()
    if not kyc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="KYC record not found"
        )
    
    # Mark KYC as verified
    kyc.verified_status = True
    kyc.verified_at = datetime.utcnow()
    
    db.commit()
    
    # Get user
    user = db.query(User).filter(User.user_id == kyc.user_id).first()
    
    # Send email
    await email_service.send_kyc_approval_email(
        user.email,
        user.first_name
    )
    
    return {"message": "KYC approved successfully"}

@router.post("/kyc/{kyc_id}/reject")
async def reject_kyc(
    kyc_id: int,
    reason: str = None,
    db: Session = Depends(get_db),
    admin: User = Depends(require_tenant_admin)
):
    """Reject KYC verification"""
    
    kyc = db.query(UserKYC).filter(UserKYC.kyc_id == kyc_id).first()
    if not kyc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="KYC record not found"
        )
    
    # Get user
    user = db.query(User).filter(User.user_id == kyc.user_id).first()
    
    # Delete KYC record (user can resubmit)
    db.delete(kyc)
    db.commit()
    
    # Send email
    await email_service.send_kyc_rejection_email(
        user.email,
        user.first_name,
        reason
    )
    
    return {"message": "KYC rejected"}

@router.post("/users/{user_id}/activate")
async def activate_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_tenant_admin)
):
    """Activate a user account"""
    
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check if KYC is verified
    kyc = db.query(UserKYC).filter(UserKYC.user_id == user_id).first()
    if not kyc or not kyc.verified_status:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="KYC must be verified before activation"
        )
    
    # Activate user
    user.is_active = True
    db.commit()
    
    # Send activation email
    await email_service.send_activation_email(
        user.email,
        user.first_name
    )
    
    return {"message": "User activated successfully"}

@router.post("/users/{user_id}/deactivate")
async def deactivate_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_tenant_admin)
):
    """Deactivate a user account"""
    
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    user.is_active = False
    db.commit()
    
    return {"message": "User deactivated successfully"}


# Game Provider Management

@router.get("/providers", response_model=List[GameProviderResponse])
async def get_providers(
    db: Session = Depends(get_db),
    owner: User = Depends(require_casino_owner)
):
    """Fetch all game providers"""
    return db.query(GameProvider).all()

@router.post("/providers", response_model=GameProviderResponse)
async def add_game_provider(
    provider_data: GameProviderCreate,
    db: Session = Depends(get_db),
    owner: User = Depends(require_casino_owner)
):
    """Add a new game provider"""
    # Check if exists
    existing = db.query(GameProvider).filter(
        GameProvider.provider_name == provider_data.provider_name
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provider already exists"
        )

    new_provider = GameProvider(
        provider_name=provider_data.provider_name,
        api_url=provider_data.api_url,
        is_active=True
    )
    
    db.add(new_provider)
    db.commit()
    db.refresh(new_provider)
    return new_provider

@router.patch("/providers/{provider_id}/status")
async def toggle_provider_status(
    provider_id: int,
    is_active: bool,
    db: Session = Depends(get_db),
    owner: User = Depends(require_casino_owner)
):
    """Enable or disable a game provider"""
    provider = db.query(GameProvider).filter(GameProvider.provider_id == provider_id).first()
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    
    provider.is_active = is_active
    db.commit()
    return {"message": f"Provider {'enabled' if is_active else 'disabled'}"}

# Create Admin User for Tenant

@router.post("/create_admin_user_for_tenant", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_admin_user_for_tenant(
    admin_data: TenantAdminCreate, 
    db: Session = Depends(get_db),
    owner: User = Depends(require_casino_owner)
):
    """Create an admin user for a specific tenant"""
    
    # 1. Verify Tenant Exists
    tenant = db.query(Tenant).filter(Tenant.tenant_id == admin_data.tenant_id).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )

    # 2. Check if email exists
    existing_user = db.query(User).filter(User.email == admin_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # 3. Hash password
    hashed_password = get_password_hash(admin_data.password)

    # 4. Create User
    new_admin = User(
        email=admin_data.email,
        password=hashed_password,
        first_name=admin_data.first_name,
        last_name=admin_data.last_name,
        role=UserType.admin,
        tenant_id=admin_data.tenant_id,
        is_active=True
    )
    
    db.add(new_admin)
    db.commit()
    db.refresh(new_admin)
    
    return new_admin


@router.get("/tenant-admins", response_model=List[UserResponse])
async def get_tenant_admins(
    tenant_id: Optional[int] = None,
    db: Session = Depends(get_db),
    owner: User = Depends(require_casino_owner)
):
    """Get all tenant admins, optionally filtered by tenant"""
    query = db.query(User).filter(User.role == UserType.admin)
    
    if tenant_id:
        query = query.filter(User.tenant_id == tenant_id)
        
    return query.all()


@router.patch("/tenant-admins/{user_id}/status")
async def update_tenant_admin_status(
    user_id: int,
    is_active: bool,
    db: Session = Depends(get_db),
    owner: User = Depends(require_casino_owner)
):
    """Enable or disable a tenant admin"""
    
    # Fetch user ensuring they are an admin (don't allow disabling other roles here)
    admin_user = db.query(User).filter(
        User.user_id == user_id,
        User.role == UserType.admin
    ).first()
    
    if not admin_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant Admin not found"
        )
    
    admin_user.is_active = is_active
    db.commit()
    db.refresh(admin_user)
    
    return {"message": f"Admin status updated to {'Active' if is_active else 'Inactive'}"}