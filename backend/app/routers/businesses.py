"""List and create business profiles owned by the authenticated business account."""

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_role
from app.models import Business, User, UserRole
from app.schemas.schemas import BusinessCreate, BusinessResponse

router = APIRouter(prefix="/businesses", tags=["businesses"])
PHOTO_TYPES = {"image/jpeg": b"\xff\xd8\xff", "image/png": b"\x89PNG\r\n\x1a\n"}
MAX_PHOTO_BYTES = 3 * 1024 * 1024


def photo_type(data: bytes, declared: str | None) -> str:
    detected = next((mime for mime, signature in PHOTO_TYPES.items() if data.startswith(signature)), None)
    if not detected and len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        detected = "image/webp"
    if detected is None or (declared and declared != detected):
        raise HTTPException(400, "Use a valid JPEG, PNG, or WebP image.")
    return detected


@router.get("/me", response_model=list[BusinessResponse])
def my_businesses(user: User = Depends(require_role(UserRole.BUSINESS))):
    return sorted(user.businesses, key=lambda item: item.id)


@router.post("", response_model=BusinessResponse, status_code=201)
def create_business(data: BusinessCreate, user: User = Depends(require_role(UserRole.BUSINESS)), db: Session = Depends(get_db)):
    business = Business(user_id=user.id, business_name=data.business_name.strip())
    db.add(business)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "The business profile could not be created because the database schema is outdated. Redeploy the backend and try again.")
    db.refresh(business)
    return business


@router.put("/{business_id}/photo")
def upload_photo(business_id: int, file: UploadFile = File(...), user: User = Depends(require_role(UserRole.BUSINESS)), db: Session = Depends(get_db)):
    business = db.get(Business, business_id)
    if not business or business.user_id != user.id:
        raise HTTPException(404, "Business not found.")
    data = file.file.read(MAX_PHOTO_BYTES + 1)
    if len(data) > MAX_PHOTO_BYTES:
        raise HTTPException(413, "Profile photos must be 3 MB or smaller.")
    business.photo_data = data
    business.photo_content_type = photo_type(data, file.content_type)
    db.commit()
    return {"photo_url": f"/api/v1/businesses/{business.id}/photo"}


@router.get("/{business_id}/photo")
def get_photo(business_id: int, db: Session = Depends(get_db)):
    business = db.get(Business, business_id)
    if not business or not business.photo_data or not business.photo_content_type:
        raise HTTPException(404, "Profile photo not found.")
    return Response(business.photo_data, media_type=business.photo_content_type, headers={"Cache-Control": "public, max-age=300", "X-Content-Type-Options": "nosniff"})


@router.delete("/{business_id}/photo", status_code=204)
def delete_photo(business_id: int, user: User = Depends(require_role(UserRole.BUSINESS)), db: Session = Depends(get_db)):
    business = db.get(Business, business_id)
    if not business or business.user_id != user.id:
        raise HTTPException(404, "Business not found.")
    business.photo_data = None
    business.photo_content_type = None
    db.commit()
    return Response(status_code=204)
