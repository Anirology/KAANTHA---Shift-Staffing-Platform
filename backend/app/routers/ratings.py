from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_business, get_worker
from app.models import Application, ApplicationStatus, Business, Rating, Shift, ShiftStatus, Worker
from app.schemas.schemas import RatingCreate, RatingResponse

router = APIRouter(tags=["ratings"])


def rating_response(rating: Rating) -> dict:
    return {
        "id": rating.id,
        "shift_id": rating.shift_id,
        "worker_id": rating.worker_id,
        "business_id": rating.business_id,
        "business_name": rating.business.business_name,
        "shift_role": rating.shift.role,
        "score": rating.score,
        "review": rating.review,
        "created_at": rating.created_at,
    }


@router.post("/shifts/{shift_id}/workers/{worker_id}/rating", response_model=RatingResponse, status_code=status.HTTP_201_CREATED)
def create_rating(shift_id: int, worker_id: int, payload: RatingCreate, business: Business = Depends(get_business), db: Session = Depends(get_db)):
    shift = db.get(Shift, shift_id)
    if not shift or shift.business_id != business.id:
        raise HTTPException(404, "Shift not found.")
    if shift.status != ShiftStatus.COMPLETED.value:
        raise HTTPException(409, "Ratings are allowed only after the shift is completed.")
    accepted = db.scalar(select(Application).where(Application.shift_id == shift.id, Application.worker_id == worker_id, Application.status == ApplicationStatus.ACCEPTED.value))
    if not accepted:
        raise HTTPException(409, "Only a worker accepted for this shift can be rated.")
    existing = db.scalar(select(Rating).where(Rating.shift_id == shift.id, Rating.worker_id == worker_id, Rating.business_id == business.id))
    if existing:
        raise HTTPException(409, "This worker has already been rated for the shift.")
    rating = Rating(shift_id=shift.id, worker_id=worker_id, business_id=business.id, score=payload.score, review=payload.review.strip() if payload.review and payload.review.strip() else None)
    db.add(rating)
    db.commit()
    db.refresh(rating)
    return rating_response(rating)


@router.get("/workers/me/ratings", response_model=list[RatingResponse])
def my_ratings(worker: Worker = Depends(get_worker), db: Session = Depends(get_db)):
    ratings = db.scalars(select(Rating).where(Rating.worker_id == worker.id).order_by(Rating.created_at.desc(), Rating.id.desc())).all()
    return [rating_response(rating) for rating in ratings]
