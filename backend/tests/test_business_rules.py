from decimal import Decimal
from uuid import uuid4

from app.models import Skill


def login(client, email: str) -> dict[str, str]:
    response = client.post("/api/v1/auth/login", json={"email": email, "password": "password123"})
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def register_business(client, name="Business"):
    email = f"business-{uuid4().hex}@example.com"
    response = client.post("/api/v1/auth/register/business", json={"email": email, "password": "password123", "business_name": name})
    assert response.status_code == 201
    return login(client, email)


def register_worker(client, name="Worker"):
    email = f"worker-{uuid4().hex}@example.com"
    response = client.post("/api/v1/auth/register/worker", json={"email": email, "password": "password123", "name": name})
    assert response.status_code == 201
    return login(client, email)


def skill_id(session_factory) -> int:
    with session_factory() as db:
        skill = Skill(name="Cashier", description="Test skill")
        db.add(skill)
        db.commit()
        return skill.id


def create_shift(client, headers, skill, start="09:00:00", end="12:00:00", workers=1):
    response = client.post("/api/v1/shifts", headers=headers, json={
        "role": "Cashier", "date": "2030-01-01", "start_time": start,
        "end_time": end, "required_workers": workers, "payment": "1500.00",
        "required_skill_id": skill,
    })
    assert response.status_code == 201
    return response.json()["id"]


def apply(client, worker_headers, shift_id):
    response = client.post(f"/api/v1/shifts/{shift_id}/applications", headers=worker_headers)
    assert response.status_code == 201
    return response.json()["id"]


def test_full_vertical_slice_reports_and_completion(api):
    client, sessions = api
    business = register_business(client)
    worker = register_worker(client, "Flow Worker")
    skill = skill_id(sessions)
    assert client.post("/api/v1/workers/me/skills", headers=worker, json={"skill_id": skill}).status_code == 201
    availability = client.post("/api/v1/workers/me/availability", headers=worker, json={"date": "2030-01-01", "start_time": "08:00:00", "end_time": "13:00:00"})
    assert availability.status_code == 201
    assert client.patch(f"/api/v1/workers/me/availability/{availability.json()['id']}", headers=worker, json={"end_time": "14:00:00"}).status_code == 200

    shift_id = create_shift(client, business, skill)
    application_id = apply(client, worker, shift_id)
    assert client.post(f"/api/v1/shifts/{shift_id}/applications", headers=worker).status_code == 409
    accepted = client.patch(f"/api/v1/applications/{application_id}/accept", headers=business)
    assert accepted.status_code == 200 and accepted.json()["status"] == "ACCEPTED"
    assert client.patch(f"/api/v1/applications/{application_id}/accept", headers=business).status_code == 409
    assert client.patch(f"/api/v1/shifts/{shift_id}/complete", headers=business).status_code == 409
    assert client.patch(f"/api/v1/applications/{application_id}/attendance", headers=business, json={"status": "PRESENT"}).status_code == 200
    completed = client.patch(f"/api/v1/shifts/{shift_id}/complete", headers=business)
    assert completed.status_code == 200 and completed.json()["status"] == "COMPLETED"

    staffing = client.get("/api/v1/reports/staffing", headers=business).json()
    assert staffing == [{"shift_id": shift_id, "role": "Cashier", "date": "2030-01-01", "required_workers": 1, "confirmed_workers": 1, "remaining_slots": 0, "status": "COMPLETED", "payment": "1500.00"}]
    workers = client.get("/api/v1/reports/workers", headers=business).json()
    assert workers[0]["completed_shifts"] == 1
    assert Decimal(workers[0]["total_hours"]) == Decimal("3")
    assert Decimal(workers[0]["total_earnings"]) == Decimal("1500.00")
    attendance = client.get("/api/v1/reports/attendance", headers=business).json()
    assert attendance[0]["attendance_status"] == "PRESENT"
    for endpoint, header in (
        ("staffing", "shift_id,role,date,required_workers,confirmed_workers,remaining_slots,status,payment"),
        ("workers", "worker_id,worker_name,completed_shifts,total_hours,total_earnings"),
        ("attendance", "worker_id,worker_name,shift_id,role,date,application_status,attendance_status,completion_status,rejection_reason"),
    ):
        export = client.get(f"/api/v1/reports/{endpoint}/export", headers=business)
        assert export.status_code == 200
        assert export.text.splitlines()[0] == header
        pdf = client.get(f"/api/v1/reports/{endpoint}/export/pdf", headers=business)
        assert pdf.status_code == 200
        assert pdf.headers["content-type"] == "application/pdf"
        assert pdf.content.startswith(b"%PDF")


def test_roles_cross_business_ownership_missing_skill_and_capacity(api):
    client, sessions = api
    owner, other = register_business(client, "Owner"), register_business(client, "Other")
    worker_one, worker_two, unskilled = register_worker(client), register_worker(client), register_worker(client)
    skill = skill_id(sessions)
    assert client.post("/api/v1/shifts", headers=worker_one, json={"role": "Cashier", "date": "2030-01-01", "start_time": "09:00:00", "end_time": "10:00:00", "required_workers": 1, "payment": "1.00", "required_skill_id": skill}).status_code == 403
    assert client.post("/api/v1/shifts", headers=owner, json={"role": "Cashier", "date": "2030-01-01", "start_time": "09:00:00", "end_time": "10:00:00", "required_workers": 1, "payment": "1.00", "required_skill_id": 9999}).status_code == 404
    shift_id = create_shift(client, owner, skill)
    unskilled_application = apply(client, unskilled, shift_id)
    assert client.patch(f"/api/v1/applications/{unskilled_application}/accept", headers=owner).status_code == 409
    assert client.get("/api/v1/workers/me/applications", headers=unskilled).json()[0]["status"] == "PENDING"
    for worker in (worker_one, worker_two):
        assert client.post("/api/v1/workers/me/skills", headers=worker, json={"skill_id": skill}).status_code == 201
    first, second = apply(client, worker_one, shift_id), apply(client, worker_two, shift_id)
    assert client.patch(f"/api/v1/applications/{first}/accept", headers=other).status_code == 403
    assert client.patch(f"/api/v1/applications/{first}/accept", headers=owner).status_code == 200
    assert client.patch(f"/api/v1/applications/{second}/accept", headers=owner).status_code == 409
    applications = client.get("/api/v1/workers/me/applications", headers=worker_two).json()
    assert applications[0]["status"] == "PENDING"


def test_adjacent_shifts_are_allowed_and_overlaps_stay_pending(api):
    client, sessions = api
    business, worker = register_business(client), register_worker(client)
    skill = skill_id(sessions)
    assert client.post("/api/v1/workers/me/skills", headers=worker, json={"skill_id": skill}).status_code == 201
    first = apply(client, worker, create_shift(client, business, skill, "09:00:00", "10:00:00"))
    assert client.patch(f"/api/v1/applications/{first}/accept", headers=business).status_code == 200
    adjacent = apply(client, worker, create_shift(client, business, skill, "10:00:00", "11:00:00"))
    assert client.patch(f"/api/v1/applications/{adjacent}/accept", headers=business).status_code == 200
    overlapping = apply(client, worker, create_shift(client, business, skill, "09:30:00", "10:30:00"))
    assert client.patch(f"/api/v1/applications/{overlapping}/accept", headers=business).status_code == 409
    applications = client.get("/api/v1/workers/me/applications", headers=worker).json()
    assert next(item for item in applications if item["id"] == overlapping)["status"] == "PENDING"


def test_csv_import_reports_valid_and_invalid_rows(api):
    client, sessions = api
    business = register_business(client)
    skill = skill_id(sessions)
    csv_body = (
        "role,date,start_time,end_time,required_workers,payment,required_skill_id\n"
        f"Cashier,2030-01-01,09:00:00,12:00:00,1,1500.00,{skill}\n"
        "Cashier,2030-01-01,12:00:00,09:00:00,0,-1.00,999\n"
    )
    response = client.post("/api/v1/shifts/import", headers=business, files={"file": ("shifts.csv", csv_body, "text/csv")})
    assert response.status_code == 200
    assert response.json()["total_rows"] == 2
    assert response.json()["created"] == 1
    assert response.json()["failed"] == 1
    assert response.json()["errors"]


def test_one_login_can_manage_two_businesses_without_cross_business_access(api):
    client, sessions = api
    owner = register_business(client, "First Business")
    other = register_business(client, "Other Owner")
    worker = register_worker(client)
    skill = skill_id(sessions)

    first = client.get("/api/v1/businesses/me", headers=owner).json()[0]
    created = client.post("/api/v1/businesses", headers=owner, json={"business_name": "Second Business"})
    assert created.status_code == 201
    second = created.json()
    assert second["id"] != first["id"]
    assert [item["id"] for item in client.get("/api/v1/auth/me", headers=owner).json()["businesses"]] == [first["id"], second["id"]]
    assert client.get("/api/v1/businesses/me", headers=worker).status_code == 403
    assert client.post("/api/v1/businesses", headers=worker, json={"business_name": "Fake"}).status_code == 403

    assert client.get("/api/v1/businesses/me/shifts", headers=owner).status_code == 400
    first_headers = {**owner, "X-Business-Id": str(first["id"])}
    second_headers = {**owner, "X-Business-Id": str(second["id"])}
    first_shift = create_shift(client, first_headers, skill)
    second_shift = create_shift(client, second_headers, skill, start="13:00:00", end="15:00:00")
    assert [item["id"] for item in client.get("/api/v1/businesses/me/shifts", headers=first_headers).json()] == [first_shift]
    assert [item["id"] for item in client.get("/api/v1/businesses/me/shifts", headers=second_headers).json()] == [second_shift]
    assert client.get(f"/api/v1/shifts/{first_shift}", headers=second_headers).status_code == 404
    assert client.patch(f"/api/v1/shifts/{first_shift}", headers=second_headers, json={"role": "Changed"}).status_code == 403
    assert client.get("/api/v1/reports/staffing", headers=second_headers).json()[0]["shift_id"] == second_shift
    assert client.get("/api/v1/businesses/me/shifts", headers={**other, "X-Business-Id": str(first["id"])}).status_code == 403

    assert client.post("/api/v1/workers/me/skills", headers=worker, json={"skill_id": skill}).status_code == 201
    application = apply(client, worker, first_shift)
    assert client.patch(f"/api/v1/applications/{application}/accept", headers=second_headers).status_code == 403
    assert client.patch(f"/api/v1/applications/{application}/accept", headers=worker).status_code == 403
    assert client.get("/api/v1/workers/me/applications", headers=worker).json()[0]["status"] == "PENDING"
    assert client.patch(f"/api/v1/applications/{application}/accept", headers=first_headers).status_code == 200
