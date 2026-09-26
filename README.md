# Shiftly — Temporary Shift Staffing Platform

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

## Multiple businesses per account

A BUSINESS login can now create and switch between business profiles. Its shifts, applicants, imports, and reports are scoped to the selected business. The frontend sends `X-Business-Id`; the backend verifies that the logged-in user owns that ID. A WORKER token cannot call business-only endpoints.

Existing MySQL and PostgreSQL databases still contain a unique rule on `businesses.user_id`. **Back up the database first**, then inspect and apply the migration from `backend/`:

```powershell
.\.venv313\Scripts\python.exe -m migrations.allow_multiple_businesses
.\.venv313\Scripts\python.exe -m migrations.allow_multiple_businesses --apply
```

Run this against each existing environment before testing the second-business flow. Do not point the migration at production until its backup and `DATABASE_URL` have been verified. Fresh databases built from the current models need no migration. After deployment, test that switching businesses changes the shift and report data, and that another account cannot select either business.

## Report downloads

Business users can view staffing, worker hours/earnings, and attendance reports, filter them by date, and download either CSV or a branded PDF. PDFs are generated in memory and include the selected business, report purpose, period, Shiftly styling, and page numbers.

