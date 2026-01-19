from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.user import User, UserType
from ..utils.security import decode_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """Get current authenticated user"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception
    
    user_id_str = payload.get("sub")
    if user_id_str is None:
        raise credentials_exception
        
    user_id = int(user_id_str)
    
    user = db.query(User).filter(User.user_id == user_id).first()
    if user is None:
        raise credentials_exception
    
    return user

async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Get current active user"""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )
    return current_user

# async def require_admin(
#     current_user: User = Depends(get_current_active_user)
# ) -> User:
#     """Require admin role"""
#     if current_user.role != UserType.admin:
#         raise HTTPException(
#             status_code=status.HTTP_403_FORBIDDEN,
#             detail="Admin access required"
#         )
#     return current_user

async def require_tenant(
    current_user: User = Depends(get_current_active_user)
) -> User:
    """Require user to have a tenant assigned"""
    if current_user.tenant_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must select a region first"
        )
    return current_user

async def require_casino_owner(
    current_user: User = Depends(get_current_active_user)
) -> User:
    """Require casino_owner role"""
    if current_user.role != UserType.casino_owner:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Casino Owner access required"
        )
    return current_user

async def require_tenant_admin(
    current_user: User = Depends(get_current_active_user)
) -> User:
    """Require admin role (Tenant level)"""
    if current_user.role != UserType.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tenant Admin access required"
        )
    if current_user.tenant_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admin account is not linked to a tenant"
        )
    return current_user