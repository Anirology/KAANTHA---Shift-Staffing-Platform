from datetime import date, time, datetime
from decimal import Decimal
from typing import Annotated

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.models import ApplicationStatus, AttendanceStatus, ShiftStatus, UserRole

DateType = date
TimeType = time


def valid_times(start: time, end: time) -> tuple[time, time]:
    if start >= end:
        raise ValueError("start_time must be before end_time")
    return start, end


class RegisterWorker(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    name: str = Field(min_length=1, max_length=100)


class RegisterBusiness(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    business_name: str = Field(min_length=1, max_length=150)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterResponse(BaseModel):
    user_id: int
    role: UserRole


class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    role: UserRole
    user_id: int


class BusinessCreate(BaseModel):
    business_name: str = Field(min_length=1, max_length=150)

    @field_validator("business_name")
    @classmethod
    def nonblank_name(cls, value: str) -> str:
        name = value.strip()
        if not name:
            raise ValueError("business_name cannot be blank")
        return name


class BusinessResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    business_name: str


class MeResponse(BaseModel):
    id: int
    email: EmailStr
    role: UserRole
    worker_id: int | None
    business_id: int | None
    businesses: list[BusinessResponse]


class SkillResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    description: str | None


class AvailabilityBase(BaseModel):
    date: date
    start_time: time
    end_time: time

    @field_validator("end_time")
    @classmethod
    def end_after_start(cls, value: time, info):
        start = info.data.get("start_time")
        if start and value <= start:
            raise ValueError("start_time must be before end_time")
        return value


class AvailabilityResponse(AvailabilityBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    worker_id: int


class AvailabilityPatch(BaseModel):
    date: DateType | None = None
    start_time: TimeType | None = None
    end_time: TimeType | None = None


class WorkerResponse(BaseModel):
    id: int
    user_id: int
    name: str
    skills: list[SkillResponse]
    availability: list[AvailabilityResponse]


class WorkerPatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)


class SkillLink(BaseModel):
    skill_id: int = Field(gt=0)


class ShiftBase(BaseModel):
    role: str = Field(min_length=1, max_length=100)
    date: date
    start_time: time
    end_time: time
    required_workers: int = Field(gt=0)
    payment: Annotated[Decimal, Field(ge=0, max_digits=10, decimal_places=2)]
    required_skill_id: int = Field(gt=0)

    @field_validator("end_time")
    @classmethod
    def end_after_start(cls, value: time, info):
        start = info.data.get("start_time")
        if start and value <= start:
            raise ValueError("start_time must be before end_time")
        return value


class ShiftPatch(BaseModel):
    role: str | None = Field(default=None, min_length=1, max_length=100)
    date: DateType | None = None
    start_time: TimeType | None = None
    end_time: TimeType | None = None
    required_workers: int | None = Field(default=None, gt=0)
    payment: Annotated[Decimal | None, Field(default=None, ge=0, max_digits=10, decimal_places=2)]
    required_skill_id: int | None = Field(default=None, gt=0)


class ShiftResponse(BaseModel):
    id: int
    business_id: int
    business_name: str
    role: str
    date: date
    start_time: time
    end_time: time
    required_workers: int
    payment: Decimal
    required_skill_id: int
    required_skill_name: str
    status: ShiftStatus
    accepted_count: int
    remaining_slots: int


class ApplicationResponse(BaseModel):
    id: int
    shift_id: int
    worker_id: int
    worker_name: str
    status: ApplicationStatus
    applied_at: datetime
    attendance_status: AttendanceStatus | None
    rejection_reason: str | None


class RejectionRequest(BaseModel):
    reason: str | None = Field(default=None, max_length=255)


class AttendanceRequest(BaseModel):
    status: AttendanceStatus

    @field_validator("status")
    @classmethod
    def only_final_attendance(cls, value: AttendanceStatus):
        if value not in {AttendanceStatus.PRESENT, AttendanceStatus.ABSENT}:
            raise ValueError("status must be PRESENT or ABSENT")
        return value


class ImportErrorResponse(BaseModel):
    row: int
    field: str
    message: str


class ImportResponse(BaseModel):
    total_rows: int
    created: int
    failed: int
    errors: list[ImportErrorResponse]


class DateFilter(BaseModel):
    from_date: DateType | None = None
    to_date: DateType | None = None


class StaffingReport(BaseModel):
    shift_id: int
    role: str
    date: date
    required_workers: int
    confirmed_workers: int
    remaining_slots: int
    status: ShiftStatus
    payment: Decimal


class WorkerReport(BaseModel):
    worker_id: int
    worker_name: str
    completed_shifts: int
    total_hours: Decimal
    total_earnings: Decimal


class AttendanceReport(BaseModel):
    worker_id: int
    worker_name: str
    shift_id: int
    role: str
    date: date
    application_status: ApplicationStatus
    attendance_status: AttendanceStatus | None
    completion_status: ShiftStatus
    rejection_reason: str | None
