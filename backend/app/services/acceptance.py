"""Validate and commit worker acceptance while protecting skill, schedule, and shift capacity rules."""

from datetime import timedelta

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session, aliased

from app.models import Application, ApplicationStatus, Attendance, AttendanceStatus, Shift, ShiftStatus, Worker, WorkerSkill
from app.services.schedule import shift_end_date, shifts_overlap


def accept_application(db: Session, application_id: int, business_id: int) -> Application:
    # Lock the application and shift so simultaneous requests cannot overfill a shift.
    application = db.execute(select(Application).where(Application.id == application_id).with_for_update()).scalar_one_or_none()
    if not application:
        raise HTTPException(404, "Application not found.")
    if application.shift.business_id != business_id:
        raise HTTPException(403, "You do not own this application.")
    shift = db.execute(select(Shift).where(Shift.id == application.shift_id).with_for_update()).scalar_one()
    # Lock the worker too: concurrent requests on different shifts must not double-book them.
    db.execute(select(Worker).where(Worker.id == application.worker_id).with_for_update()).scalar_one()
    if application.status != ApplicationStatus.PENDING.value or shift.status != ShiftStatus.OPEN.value:
        raise HTTPException(409, "Only pending applications for open shifts can be accepted.")
    skill = db.scalar(select(WorkerSkill).where(WorkerSkill.worker_id == application.worker_id, WorkerSkill.skill_id == shift.required_skill_id))
    if not skill:
        raise HTTPException(409, "Worker does not have the required skill.")
    # Search nearby accepted shifts because a multi-day shift can overlap beyond its start date.
    existing_shift = aliased(Shift)
    existing_shifts = db.scalars(select(existing_shift).join(Application, Application.shift_id == existing_shift.id).where(
        Application.worker_id == application.worker_id,
        Application.status == ApplicationStatus.ACCEPTED.value,
        existing_shift.date <= shift_end_date(shift.date, shift.duration_days),
        existing_shift.date >= shift.date - timedelta(days=9),
    ).with_for_update()).all()
    if any(shifts_overlap(shift, item) for item in existing_shifts):
        raise HTTPException(409, "Worker has an overlapping accepted shift.")
    # Recount under the lock before changing status, then update both records together.
    # Check capacity after locking, then save acceptance and its attendance record in one transaction.
    accepted = db.scalar(select(func.count(Application.id)).where(Application.shift_id == shift.id, Application.status == ApplicationStatus.ACCEPTED.value)) or 0
    if accepted >= shift.required_workers:
        raise HTTPException(409, "Shift capacity is full.")
    application.status = ApplicationStatus.ACCEPTED.value
    db.add(Attendance(application_id=application.id, status=AttendanceStatus.NOT_MARKED.value))
    if accepted + 1 >= shift.required_workers:
        shift.status = ShiftStatus.FILLED.value
    db.commit()
    db.refresh(application)
    return application
