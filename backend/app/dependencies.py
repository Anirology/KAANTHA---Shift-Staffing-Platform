from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, Header, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import Business, User, UserRole, Worker

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def create_access_token(user: User) -> str:
    expires = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_minutes)
    return jwt.encode({"sub": str(user.id), "exp": expires}, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_error = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token.", headers={"WWW-Authenticate": "Bearer"})
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        user_id = int(payload.get("sub", ""))
    except (jwt.InvalidTokenError, ValueError, TypeError):
        raise credentials_error
    user = db.get(User, user_id)
    if not user:
        raise credentials_error
    return user


def require_role(role: UserRole):
    def dependency(user: User = Depends(get_current_user)) -> User:
        if user.role != role.value:
            raise HTTPException(status_code=403, detail="You do not have permission for this resource.")
        return user
    return dependency


def get_worker(user: User = Depends(require_role(UserRole.WORKER)), db: Session = Depends(get_db)) -> Worker:
    if not user.worker:
        raise HTTPException(status_code=403, detail="Worker profile not found.")
    return user.worker


def resolve_business(user: User, business_id: int | None, db: Session) -> Business:
    if user.role != UserRole.BUSINESS.value:
        raise HTTPException(status_code=403, detail="Business account required.")
    if business_id is None:
        if len(user.businesses) == 1:
            return user.businesses[0]
        raise HTTPException(status_code=400, detail="Select a business using X-Business-Id.")
    business = db.get(Business, business_id)
    if business is None or business.user_id != user.id:
        raise HTTPException(status_code=403, detail="You do not own this business.")
    return business


def get_business(user: User = Depends(require_role(UserRole.BUSINESS)), db: Session = Depends(get_db), business_id: int | None = Header(default=None, alias="X-Business-Id")) -> Business:
    return resolve_business(user, business_id, db)
