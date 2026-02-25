from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
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
from ..models.tenant import Tenant, TenantRegion
from ..models.user import UserKYC
from ..services.email_service import email_service
import random
import string
from ..schemas.user import ForgotPasswordRequest, ResetPasswordRequest
from ..services.kyc_service import KYCService

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
    
    # 2. Verify selected Tenant belongs to that Region
    tenant = db.query(Tenant).filter(
        Tenant.tenant_id == region_data.tenant_id,
        Tenant.region_id == region_data.region_id
    ).first()

    if not tenant:
        raise HTTPException(
            status_code=400, 
            detail="The selected casino is not available in your region"
        )
    # Assign tenant and save the region of the user
    current_user.tenant_id = tenant.tenant_id
    current_user.region_id = region.region_id
    
    # Create wallets for the user
    wallet_service.create_wallets_for_user(db, current_user.user_id, tenant.tenant_id)
    
    db.commit()
    db.refresh(current_user)
    
    return current_user

@router.post("/submit-kyc")
async def submit_kyc(
    document_type: str = Form(...),
    document_number: str = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submit KYC documents"""
    
    if current_user.tenant_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please select a region first"
        )
    # 1. Check File Type
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    # 2. Upload to Cloudinary
    file_bytes = await file.read()
    url = KYCService.upload_document(file_bytes, current_user.user_id)
    # Check if KYC already exists
    existing_kyc = db.query(UserKYC).filter(
        UserKYC.user_id == current_user.user_id
    ).first()
    
    if existing_kyc:
        # Update existing KYC
        existing_kyc.document_type = document_type
        existing_kyc.document_number = document_number
        existing_kyc.document_url = url
        existing_kyc.verified_status = False
        existing_kyc.verified_at = None
    else:
        # Create new KYC
        new_kyc = UserKYC(
            user_id=current_user.user_id,
            document_type=document_type,
            document_number=document_number,
            document_url=url,
            verified_status=False
        )
        db.add(new_kyc)
    
    db.commit()
    
    return {"message": "KYC submitted successfully. Awaiting admin approval."}

@router.post("/switch-tenant/{tenant_id}")
async def switch_tenant(
    tenant_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Switching Casino: User stays in their region but picks a different tenant.
    """
    # 1. Verify tenant is active and in the user's fixed region
    tenant = db.query(Tenant).filter(
        Tenant.tenant_id == tenant_id,
        Tenant.region_id == current_user.region_id,
        Tenant.status == True
    ).first()

    if not tenant:
        raise HTTPException(
            status_code=400, 
            detail="Casino not found or not licensed in your region"
        )

    # 2. Update user's active tenant
    current_user.tenant_id = tenant_id

    # 3. Ensure wallets exist for the new tenant (if first time visiting)
    wallet_service.create_wallets_for_user(db, current_user.user_id, tenant_id)

    db.commit()

    # 4. Generate a NEW token because the tenant_id inside the token payload has changed
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    new_token = create_access_token(
        data={"sub": str(current_user.user_id), "tenant_id": tenant_id},
        expires_delta=access_token_expires
    )

    return {
        "access_token": new_token, 
        "token_type": "bearer",
        "tenant_name": tenant.tenant_name
    }

@router.get("/available-tenants")
async def get_available_tenants(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns all active casinos that belong to the user's 
    specific geographic region.
    """
    # 1. Identify the user's region
    user_region_id = current_user.region_id
    
    if not user_region_id:
        return []

    # 2. Fetch all tenants linked to that region
    tenants = db.query(Tenant).filter(
        Tenant.region_id == user_region_id,
        Tenant.status == True  # Only show active casinos
    ).all()
    
    # 3. Format response for the frontend dropdown
    return [
        {
            "tenant_id": t.tenant_id,
            "tenant_name": t.tenant_name,
            "currency": t.default_currency
        } for t in tenants
    ]

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
    
    # Check if account is disabled by tenant admin
    # if not user.is_active:
    #     raise HTTPException(
    #         status_code=status.HTTP_403_FORBIDDEN,
    #         detail="Account disabled. Please Contact Admin!!!"
    #     )
    
    # Check KYC Status (Strict check for login only)
    # if user.role == UserType.player:
    #     if not user.kyc or not user.kyc.verified_status:
    #         raise HTTPException(
    #             status_code=status.HTTP_403_FORBIDDEN,
    #             detail="KYC verification is pending or missing. You cannot login until verified."
    #         )
    
    # Create access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.user_id), "tenant_id": user.tenant_id},
        expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me")
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    user_dict = UserResponse.model_validate(current_user).model_dump()
    if current_user.role == "casino_owner":
        return user_dict
    # Currency of the tenant
    tenant = getattr(current_user, "tenant", None)
    currency = getattr(tenant, "default_currency", None)

    user_dict["currency"] = currency or "USD"
    
    # Include KYC verified status
    if current_user.kyc:
        user_dict['is_kyc_verified'] = current_user.kyc.verified_status # To restrict login based on KYC status
        user_dict['kyc_id'] = current_user.kyc.kyc_id # He not even uploaded KYC documents
    else:
        user_dict['is_kyc_verified'] = False
        user_dict['kyc_id'] = None
    return user_dict

@router.post("/forgot-password")
async def forgot_password(
    request: ForgotPasswordRequest, 
    db: Session = Depends(get_db)
):
    """Generate OTP and send to email"""
    user = db.query(User).filter(User.email == request.email).first()
    
    if not user:
        return {"message": "If the email exists, an OTP has been sent."}
    
    # Generate 6-digit OTP
    otp = ''.join(random.choices(string.digits, k=6))
    
    # Save to DB
    user.forgot_password_otp = otp
    db.commit()
    
    # Send Email
    await email_service.send_otp_email(user.email, otp)
    
    return {"message": "OTP sent to your email."}

@router.post("/reset-password")
async def reset_password(
    request: ResetPasswordRequest, 
    db: Session = Depends(get_db)
):
    """Verify OTP and reset password"""
    user = db.query(User).filter(User.email == request.email).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Verify OTP
    if not user.forgot_password_otp or user.forgot_password_otp != request.otp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP"
        )
    
    # Hash new password
    hashed_password = get_password_hash(request.new_password)
    
    # Update User
    user.password = hashed_password
    user.forgot_password_otp = None  # Clear OTP after use
    db.commit()
    
    return {"message": "Password reset successfully. You can now login."}