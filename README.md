\# KAANTHA — Shift Staffing Platform



A web application where businesses post temporary shifts and workers apply for them.



Team: Sutherman Aniruththen (Ani) and Sivaneswaran Kajarsan (Kajan).



## Backend setup

From `backend/`, use the verified `.venv313` virtual environment, install
dependencies, and copy `.env.example` to `.env`. Set `DATABASE_URL` to the
MySQL database Ani created and replace `JWT_SECRET` with a long random value.
Do not commit `.env`.

```powershell
.\.venv313\Scripts\Activate.ps1
.\.venv313\Scripts\python.exe -m pip install -r requirements.txt
.\.venv313\Scripts\python.exe -m app.seed_skills
.\.venv313\Scripts\python.exe -m uvicorn app.main:app --reload
```

`\.venv313\Scripts\python.exe -m app.seed_skills` creates missing tables and inserts only missing
starter skills; it does not delete or modify existing users, shifts, or skills.
Swagger is available at `http://127.0.0.1:8000/docs` and health at
`http://127.0.0.1:8000/health`.

## Vercel deployment

Connect a persistent Postgres database (the Vercel Neon integration supplies
`DATABASE_URL`) to the production project. Vercel functions cannot persist a
local SQLite database. Set a long, fixed `JWT_SECRET` in the project's
production environment variables. The FastAPI service creates missing tables
and starter skills when it starts on Vercel. Redeploy after changing environment
variables so the new values reach the functions. The frontend calls `/api/v1`
on the same domain; `VITE_API_BASE_URL` may be omitted.

For isolated backend tests (which use a temporary SQLite file and do not access
the configured MySQL database):

```powershell
.\.venv313\Scripts\python.exe -m pytest tests -q --basetemp .test-tmp -p no:cacheprovider
```

