from datetime import date, datetime, time
from decimal import Decimal
from enum import StrEnum

from sqlalchemy import Date, DateTime, ForeignKey, Integer, Numeric, String, Text, Time, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database import Base


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


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(20))
    worker: Mapped["Worker | None"] = relationship(back_populates="user", uselist=False, cascade="all, delete-orphan")
    businesses: Mapped[list["Business"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class Worker(Base):
    __tablename__ = "workers"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True)
    name: Mapped[str] = mapped_column(String(100))
    user: Mapped[User] = relationship(back_populates="worker")
    skills: Mapped[list["Skill"]] = relationship(secondary="worker_skills", back_populates="workers")
    availability: Mapped[list["WorkerAvailability"]] = relationship(back_populates="worker", cascade="all, delete-orphan")
    applications: Mapped[list["Application"]] = relationship(back_populates="worker")


class Business(Base):
    __tablename__ = "businesses"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    business_name: Mapped[str] = mapped_column(String(150))
    user: Mapped[User] = relationship(back_populates="businesses")
    shifts: Mapped[list["Shift"]] = relationship(back_populates="business")


class Skill(Base):
    __tablename__ = "skills"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    workers: Mapped[list[Worker]] = relationship(secondary="worker_skills", back_populates="skills")
    shifts: Mapped[list["Shift"]] = relationship(back_populates="required_skill")


class WorkerSkill(Base):
    __tablename__ = "worker_skills"
    worker_id: Mapped[int] = mapped_column(ForeignKey("workers.id", ondelete="CASCADE"), primary_key=True)
    skill_id: Mapped[int] = mapped_column(ForeignKey("skills.id", ondelete="CASCADE"), primary_key=True)


class WorkerAvailability(Base):
    __tablename__ = "worker_availability"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    worker_id: Mapped[int] = mapped_column(ForeignKey("workers.id", ondelete="CASCADE"))
    date: Mapped[date] = mapped_column(Date)
    start_time: Mapped[time] = mapped_column(Time)
    end_time: Mapped[time] = mapped_column(Time)
    worker: Mapped[Worker] = relationship(back_populates="availability")


class Shift(Base):
    __tablename__ = "shifts"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    business_id: Mapped[int] = mapped_column(ForeignKey("businesses.id"))
    role: Mapped[str] = mapped_column(String(100))
    date: Mapped[date] = mapped_column(Date)
    start_time: Mapped[time] = mapped_column(Time)
    end_time: Mapped[time] = mapped_column(Time)
    required_workers: Mapped[int] = mapped_column(Integer)
    payment: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    required_skill_id: Mapped[int] = mapped_column(ForeignKey("skills.id"))
    status: Mapped[str] = mapped_column(String(20), default=ShiftStatus.OPEN.value)
    business: Mapped[Business] = relationship(back_populates="shifts")
    required_skill: Mapped[Skill] = relationship(back_populates="shifts")
    applications: Mapped[list["Application"]] = relationship(back_populates="shift")


class Application(Base):
    __tablename__ = "applications"
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
    __tablename__ = "attendance"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    application_id: Mapped[int] = mapped_column(ForeignKey("applications.id"), unique=True)
    status: Mapped[str] = mapped_column(String(20), default=AttendanceStatus.NOT_MARKED.value)
    application: Mapped[Application] = relationship(back_populates="attendance")
