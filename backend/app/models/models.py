"""Define the database entities, relationships, and workflow status values."""

from datetime import date, datetime, time
from decimal import Decimal
from enum import StrEnum

from sqlalchemy import Date, DateTime, ForeignKey, Integer, Numeric, String, Text, Time, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database import Base


# String enums provide a fixed vocabulary shared by database values, API validation, and UI logic.
class UserRole(StrEnum):
    WORKER = "WORKER"
    BUSINESS = "BUSINESS"


class ApplicationStatus(StrEnum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"


class ShiftStatus(StrEnum):
    OPEN = "OPEN"
    FILLED = "FILLED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class AttendanceStatus(StrEnum):
    NOT_MARKED = "NOT_MARKED"
    PRESENT = "PRESENT"
    ABSENT = "ABSENT"


# Each ORM class maps one persistent table; relationships describe how related rows are navigated.
class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    # Unique plus indexed means one login per email and fast lookups during sign-in.
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(20))
    # A user has zero or one worker profile; deleting the user also removes that dependent profile.
    worker: Mapped["Worker | None"] = relationship(back_populates="user", uselist=False, cascade="all, delete-orphan")
    # A business login may own several profiles; orphan removal keeps profile lifecycle tied to its owner.
    businesses: Mapped[list["Business"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class Worker(Base):
    # A worker profile extends an account; skill membership is stored in the join table below.
    __tablename__ = "workers"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    # ForeignKey links this profile to its login; unique enforces the one-worker-profile-per-user rule.
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True)
    name: Mapped[str] = mapped_column(String(100))
    user: Mapped[User] = relationship(back_populates="worker")
    skills: Mapped[list["Skill"]] = relationship(secondary="worker_skills", back_populates="workers")
    availability: Mapped[list["WorkerAvailability"]] = relationship(back_populates="worker", cascade="all, delete-orphan")
    applications: Mapped[list["Application"]] = relationship(back_populates="worker")

class Business(Base):
    # A user may own multiple independent business workspaces, each with its own shifts.
    __tablename__ = "businesses"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    # The owner reference is indexed for listing workspaces; it is intentionally not unique.
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    business_name: Mapped[str] = mapped_column(String(150))
    user: Mapped[User] = relationship(back_populates="businesses")
    shifts: Mapped[list["Shift"]] = relationship(back_populates="business")
    ratings: Mapped[list["Rating"]] = relationship(back_populates="business")

class Skill(Base):
    __tablename__ = "skills"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    workers: Mapped[list[Worker]] = relationship(secondary="worker_skills", back_populates="skills")
    shifts: Mapped[list["Shift"]] = relationship(back_populates="required_skill")


class WorkerSkill(Base):
    __tablename__ = "worker_skills"
    # Two primary-key columns make each worker/skill pair unique and cascade cleanup on deletion.
    worker_id: Mapped[int] = mapped_column(ForeignKey("workers.id", ondelete="CASCADE"), primary_key=True)
    skill_id: Mapped[int] = mapped_column(ForeignKey("skills.id", ondelete="CASCADE"), primary_key=True)


class WorkerAvailability(Base):
    __tablename__ = "worker_availability"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    # Availability belongs to one worker and is removed when that worker profile is deleted.
    worker_id: Mapped[int] = mapped_column(ForeignKey("workers.id", ondelete="CASCADE"))
    date: Mapped[date] = mapped_column(Date)
    start_time: Mapped[time] = mapped_column(Time)
    end_time: Mapped[time] = mapped_column(Time)
    worker: Mapped[Worker] = relationship(back_populates="availability")


class Shift(Base):
    # One listing can cover the same daily hours across consecutive calendar dates.
    __tablename__ = "shifts"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    business_id: Mapped[int] = mapped_column(ForeignKey("businesses.id"))
    role: Mapped[str] = mapped_column(String(100))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    date: Mapped[date] = mapped_column(Date)
    # Python and database defaults keep newly-created shifts one day unless a duration is supplied.
    duration_days: Mapped[int] = mapped_column(Integer, default=1, server_default="1")
    start_time: Mapped[time] = mapped_column(Time)
    end_time: Mapped[time] = mapped_column(Time)
    required_workers: Mapped[int] = mapped_column(Integer)
    payment: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    required_skill_id: Mapped[int] = mapped_column(ForeignKey("skills.id"))
    status: Mapped[str] = mapped_column(String(20), default=ShiftStatus.OPEN.value)
    business: Mapped[Business] = relationship(back_populates="shifts")
    required_skill: Mapped[Skill] = relationship(back_populates="shifts")
    applications: Mapped[list["Application"]] = relationship(back_populates="shift")
    ratings: Mapped[list["Rating"]] = relationship(back_populates="shift")


class Application(Base):
    # A unique worker/shift pair prevents duplicate applications at the database level.
    __tablename__ = "applications"
    # Database constraint closes the race window if the same worker submits twice concurrently.
    __table_args__ = (UniqueConstraint("worker_id", "shift_id", name="uq_application_worker_shift"),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    shift_id: Mapped[int] = mapped_column(ForeignKey("shifts.id"))
    worker_id: Mapped[int] = mapped_column(ForeignKey("workers.id"))
    status: Mapped[str] = mapped_column(String(20), default=ApplicationStatus.PENDING.value)
    applied_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    rejection_reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
    shift: Mapped[Shift] = relationship(back_populates="applications")
    worker: Mapped[Worker] = relationship(back_populates="applications")
    attendance: Mapped["Attendance | None"] = relationship(back_populates="application", uselist=False, cascade="all, delete-orphan")


class Attendance(Base):
    # Attendance is a one-to-one outcome attached only after an application is accepted.
    __tablename__ = "attendance"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    application_id: Mapped[int] = mapped_column(ForeignKey("applications.id"), unique=True)
    status: Mapped[str] = mapped_column(String(20), default=AttendanceStatus.NOT_MARKED.value)
    application: Mapped[Application] = relationship(back_populates="attendance")


class Rating(Base):
    # A business can submit at most one rating per worker for a particular shift.
    __tablename__ = "ratings"
    __table_args__ = (UniqueConstraint("shift_id", "worker_id", "business_id", name="uq_rating_shift_worker_business"),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    shift_id: Mapped[int] = mapped_column(ForeignKey("shifts.id"))
    worker_id: Mapped[int] = mapped_column(ForeignKey("workers.id"))
    business_id: Mapped[int] = mapped_column(ForeignKey("businesses.id"))
    score: Mapped[int] = mapped_column(Integer)
    review: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    shift: Mapped[Shift] = relationship(back_populates="ratings")
    worker: Mapped[Worker] = relationship()
    business: Mapped[Business] = relationship(back_populates="ratings")
