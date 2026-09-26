# Shiftly viva follow-up - understand the code, not just the demo

## Why MySQL?

MySQL is a relational database that fits this app's structured data. Users, workers, businesses, shifts, skills, and applications have clear foreign-key relationships. Transactions and constraints help keep a staffing decision consistent. It is widely used and integrates with Python through SQLAlchemy and PyMySQL. It was a practical choice for the original brief, not the only correct database. The current Vercel setup uses persistent Neon PostgreSQL in production; say this clearly if asked and confirm the hackathon permits it. The isolated tests use SQLite, so test the production database separately.

## Why `index=True` on `users.email` in `models.py`?

An index is a lookup structure maintained by the database. Login runs a query like `SELECT ... FROM users WHERE email = ?`. The index helps the database find that row without scanning every user, especially as the table grows. The trade-off is extra storage and some cost on inserts/updates. `unique=True` has a different purpose: it prevents duplicate emails. A database often builds an index for a unique constraint already, so `index=True` plus `unique=True` may be redundant depending on the database and generated schema. Do not say every field needs an index. For `businesses.user_id`, an ordinary index helps find all businesses owned by one user; it is deliberately **not unique** after the new requirement.

## Why a worker cannot self-accept

1. `POST /auth/register/worker` saves role `WORKER` in the users table.
2. Login issues a signed JWT containing the user ID, not a trusted role supplied by the browser.
3. `get_current_user` verifies the token and loads the role from the database.
4. `get_business` requires role `BUSINESS`; a WORKER request to `PATCH /applications/{id}/accept` receives `403` before the acceptance service runs.
5. For a BUSINESS user, `get_business` also verifies ownership of the selected business. `accept_application` verifies that the application belongs to that business's shift.

The frontend may hide the Accept button from workers, but that is only usability. Backend checks are the protection. A person can still sign up for a separate business account because this hackathon app does not verify real-world company identity. Preventing fraudulent business registrations would require business verification or administrator approval. Do not claim the current code does that.

## One account, two businesses - code trace

- `models/models.py`: `User.businesses` is a one-to-many relationship; `Business.user_id` is indexed, not unique.
- `routers/auth.py`: registration creates the first business; `/auth/me` returns the owned business list.
- `routers/businesses.py`: lists and creates business profiles for a BUSINESS account.
- `dependencies.py`: reads `X-Business-Id`, checks role and ownership, and returns the selected Business object. One-business accounts can omit the header for compatibility.
- `routers/shifts.py`, `imports.py`, `reports.py`: use that Business object to scope records and decisions.
- `services/acceptance.py`: checks that the application belongs to the selected business's shift, then validates skill, overlap, and capacity.
- `frontend/src/services/api.js`: stores the selected business ID for the session and sends it in a header.
- `frontend/src/App.jsx`, `Navigation.jsx`, `BusinessAccounts.jsx`: show the selector, create another business, and refresh the view on a switch.
- `tests/test_business_rules.py`: verifies both businesses have separate shifts and reports; another owner and a worker cannot act as the selected business.

## Practice explaining a line

For each important line, answer four questions: What data comes in? What does this line check or change? What happens if it fails? Which test demonstrates it? Start with `get_current_user`, `get_business`, and `accept_application`. Then trace one request from a React button through `api.js`, a FastAPI router, SQLAlchemy, and the JSON response.
