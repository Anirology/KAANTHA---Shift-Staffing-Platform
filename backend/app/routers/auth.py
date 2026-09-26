from fastapi import APIRouter, Depends, HTTPException
from pwdlib import PasswordHash
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import create_access_token, get_current_user
from app.models import Business, User, UserRole, Worker
from app.schemas.schemas import LoginRequest, LoginResponse, MeResponse, RegisterBusiness, RegisterResponse, RegisterWorker

router = APIRouter(prefix="/auth", tags=["auth"])
password_hash = PasswordHash.recommended()


def register(db: Session, email: str, password: str, role: UserRole, profile):
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(409, "Email is already registered.")
    user = User(email=email, password_hash=password_hash.hash(password), role=role.value)
    db.add(user); db.flush()
    if role == UserRole.WORKER: db.add(Worker(user_id=user.id, name=profile))
    else: db.add(Business(user_id=user.id, business_name=profile))
    db.commit()
    return RegisterResponse(user_id=user.id, role=role)


@router.post("/register/worker", response_model=RegisterResponse, status_code=201)
def register_worker(data: RegisterWorker, db: Session = Depends(get_db)):
    return register(db, data.email, data.password, UserRole.WORKER, data.name)


@router.post("/register/business", response_model=RegisterResponse, status_code=201)
def register_business(data: RegisterBusiness, db: Session = Depends(get_db)):
    return register(db, data.email, data.password, UserRole.BUSINESS, data.business_name)


@router.post("/login", response_model=LoginResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == data.email))
    if not user or not password_hash.verify(data.password, user.password_hash):
        raise HTTPException(401, "Incorrect email or password.")
    return LoginResponse(access_token=create_access_token(user), token_type="bearer", role=user.role, user_id=user.id)


@router.get("/me", response_model=MeResponse)
def me(user: User = Depends(get_current_user)):
    businesses = sorted(user.businesses, key=lambda item: item.id)
    return MeResponse(id=user.id, email=user.email, role=user.role, worker_id=user.worker.id if user.worker else None, business_id=businesses[0].id if businesses else None, businesses=businesses)
