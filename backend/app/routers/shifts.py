from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.dependencies import get_business, get_current_user, get_worker
from app.models import Application, ApplicationStatus, Attendance, AttendanceStatus, Business, Shift, ShiftStatus, Skill, User, Worker
from app.schemas.schemas import ApplicationResponse, AttendanceRequest, RejectionRequest, ShiftBase, ShiftPatch, ShiftResponse
from app.routers.workers import application_response
from app.services.acceptance import accept_application

router = APIRouter(tags=["shifts", "applications"])


def shift_response(shift: Shift, db: Session) -> ShiftResponse:
    accepted = db.scalar(select(func.count(Application.id)).where(Application.shift_id == shift.id, Application.status == ApplicationStatus.ACCEPTED.value)) or 0
    return ShiftResponse(id=shift.id, business_id=shift.business_id, business_name=shift.business.business_name, role=shift.role, date=shift.date, start_time=shift.start_time, end_time=shift.end_time, required_workers=shift.required_workers, payment=shift.payment, required_skill_id=shift.required_skill_id, required_skill_name=shift.required_skill.name, status=shift.status, accepted_count=accepted, remaining_slots=max(shift.required_workers - accepted, 0))


def owned_application(application_id: int, business: Business, db: Session) -> Application:
    item = db.get(Application, application_id)
    if not item:
        raise HTTPException(404, "Application not found.")
    if item.shift.business_id != business.id:
        raise HTTPException(403, "You do not own this application.")
    return item


@router.get("/shifts", response_model=list[ShiftResponse])
def list_shifts(role: str | None = None, skill_id: int | None = None, date: date | None = None, min_payment: Decimal | None = None, status: ShiftStatus | None = None, _: User = Depends(get_current_user), db: Session = Depends(get_db)):
    query = select(Shift).options(joinedload(Shift.business), joinedload(Shift.required_skill))
    if role: query = query.where(Shift.role == role)
    if skill_id: query = query.where(Shift.required_skill_id == skill_id)
    if date: query = query.where(Shift.date == date)
    if min_payment is not None: query = query.where(Shift.payment >= min_payment)
    if status: query = query.where(Shift.status == status.value)
    return [shift_response(item, db) for item in db.scalars(query.order_by(Shift.date, Shift.start_time)).all()]


