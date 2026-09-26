from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_role
from app.models import Business, User, UserRole
from app.schemas.schemas import BusinessCreate, BusinessResponse

router = APIRouter(prefix="/businesses", tags=["businesses"])


@router.get("/me", response_model=list[BusinessResponse])
def my_businesses(user: User = Depends(require_role(UserRole.BUSINESS))):
    return sorted(user.businesses, key=lambda item: item.id)


@router.post("", response_model=BusinessResponse, status_code=201)
def create_business(data: BusinessCreate, user: User = Depends(require_role(UserRole.BUSINESS)), db: Session = Depends(get_db)):
    business = Business(user_id=user.id, business_name=data.business_name.strip())
    db.add(business)
    db.commit()
    db.refresh(business)
    return business
