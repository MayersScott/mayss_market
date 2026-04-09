from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.logger import logger
from app.core.security import decode_token
from app.models import User, UserRole

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")
optional_oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/v1/auth/login",
    auto_error=False,
)


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    subject = decode_token(token)
    if subject is None:
        logger.warning("Invalid token provided")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
        user_id = int(subject)
    except ValueError:
        logger.warning(f"Invalid user ID in token: {subject}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token format",
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if user is None or not user.is_active:
        logger.warning(f"User {user_id} not found or inactive")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )
    
    return user


def get_optional_user(
    token: str | None = Depends(optional_oauth2_scheme),
    db: Session = Depends(get_db),
) -> User | None:
    if not token:
        return None
    
    subject = decode_token(token)
    if subject is None:
        return None
    
    try:
        user_id = int(subject)
    except ValueError:
        return None
    
    user = db.query(User).filter(User.id == user_id).first()
    if user is None or not user.is_active:
        return None
    
    return user


def require_seller(user: User = Depends(get_current_user)) -> User:
    if user.role not in (UserRole.SELLER, UserRole.ADMIN):
        logger.warning(f"User {user.id} attempted seller action without permissions")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seller role required to access this resource",
        )
    return user


def require_verified_seller(user: User = Depends(require_seller)) -> User:
    if not user.seller_profile:
        logger.error(f"Seller user {user.id} has no seller profile")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Seller profile not found",
        )
    
    if not user.seller_profile.is_verified:
        logger.warning(f"Seller {user.id} attempted action without verification")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seller verification required to access this resource",
        )
    
    return user


def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.ADMIN:
        logger.warning(f"User {user.id} attempted admin action without permissions")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin role required to access this resource",
        )
    return user
