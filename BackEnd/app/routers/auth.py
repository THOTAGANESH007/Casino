from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import timedelta
from ..database import get_db
from ..models.user import User, UserType
from ..schemas.user import UserSignup, UserLogin, UserResponse, UserRegionSelect, KYCSubmit
from ..schemas.auth import Token
from ..utils.security import get_password_hash, verify_password, create_access_token
from ..utils.dependencies import get_current_user
from ..services.wallet_service import wallet_service
from ..config import settings
from ..models.tenant import TenantRegion
from ..models.user import UserKYC

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/signup", response_model=Token, status_code=status.HTTP_201_CREATED)
async def signup(user_data: UserSignup, db: Session = Depends(get_db)):
    """User signup - Returns Access Token immediately to allow onboarding"""
    
    # Check if email exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Hash password
    hashed_password = get_password_hash(user_data.password)
    
    # Create user (Active by default to allow onboarding steps, but gated by KYC on Login)
    new_user = User(
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        email=user_data.email,
        phone=user_data.phone,
        password=hashed_password,
        tenant_id=None,  # Assigned after region selection
        is_active=True,  # Account created active
        role=UserType.player
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Generate Token Immediately
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(new_user.user_id), "tenant_id": None},
        expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/select-region", response_model=UserResponse)
async def select_region(
    region_data: UserRegionSelect,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Select region and assign tenant"""
    
    # Verify region exists
    region = db.query(TenantRegion).filter(
        TenantRegion.region_id == region_data.region_id
    ).first()
    
    if not region:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Region not found"
        )
    
    # Assign tenant
    current_user.tenant_id = region.tenant_id
    
    # Create wallets for the user
    wallet_service.create_wallets_for_user(db, current_user.user_id)
    
    db.commit()
    db.refresh(current_user)
    
    return current_user

@router.post("/submit-kyc")
async def submit_kyc(
    kyc_data: KYCSubmit,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submit KYC documents"""
    
    if current_user.tenant_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please select a region first"
        )
    
    # Check if KYC already exists
    existing_kyc = db.query(UserKYC).filter(
        UserKYC.user_id == current_user.user_id
    ).first()
    
    if existing_kyc:
        # Update existing KYC
        existing_kyc.document_type = kyc_data.document_type
        existing_kyc.document_number = kyc_data.document_number
        existing_kyc.verified_status = False
        existing_kyc.verified_at = None
    else:
        # Create new KYC
        new_kyc = UserKYC(
            user_id=current_user.user_id,
            document_type=kyc_data.document_type,
            document_number=kyc_data.document_number,
            verified_status=False
        )
        db.add(new_kyc)
    
    db.commit()
    
    return {"message": "KYC submitted successfully. Awaiting admin approval."}

@router.post("/login", response_model=Token)
async def login(login_data: UserLogin, db: Session = Depends(get_db)):
    """User login - Enforces strict KYC check"""
    
    # Find user by email
    user = db.query(User).filter(User.email == login_data.email).first()
    
    if not user or not verify_password(login_data.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account disabled. Please Contact Admin!!!"
        )
    
    # Check KYC Status (Strict check for login only)
    if user.role == UserType.player:
        if not user.kyc or not user.kyc.verified_status:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="KYC verification is pending or missing. You cannot login until verified."
            )
    
    # Create access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.user_id), "tenant_id": user.tenant_id},
        expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return current_user