import csv
import io
from datetime import date, datetime
from decimal import Decimal

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_business
from app.models import Application, ApplicationStatus, AttendanceStatus, Business, Shift, ShiftStatus
from app.schemas.schemas import AttendanceReport, StaffingReport, WorkerReport

router = APIRouter(prefix="/reports", tags=["reports"])


def filtered_shifts(business_id: int, from_date: date | None, to_date: date | None, db: Session):
    query = select(Shift).where(Shift.business_id == business_id)
    if from_date: query = query.where(Shift.date >= from_date)
    if to_date: query = query.where(Shift.date <= to_date)
    return db.scalars(query.order_by(Shift.date, Shift.id)).all()


def rows_for_staffing(shifts, db):
    rows = []
    for shift in shifts:
        accepted = [item for item in shift.applications if item.status == ApplicationStatus.ACCEPTED.value]
        rows.append({"shift_id": shift.id, "role": shift.role, "date": shift.date, "required_workers": shift.required_workers, "confirmed_workers": len(accepted), "remaining_slots": max(shift.required_workers - len(accepted), 0), "status": shift.status, "payment": shift.payment})
    return rows


@router.get("/staffing", response_model=list[StaffingReport])
def staffing(from_date: date | None = None, to_date: date | None = None, business: Business = Depends(get_business), db: Session = Depends(get_db)):
    return rows_for_staffing(filtered_shifts(business.id, from_date, to_date, db), db)


@router.get("/workers", response_model=list[WorkerReport])
def workers(from_date: date | None = None, to_date: date | None = None, business: Business = Depends(get_business), db: Session = Depends(get_db)):
    result = {}
    for shift in filtered_shifts(business.id, from_date, to_date, db):
        if shift.status != ShiftStatus.COMPLETED.value: continue
        hours = Decimal((datetime.combine(date.min, shift.end_time) - datetime.combine(date.min, shift.start_time)).seconds) / Decimal(3600)
        for item in shift.applications:
            if item.status == ApplicationStatus.ACCEPTED.value and item.attendance and item.attendance.status == AttendanceStatus.PRESENT.value:
                current = result.setdefault(item.worker_id, {"worker_id": item.worker_id, "worker_name": item.worker.name, "completed_shifts": 0, "total_hours": Decimal(0), "total_earnings": Decimal(0)})
                current["completed_shifts"] += 1; current["total_hours"] += hours; current["total_earnings"] += shift.payment
    return list(result.values())


@router.get("/attendance", response_model=list[AttendanceReport])
def attendance(from_date: date | None = None, to_date: date | None = None, business: Business = Depends(get_business), db: Session = Depends(get_db)):
    rows = []
    for shift in filtered_shifts(business.id, from_date, to_date, db):
        for item in shift.applications:
            rows.append({"worker_id": item.worker_id, "worker_name": item.worker.name, "shift_id": shift.id, "role": shift.role, "date": shift.date, "application_status": item.status, "attendance_status": item.attendance.status if item.attendance else None, "completion_status": shift.status, "rejection_reason": item.rejection_reason})
    return rows


def export_csv(headers, rows):
    output = io.StringIO(); writer = csv.DictWriter(output, fieldnames=headers); writer.writeheader()
    for row in rows: writer.writerow({key: (str(value) if value is not None else "") for key, value in row.items()})
    return StreamingResponse(iter([output.getvalue()]), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=report.csv"})


@router.get("/staffing/export")
def staffing_export(from_date: date | None = None, to_date: date | None = None, business: Business = Depends(get_business), db: Session = Depends(get_db)):
    rows = rows_for_staffing(filtered_shifts(business.id, from_date, to_date, db), db); return export_csv(list(StaffingReport.model_fields), rows)


@router.get("/workers/export")
def workers_export(from_date: date | None = None, to_date: date | None = None, business: Business = Depends(get_business), db: Session = Depends(get_db)):
    rows = workers(from_date, to_date, business, db); return export_csv(list(WorkerReport.model_fields), [row.model_dump() if hasattr(row, "model_dump") else row for row in rows])


@router.get("/attendance/export")
def attendance_export(from_date: date | None = None, to_date: date | None = None, business: Business = Depends(get_business), db: Session = Depends(get_db)):
    rows = attendance(from_date, to_date, business, db); return export_csv(list(AttendanceReport.model_fields), [row.model_dump() if hasattr(row, "model_dump") else row for row in rows])