@router.get("/shifts/{shift_id}", response_model=ShiftResponse)
def get_shift(shift_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    shift = db.scalar(select(Shift).options(joinedload(Shift.business), joinedload(Shift.required_skill)).where(Shift.id == shift_id))
    if not shift: raise HTTPException(404, "Shift not found.")
    if user.role == "BUSINESS" and (not user.business or shift.business_id != user.business.id):
        raise HTTPException(404, "Shift not found.")
    if user.role == "WORKER" and shift.status != ShiftStatus.OPEN.value:
        has_applied = user.worker and db.scalar(select(Application.id).where(Application.shift_id == shift.id, Application.worker_id == user.worker.id))
        if not has_applied:
            raise HTTPException(404, "Shift not found.")
    return shift_response(shift, db)


@router.get("/businesses/me/shifts", response_model=list[ShiftResponse])
def business_shifts(business: Business = Depends(get_business), db: Session = Depends(get_db)):
    return [shift_response(item, db) for item in db.scalars(select(Shift).options(joinedload(Shift.business), joinedload(Shift.required_skill)).where(Shift.business_id == business.id)).all()]


@router.post("/shifts", response_model=ShiftResponse, status_code=201)
def create_shift(data: ShiftBase, business: Business = Depends(get_business), db: Session = Depends(get_db)):
    if not db.get(Skill, data.required_skill_id): raise HTTPException(404, "Skill not found.")
    shift = Shift(business_id=business.id, **data.model_dump()); db.add(shift); db.commit(); db.refresh(shift)
    return shift_response(shift, db)


@router.patch("/shifts/{shift_id}", response_model=ShiftResponse)
def update_shift(shift_id: int, data: ShiftPatch, business: Business = Depends(get_business), db: Session = Depends(get_db)):
    shift = db.get(Shift, shift_id)
    if not shift: raise HTTPException(404, "Shift not found.")
    if shift.business_id != business.id: raise HTTPException(403, "You do not own this shift.")
    if shift.status in {ShiftStatus.COMPLETED.value, ShiftStatus.CANCELLED.value}: raise HTTPException(409, "Completed or cancelled shifts cannot be edited.")
    values = data.model_dump(exclude_unset=True)
    if "required_skill_id" in values and not db.get(Skill, values["required_skill_id"]): raise HTTPException(404, "Skill not found.")
    accepted = db.scalar(select(func.count(Application.id)).where(Application.shift_id == shift.id, Application.status == ApplicationStatus.ACCEPTED.value)) or 0
    if values.get("required_workers", shift.required_workers) < accepted: raise HTTPException(409, "Required workers cannot be below accepted workers.")
    start, end = values.get("start_time", shift.start_time), values.get("end_time", shift.end_time)
    if start >= end: raise HTTPException(422, "start_time must be before end_time")
    for key, value in values.items(): setattr(shift, key, value)
    if shift.status == ShiftStatus.FILLED.value and accepted < shift.required_workers:
        shift.status = ShiftStatus.OPEN.value
    db.commit(); db.refresh(shift); return shift_response(shift, db)


@router.delete("/shifts/{shift_id}", status_code=204)
def cancel_shift(shift_id: int, business: Business = Depends(get_business), db: Session = Depends(get_db)):
    shift = db.get(Shift, shift_id)
    if not shift: raise HTTPException(404, "Shift not found.")
    if shift.business_id != business.id: raise HTTPException(403, "You do not own this shift.")
    if shift.status in {ShiftStatus.COMPLETED.value, ShiftStatus.CANCELLED.value}: raise HTTPException(409, "Shift cannot be cancelled in its current state.")
    shift.status = ShiftStatus.CANCELLED.value; db.commit(); return Response(status_code=204)


@router.post("/shifts/{shift_id}/applications", response_model=ApplicationResponse, status_code=201)
def apply(shift_id: int, worker: Worker = Depends(get_worker), db: Session = Depends(get_db)):
    shift = db.get(Shift, shift_id)
    if not shift: raise HTTPException(404, "Shift not found.")
    if shift.status != ShiftStatus.OPEN.value: raise HTTPException(409, "Applications are only allowed for open shifts.")
    if db.scalar(select(Application).where(Application.worker_id == worker.id, Application.shift_id == shift_id)): raise HTTPException(409, "Worker has already applied to this shift.")
    item = Application(worker_id=worker.id, shift_id=shift_id); db.add(item); db.commit(); db.refresh(item); return application_response(item)


@router.get("/shifts/{shift_id}/applications", response_model=list[ApplicationResponse])
def shift_applications(shift_id: int, business: Business = Depends(get_business), db: Session = Depends(get_db)):
    shift = db.get(Shift, shift_id)
    if not shift: raise HTTPException(404, "Shift not found.")
    if shift.business_id != business.id: raise HTTPException(403, "You do not own this shift.")
    return [application_response(item) for item in db.scalars(select(Application).where(Application.shift_id == shift_id)).all()]


@router.patch("/applications/{id}/accept", response_model=ApplicationResponse)
def accept(id: int, business: Business = Depends(get_business), db: Session = Depends(get_db)):
    return application_response(accept_application(db, id, business.id))


@router.patch("/applications/{id}/reject", response_model=ApplicationResponse)
def reject(id: int, data: RejectionRequest, business: Business = Depends(get_business), db: Session = Depends(get_db)):
    item = owned_application(id, business, db)
    if item.status != ApplicationStatus.PENDING.value: raise HTTPException(409, "Only pending applications may be rejected.")
    item.status = ApplicationStatus.REJECTED.value; item.rejection_reason = data.reason; db.commit(); db.refresh(item); return application_response(item)


@router.patch("/applications/{id}/attendance", response_model=ApplicationResponse)
def attendance(id: int, data: AttendanceRequest, business: Business = Depends(get_business), db: Session = Depends(get_db)):
    item = owned_application(id, business, db)
    if item.status != ApplicationStatus.ACCEPTED.value: raise HTTPException(409, "Attendance can only be marked for accepted applications.")
    item.attendance.status = data.status.value; db.commit(); db.refresh(item); return application_response(item)


@router.patch("/shifts/{shift_id}/complete", response_model=ShiftResponse)
def complete(shift_id: int, business: Business = Depends(get_business), db: Session = Depends(get_db)):
    shift = db.get(Shift, shift_id)
    if not shift: raise HTTPException(404, "Shift not found.")
    if shift.business_id != business.id: raise HTTPException(403, "You do not own this shift.")
    if shift.status not in {ShiftStatus.FILLED.value, ShiftStatus.OPEN.value}: raise HTTPException(409, "Shift cannot be completed in its current state.")
    accepted = db.scalars(select(Application).where(Application.shift_id == shift.id, Application.status == ApplicationStatus.ACCEPTED.value)).all()
    if not accepted or any(item.attendance is None or item.attendance.status == AttendanceStatus.NOT_MARKED.value for item in accepted): raise HTTPException(409, "All accepted workers must have marked attendance.")
    shift.status = ShiftStatus.COMPLETED.value; db.commit(); db.refresh(shift); return shift_response(shift, db)
