# Shiftly deployment runbook

## What is deployed

The GitHub monorepo is deployed as one Vercel project. `vercel.json` defines two services:

- `frontend/`: React + Vite static site.
- `backend/`: FastAPI Python service reached through `/api/*`, `/health`, and `/docs` on the same Vercel domain.

The frontend uses the current browser origin in production when `VITE_API_BASE_URL` is unset. This makes its production API URL `https://<project>.vercel.app/api/v1` without a hardcoded domain or mixed HTTP/HTTPS request.

## Vercel configuration

Import the GitHub repository and keep the project Root Directory at the repository root because the root `vercel.json` coordinates both services. Do not select `frontend/` for this combined deployment. For a separate frontend-only project, use Root Directory `frontend`, Build Command `npm run build`, and Output Directory `dist`.

Required production environment variables:

- `DATABASE_URL`: persistent PostgreSQL connection supplied by Neon/Vercel Storage.
- `JWT_SECRET`: long, random and stable secret. Changing it signs out every user.
- `JWT_ALGORITHM`: `HS256` unless deliberately changed.
- `ACCESS_TOKEN_MINUTES`: for example `60`.
- `AUTO_SEED_DATABASE`: `true` only when missing tables and starter skills should be created at startup.
- `CORS_ORIGINS`: local frontend origins plus the exact deployed HTTPS frontend origin if frontend and backend are ever hosted separately.
- `VITE_API_BASE_URL`: leave unset for the current same-origin Vercel deployment. Set only when using a separate public HTTPS backend origin, without `/api/v1`.

Never copy `.env` into Git or Vercel logs. Rotate any password that has been shared in chat or screenshots before production use.

## Database release order

1. Back up the production database.
2. Confirm `DATABASE_URL` points to the intended production database without printing its password.
3. Inspect `python -m migrations.allow_multiple_businesses`.
4. Apply `python -m migrations.allow_multiple_businesses --apply` only if the old unique `businesses.user_id` rule is reported.
5. Deploy with `AUTO_SEED_DATABASE=true` once to create additive tables such as `ratings`, then return it to the chosen normal setting.
6. Confirm existing users, businesses, shifts and applications remain present.

Local MySQL and production PostgreSQL are different database engines. The application is tested through SQLAlchemy, but production migration and CRUD checks are still required.

## GitHub-connected deployment

1. Run backend tests, frontend lint, and frontend production build locally.
2. Make a stable commit: `git add .`, `git commit -m "chore: prepare application for deployment"`, then `git push`.
3. In Vercel, import the GitHub repository or open the existing project.
4. Check the root configuration and environment variables for Production.
5. Deploy and wait for both services to become ready.
6. Open the live URL, `/health`, and `/docs`.
7. Test the complete worker and business flows below.
8. Fix production-only errors, commit, push, and let Vercel redeploy.

## Production testing checklist

Frontend:

- Landing page, logo, registration, login and logout work.
- Worker and business routes load without console errors.
- A refresh keeps the hash route usable.
- No request uses localhost or HTTP from the HTTPS page.
- Mobile navigation, page guides, empty states and forms work at 375 px width.

Backend and database:

- `/health` returns `{"status":"ok"}` and `/docs` loads.
- Register one worker and one business account.
- One business login creates and switches between two businesses; their shifts stay isolated.
- Business creates, edits, imports and cancels a shift.
- Worker adds a skill and availability, browses details and applies.
- Business sees the applicant; worker cannot accept themself.
- Skill mismatch, overlap and capacity acceptance attempts return `409` and remain pending.
- Attendance can be marked and the shift completed.
- Staffing, worker, and attendance reports display; CSV and PDF downloads open correctly.
- A completed accepted worker can be rated once and sees the rating.
- Skill catalogue CSV reports created, duplicate and invalid rows correctly.

Security and configuration:

- No secret or `.env` file is tracked.
- `JWT_SECRET` is fixed in production and database credentials are current.
- `X-Business-Id` cannot select another account's business.
- If the frontend gets a different domain, add its exact HTTPS origin to `CORS_ORIGINS` and redeploy.

## Production record

After a successful release, update README without secret values:

- Live frontend URL:
- Backend URL:
- API docs URL:
- Deployment platform: Vercel
- Database platform: Neon PostgreSQL
- Required environment variable names:
- Deployment date and Git commit:
