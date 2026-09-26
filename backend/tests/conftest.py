from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.main import app


@pytest.fixture
def api(tmp_path) -> Generator[tuple[TestClient, sessionmaker], None, None]:
    """Use a new SQLite file per test; never touch DATABASE_URL or MySQL data."""
    test_engine = create_engine(
        f"sqlite:///{tmp_path / 'shiftly-test.db'}",
        connect_args={"check_same_thread": False},
    )
    test_sessions = sessionmaker(bind=test_engine, autoflush=False, autocommit=False, expire_on_commit=False)
    Base.metadata.create_all(test_engine)

    def override_get_db():
        db = test_sessions()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    try:
        with TestClient(app) as client:
            yield client, test_sessions
    finally:
        app.dependency_overrides.clear()
        test_engine.dispose()
