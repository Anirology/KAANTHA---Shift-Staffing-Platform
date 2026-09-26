import csv
import io
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session
from reportlab.lib import colors
from reportlab.lib.enums import TA_RIGHT
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Image, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from app.database import get_db
from app.dependencies import get_business
from app.models import Application, ApplicationStatus, AttendanceStatus, Business, Shift, ShiftStatus
from app.schemas.schemas import AttendanceReport, StaffingReport, WorkerReport

router = APIRouter(prefix="/reports", tags=["reports"])

REPORTS = {
    "staffing": {
        "title": "Staffing Report",
        "description": "Shows how fully each shift is staffed and where positions remain open.",
        "headers": list(StaffingReport.model_fields),
    },
    "workers": {
        "title": "Worker Hours & Earnings Report",
        "description": "Summarises completed shifts, attended hours and earnings for each worker.",
        "headers": list(WorkerReport.model_fields),
    },
    "attendance": {
        "title": "Attendance & Completion Report",
        "description": "Tracks application outcomes, recorded attendance and shift completion status.",
        "headers": list(AttendanceReport.model_fields),
    },
}


def filtered_shifts(business_id: int, from_date: date | None, to_date: date | None, db: Session):
    if from_date and to_date and from_date > to_date:
        raise HTTPException(422, "from_date must be on or before to_date.")
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


def export_pdf(kind: str, rows, business: Business, from_date: date | None, to_date: date | None):
    metadata = REPORTS[kind]
    output = io.BytesIO()
    document = SimpleDocTemplate(output, pagesize=landscape(A4), leftMargin=15 * mm, rightMargin=15 * mm, topMargin=18 * mm, bottomMargin=16 * mm)
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("ShiftlyTitle", parent=styles["Title"], textColor=colors.HexColor("#0F4C5C"), fontSize=22, leading=26, spaceAfter=6)
    brand_style = ParagraphStyle("ShiftlyBrand", parent=styles["Title"], textColor=colors.white, fontSize=16, leading=18, leftIndent=2 * mm)
    body_style = ParagraphStyle("ShiftlyBody", parent=styles["BodyText"], textColor=colors.HexColor("#567079"), fontSize=9, leading=13)
    meta_style = ParagraphStyle("ShiftlyMeta", parent=body_style, alignment=TA_RIGHT, fontSize=8)
    header_style = ParagraphStyle("ShiftlyHeader", parent=styles["BodyText"], textColor=colors.white, fontSize=7, leading=9)
    cell_style = ParagraphStyle("ShiftlyCell", parent=styles["BodyText"], textColor=colors.HexColor("#17313A"), fontSize=7, leading=9)
    period = f"{from_date or 'All dates'} to {to_date or 'All dates'}" if from_date or to_date else "All dates"
    story = []
    logo_path = Path(__file__).resolve().parents[3] / "frontend" / "public" / "shiftly-logo.png"
    brand = [Paragraph("<b>SHIFTLY</b>", brand_style)]
    if logo_path.exists():
        brand.insert(0, Image(str(logo_path), width=12 * mm, height=12 * mm))
    brand_block = Table([brand], style=TableStyle([("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#0F4C5C")), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("LEFTPADDING", (0, 0), (-1, -1), 4 * mm), ("RIGHTPADDING", (0, 0), (-1, -1), 4 * mm), ("TOPPADDING", (0, 0), (-1, -1), 2 * mm), ("BOTTOMPADDING", (0, 0), (-1, -1), 2 * mm)]))
    story.append(Table([[brand_block, Paragraph(f"<b>{business.business_name}</b><br/>Period: {period}<br/>Generated: {datetime.now().astimezone().strftime('%Y-%m-%d %H:%M')}", meta_style)]], colWidths=[125 * mm, 125 * mm], style=TableStyle([("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("ALIGN", (1, 0), (1, 0), "RIGHT")])))
    story.extend([Spacer(1, 8 * mm), Paragraph(metadata["title"], title_style), Paragraph(metadata["description"], body_style), Spacer(1, 6 * mm)])
    table_rows = [[Paragraph(header.replace("_", " ").title(), header_style) for header in metadata["headers"]]]
    for row in rows:
        data = row.model_dump() if hasattr(row, "model_dump") else row
        table_rows.append([Paragraph(str(data.get(header) if data.get(header) is not None else "—"), cell_style) for header in metadata["headers"]])
    if len(table_rows) == 1:
        story.append(Paragraph("No report rows matched the selected period.", body_style))
    else:
        table = Table(table_rows, repeatRows=1, hAlign="LEFT")
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0F4C5C")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#E7F0EF")]),
            ("GRID", (0, 0), (-1, -1), .35, colors.HexColor("#B8CCCE")),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 5), ("RIGHTPADDING", (0, 0), (-1, -1), 5),
            ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ]))
        story.append(table)

    def footer(canvas, doc):
        canvas.saveState()
        canvas.setStrokeColor(colors.HexColor("#9BCFC9")); canvas.line(15 * mm, 11 * mm, 282 * mm, 11 * mm)
        canvas.setFillColor(colors.HexColor("#567079")); canvas.setFont("Helvetica", 7)
        canvas.drawString(15 * mm, 7 * mm, "Shiftly · Temporary shift staffing")
        canvas.drawRightString(282 * mm, 7 * mm, f"Page {doc.page}")
        canvas.restoreState()

    document.build(story, onFirstPage=footer, onLaterPages=footer)
    output.seek(0)
    filename = f"shiftly-{kind}-report.pdf"
    return StreamingResponse(output, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename={filename}"})


@router.get("/staffing/export")
def staffing_export(from_date: date | None = None, to_date: date | None = None, business: Business = Depends(get_business), db: Session = Depends(get_db)):
    rows = rows_for_staffing(filtered_shifts(business.id, from_date, to_date, db), db); return export_csv(list(StaffingReport.model_fields), rows)


@router.get("/workers/export")
def workers_export(from_date: date | None = None, to_date: date | None = None, business: Business = Depends(get_business), db: Session = Depends(get_db)):
    rows = workers(from_date, to_date, business, db); return export_csv(list(WorkerReport.model_fields), [row.model_dump() if hasattr(row, "model_dump") else row for row in rows])


@router.get("/attendance/export")
def attendance_export(from_date: date | None = None, to_date: date | None = None, business: Business = Depends(get_business), db: Session = Depends(get_db)):
    rows = attendance(from_date, to_date, business, db); return export_csv(list(AttendanceReport.model_fields), [row.model_dump() if hasattr(row, "model_dump") else row for row in rows])


@router.get("/staffing/export/pdf")
def staffing_pdf(from_date: date | None = None, to_date: date | None = None, business: Business = Depends(get_business), db: Session = Depends(get_db)):
    return export_pdf("staffing", rows_for_staffing(filtered_shifts(business.id, from_date, to_date, db), db), business, from_date, to_date)


@router.get("/workers/export/pdf")
def workers_pdf(from_date: date | None = None, to_date: date | None = None, business: Business = Depends(get_business), db: Session = Depends(get_db)):
    return export_pdf("workers", workers(from_date, to_date, business, db), business, from_date, to_date)


@router.get("/attendance/export/pdf")
def attendance_pdf(from_date: date | None = None, to_date: date | None = None, business: Business = Depends(get_business), db: Session = Depends(get_db)):
    return export_pdf("attendance", attendance(from_date, to_date, business, db), business, from_date, to_date)
