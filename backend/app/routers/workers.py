"""Manage worker profiles, skills, availability, applications, and worker-facing records."""

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, get_worker
from app.models import Application, ApplicationStatus, Skill, User, Worker, WorkerAvailability, WorkerSkill
from app.schemas.schemas import ApplicationResponse, AvailabilityBase, AvailabilityPatch, AvailabilityResponse, SkillLink, SkillResponse, WorkerPatch, WorkerResponse

router = APIRouter(tags=["workers"])
PHOTO_TYPES = {"image/jpeg": b"\xff\xd8\xff", "image/png": b"\x89PNG\r\n\x1a\n"}
MAX_PHOTO_BYTES = 3 * 1024 * 1024


def photo_type(data: bytes, declared: str | None) -> str:
    detected = next((mime for mime, signature in PHOTO_TYPES.items() if data.startswith(signature)), None)
    if not detected and len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        detected = "image/webp"
    if detected is None or (declared and declared != detected):
        raise HTTPException(400, "Use a valid JPEG, PNG, or WebP image.")
    return detected


def worker_response(worker: Worker) -> WorkerResponse:
    return WorkerResponse(id=worker.id, user_id=worker.user_id, name=worker.name, photo_url=worker.photo_url, skills=worker.skills, availability=worker.availability)


def application_response(application: Application, rated: bool = False) -> ApplicationResponse:
    return ApplicationResponse(id=application.id, shift_id=application.shift_id, worker_id=application.worker_id, worker_name=application.worker.name, status=application.status, applied_at=application.applied_at, attendance_status=application.attendance.status if application.attendance else None, rejection_reason=application.rejection_reason, worker_photo_url=application.worker.photo_url, rated=rated)


@router.get("/skills", response_model=list[SkillResponse])
def skills(_: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.scalars(select(Skill).order_by(Skill.name)).all()


@router.get("/workers/me", response_model=WorkerResponse)
def get_me(worker: Worker = Depends(get_worker)):
    return worker_response(worker)


@router.patch("/workers/me", response_model=WorkerResponse)
def patch_me(data: WorkerPatch, worker: Worker = Depends(get_worker), db: Session = Depends(get_db)):
    if data.name is not None:
        worker.name = data.name
    db.commit(); db.refresh(worker); return worker_response(worker)


@router.put("/workers/me/photo")
def upload_photo(file: UploadFile = File(...), worker: Worker = Depends(get_worker), db: Session = Depends(get_db)):
    data = file.file.read(MAX_PHOTO_BYTES + 1)
    if len(data) > MAX_PHOTO_BYTES:
        raise HTTPException(413, "Profile photos must be 3 MB or smaller.")
    content_type = photo_type(data, file.content_type)
    worker.photo_data = data
    worker.photo_content_type = content_type
    db.commit()
    return {"photo_url": f"/api/v1/workers/{worker.id}/photo"}


@router.get("/workers/{worker_id}/photo")
def get_photo(worker_id: int, db: Session = Depends(get_db)):
    worker = db.get(Worker, worker_id)
    if not worker or not worker.photo_data or not worker.photo_content_type:
        raise HTTPException(404, "Profile photo not found.")
    return Response(worker.photo_data, media_type=worker.photo_content_type, headers={"Cache-Control": "public, max-age=300", "X-Content-Type-Options": "nosniff"})


@router.delete("/workers/me/photo", status_code=204)
def delete_photo(worker: Worker = Depends(get_worker), db: Session = Depends(get_db)):
    worker.photo_data = None
    worker.photo_content_type = None
    db.commit()
    return Response(status_code=204)


@router.post("/workers/me/skills", response_model=SkillResponse, status_code=201)
def add_skill(data: SkillLink, worker: Worker = Depends(get_worker), db: Session = Depends(get_db)):
    skill = db.get(Skill, data.skill_id)
    if not skill: raise HTTPException(404, "Skill not found.")
    if db.scalar(select(WorkerSkill).where(WorkerSkill.worker_id == worker.id, WorkerSkill.skill_id == skill.id)):
        raise HTTPException(409, "Skill is already added.")
    db.add(WorkerSkill(worker_id=worker.id, skill_id=skill.id)); db.commit(); return skill


@router.delete("/workers/me/skills/{skill_id}", status_code=204)
def delete_skill(skill_id: int, worker: Worker = Depends(get_worker), db: Session = Depends(get_db)):
    link = db.scalar(select(WorkerSkill).where(WorkerSkill.worker_id == worker.id, WorkerSkill.skill_id == skill_id))
    if not link: raise HTTPException(404, "Skill link not found.")
    db.delete(link); db.commit(); return Response(status_code=204)


@router.post("/workers/me/availability", response_model=AvailabilityResponse, status_code=201)
def add_availability(data: AvailabilityBase, worker: Worker = Depends(get_worker), db: Session = Depends(get_db)):
    item = WorkerAvailability(worker_id=worker.id, **data.model_dump()); db.add(item); db.commit(); db.refresh(item); return item


@router.patch("/workers/me/availability/{id}", response_model=AvailabilityResponse)
def patch_availability(id: int, data: AvailabilityPatch, worker: Worker = Depends(get_worker), db: Session = Depends(get_db)):
    item = db.get(WorkerAvailability, id)
    if not item: raise HTTPException(404, "Availability not found.")
    if item.worker_id != worker.id: raise HTTPException(403, "You do not own this availability record.")
    values = data.model_dump(exclude_unset=True)
    start = values.get("start_time", item.start_time)
    end = values.get("end_time", item.end_time)
    if start >= end: raise HTTPException(422, "start_time must be before end_time")
    for key, value in values.items(): setattr(item, key, value)
    db.commit(); db.refresh(item); return item


@router.delete("/workers/me/availability/{id}", status_code=204)
def delete_availability(id: int, worker: Worker = Depends(get_worker), db: Session = Depends(get_db)):
    item = db.get(WorkerAvailability, id)
    if not item: raise HTTPException(404, "Availability not found.")
    if item.worker_id != worker.id: raise HTTPException(403, "You do not own this availability record.")
    db.delete(item); db.commit(); return Response(status_code=204)


@router.get("/workers/me/applications", response_model=list[ApplicationResponse])
def my_applications(status: ApplicationStatus | None = None, worker: Worker = Depends(get_worker), db: Session = Depends(get_db)):
    query = select(Application).where(Application.worker_id == worker.id)
    if status: query = query.where(Application.status == status.value)
    return [application_response(item) for item in db.scalars(query.order_by(Application.applied_at.desc())).all()]
