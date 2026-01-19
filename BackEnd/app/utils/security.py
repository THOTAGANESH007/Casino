from datetime import timezone
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional
from ..config import settings
import hashlib

pass_context = CryptContext(schemes=["argon2"],deprecated="auto") # bcrypt allows only 72 bytes long (argon2_cffi)

def get_password_hash(password: str) -> str:
    """Hash a password"""
    sha256_hash = hashlib.sha256(password.encode("utf-8")).hexdigest()
    return pass_context.hash(sha256_hash)

def verify_password(plain_password:str, hashed_password: str):
    """Verify a plain password against a hashed password"""
    sha256_hash = hashlib.sha256(plain_password.encode("utf-8")).hexdigest()
    return pass_context.verify(sha256_hash,hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[dict]:
    """Decode a JWT access token"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError as e:
        return None