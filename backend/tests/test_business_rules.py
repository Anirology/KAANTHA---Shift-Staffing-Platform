from fastapi.testclient import TestClient
from uuid import uuid4

from app.main import app
from app.database import Base, SessionLocal, engine
from app.models import Skill


Base.metadata.create_all(engine)

def token(client, email, password):
    return client.post("/api/v1/auth/login", json={"email": email, "password": password}).json()["access_token"]


def test_full_flow_and_duplicate_application():
    client = TestClient(app)
    suffix = uuid4().hex
    business_email = f"business-{suffix}@example.com"
    worker_email = f"worker-{suffix}@example.com"
    business = client.post("/api/v1/auth/register/business", json={"email": business_email, "password": "password123", "business_name": "Flow Business"})
    worker = client.post("/api/v1/auth/register/worker", json={"email": worker_email, "password": "password123", "name": "Flow Worker"})
    assert business.status_code == 201
    assert worker.status_code == 201
    with SessionLocal() as db:
        skill = db.query(Skill).filter_by(name="Test Cashier").first()
        if not skill:
            skill = Skill(name="Test Cashier")
            db.add(skill); db.commit(); db.refresh(skill)
        skill_id = skill.id
    worker_headers = {"Authorization": f"Bearer {token(client, worker_email, 'password123')}"}
    business_headers = {"Authorization": f"Bearer {token(client, business_email, 'password123')}"}
    assert client.post("/api/v1/workers/me/skills", headers=worker_headers, json={"skill_id": skill_id}).status_code == 201
    shift = client.post("/api/v1/shifts", headers=business_headers, json={"role": "Cashier", "date": "2030-01-01", "start_time": "09:00:00", "end_time": "12:00:00", "required_workers": 1, "payment": "1500.00", "required_skill_id": skill_id})
    assert shift.status_code == 201
    shift_id = shift.json()["id"]
    application = client.post(f"/api/v1/shifts/{shift_id}/applications", headers=worker_headers)
    assert application.status_code == 201
    assert client.post(f"/api/v1/shifts/{shift_id}/applications", headers=worker_headers).status_code == 409
    assert client.patch(f"/api/v1/applications/{application.json()['id']}/accept", headers=worker_headers).status_code == 403
    accepted = client.patch(f"/api/v1/applications/{application.json()['id']}/accept", headers=business_headers)
    assert accepted.status_code == 200
    assert accepted.json()["status"] == "ACCEPTED"


def test_invalid_token_is_rejected():
    client = TestClient(app)
    response = client.patch("/api/v1/applications/999999/accept", headers={"Authorization": "Bearer invalid"})
    assert response.status_code == 401
