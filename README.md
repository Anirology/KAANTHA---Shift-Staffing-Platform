# KAANTHA — Shift Staffing Platform

A web app where businesses post temporary shifts and workers apply for them.

Team: Sutherman Aniruththen (Ani) and Sivaneswaran Kajarsan (Kajan).

## Local development

From `backend/`, create a Python 3.13 virtual environment, install the development dependencies, and copy `.env.example` to `.env`. Set `DATABASE_URL` to a local MySQL database and give `JWT_SECRET` a long random value. Keep `.env` out of Git.

```powershell
py -3.13 -m venv .venv313
.\.venv313\Scripts\python.exe -m pip install -r requirements-dev.txt
.\.venv313\Scripts\python.exe -m app.seed_skills
.\.venv313\Scripts\python.exe -m uvicorn app.main:app --reload
```

`app.seed_skills` creates missing tables and starter skills without modifying existing records. The API runs at `http://127.0.0.1:8000`; API docs are at `/docs`.

In another terminal, run the frontend from `frontend/`:

```powershell
npm.cmd ci
npm.cmd run dev
```

The frontend uses `http://127.0.0.1:8000` in development by default. To use a different backend, set `VITE_API_BASE_URL` to its origin (without `/api/v1`).

## Vercel

The root `vercel.json` deploys the Vite frontend and FastAPI backend on one domain. Connect a persistent Postgres database through Vercel Storage; the Neon integration supplies `DATABASE_URL`. Set a fixed `JWT_SECRET` for production. The backend creates missing tables and starter skills on startup. Local SQLite files are not suitable for persistent data on Vercel.

## Checks

```powershell
cd backend
.\.venv313\Scripts\python.exe -m pytest tests -q --basetemp .test-tmp -p no:cacheprovider
cd ..\frontend
npm.cmd run lint
npm.cmd run build
```

