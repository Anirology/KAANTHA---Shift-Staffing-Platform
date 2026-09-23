\# KAANTHA — Shift Staffing Platform



A web application where businesses post temporary shifts and workers apply for them.



Team: Sutherman Aniruththen (Ani) and Sivaneswaran Kajarsan (Kajan).



## Backend setup

From `backend/`, create a virtual environment, install dependencies, and copy
`.env.example` to `.env`. Set `DATABASE_URL` to the MySQL database Ani created
and replace `JWT_SECRET` with a long random value. Do not commit `.env`.

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m app.seed_skills
uvicorn app.main:app --reload
```

`python -m app.seed_skills` creates missing tables and inserts only missing
starter skills; it does not delete or modify existing users, shifts, or skills.
Swagger is available at `http://127.0.0.1:8000/docs` and health at
`http://127.0.0.1:8000/health`.

For isolated backend tests (which use a temporary SQLite file and do not access
the configured MySQL database):

```powershell
pytest tests -q
```

