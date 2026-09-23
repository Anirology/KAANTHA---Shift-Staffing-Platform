from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session, aliased

from app.models import Application, ApplicationStatus, Attendance, AttendanceStatus, Shift, ShiftStatus, Worker, WorkerSkill


def accept_application(db: Session, application_id: int, business_id: int) -> Application:
    application = db.execute(
        select(Application).join(Application.shift).where(Application.id == application_id, Shift.business_id == business_id).with_for_update()
    ).scalar_one_or_none()
    if not application:
        raise HTTPException(404, "Application not found.")
    shift = db.execute(select(Shift).where(Shift.id == application.shift_id).with_for_update()).scalar_one()
    # Serialise acceptance decisions for a worker as well as for the shift.  This
    # prevents concurrent requests for different shifts from double-booking them.
    db.execute(select(Worker).where(Worker.id == application.worker_id).with_for_update()).scalar_one()
    if application.status != ApplicationStatus.PENDING.value or shift.status != ShiftStatus.OPEN.value:
        raise HTTPException(409, "Only pending applications for open shifts can be accepted.")
    skill = db.scalar(select(WorkerSkill).where(WorkerSkill.worker_id == application.worker_id, WorkerSkill.skill_id == shift.required_skill_id))
    if not skill:
        raise HTTPException(409, "Worker does not have the required skill.")
    existing_shift = aliased(Shift)
    overlap = db.scalar(select(Application.id).join(existing_shift, Application.shift_id == existing_shift.id).where(
        Application.worker_id == application.worker_id,
        Application.status == ApplicationStatus.ACCEPTED.value,
        existing_shift.date == shift.date,
        existing_shift.start_time < shift.end_time,
        existing_shift.end_time > shift.start_time,
    ).with_for_update())
    if overlap:
        raise HTTPException(409, "Worker has an overlapping accepted shift.")
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
