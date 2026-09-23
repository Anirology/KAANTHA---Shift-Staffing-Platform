import csv
import io
from datetime import date, time
from decimal import Decimal, InvalidOperation

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_business
from app.models import Business, Shift, Skill
from app.schemas.schemas import ImportResponse

router = APIRouter(prefix="/shifts", tags=["imports"])
HEADERS = ["role", "date", "start_time", "end_time", "required_workers", "payment", "required_skill_id"]


@router.post("/import", response_model=ImportResponse)
def import_shifts(file: UploadFile = File(...), business: Business = Depends(get_business), db: Session = Depends(get_db)):
    if file.content_type not in {"text/csv", "application/csv", "application/vnd.ms-excel"}:
        raise HTTPException(400, "File must be a CSV.")
    raw = file.file.read()
    if len(raw) > 5 * 1024 * 1024:
        raise HTTPException(400, "CSV file is too large.")
    try:
        reader = csv.DictReader(io.StringIO(raw.decode("utf-8-sig")))
    except UnicodeDecodeError:
        raise HTTPException(400, "CSV file must be UTF-8 encoded.")
    if reader.fieldnames != HEADERS:
        raise HTTPException(400, "CSV headers do not match the required contract.")
    rows = list(reader)
    errors = []
    valid = []
    for row_number, row in enumerate(rows, start=2):
        values = {}
        for field in HEADERS:
            if not row.get(field): errors.append({"row": row_number, "field": field, "message": "Field is required."})
        if any(error["row"] == row_number for error in errors): continue
        try:
            values["role"] = row["role"]
            values["date"] = date.fromisoformat(row["date"])
            values["start_time"] = time.fromisoformat(row["start_time"])
            values["end_time"] = time.fromisoformat(row["end_time"])
            values["required_workers"] = int(row["required_workers"])
            values["payment"] = Decimal(row["payment"])
            values["required_skill_id"] = int(row["required_skill_id"])
            if values["start_time"] >= values["end_time"]: raise ValueError("start_time must be before end_time")
            if values["required_workers"] <= 0: raise ValueError("required_workers must be greater than zero")
            if values["payment"] < 0: raise ValueError("payment cannot be negative")
            if not db.get(Skill, values["required_skill_id"]):
                errors.append({"row": row_number, "field": "required_skill_id", "message": "Skill does not exist."}); continue
            valid.append(values)
        except (ValueError, InvalidOperation) as exc:
            field = "date" if "date" in str(exc) else "values"
            errors.append({"row": row_number, "field": field, "message": str(exc) or "Invalid value."})
    for values in valid:
        db.add(Shift(business_id=business.id, **values))
    db.commit()
    failed_rows = {error["row"] for error in errors}
    return {"total_rows": len(rows), "created": len(valid), "failed": len(failed_rows), "errors": errors}
