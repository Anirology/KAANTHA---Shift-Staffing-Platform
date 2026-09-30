"""Configure the SQLAlchemy engine, session factory, and request-scoped database dependency."""

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings


database_url = settings.database_url
# Normalize provider-style PostgreSQL URLs to the SQLAlchemy driver this project installs.
if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql+psycopg://", 1)
elif database_url.startswith("postgresql://"):
    database_url = database_url.replace("postgresql://", "postgresql+psycopg://", 1)

connect_args = {"check_same_thread": False} if database_url.startswith("sqlite") else {}
# One shared engine owns pooled connections; individual HTTP requests receive short-lived sessions.
engine = create_engine(
    database_url,
    pool_pre_ping=True,
    pool_recycle=300,
    connect_args=connect_args,
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


class Base(DeclarativeBase):
    # All ORM tables inherit this metadata so create_all and schema inspection see them together.
    pass


def get_db() -> Generator[Session, None, None]:
    # Yield one session to a request and always return its connection to the pool afterward.
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
