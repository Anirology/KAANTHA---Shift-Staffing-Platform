\# Shiftly — API Contract v1



\*\*Status:\*\* Agreed implementation contract; endpoints are not claimed as completed.  

\*\*Base path:\*\* `/api/v1`  

\*\*Local backend origin:\*\* `http://127.0.0.1:8000`  

\*\*Frontend environment variable:\*\* `VITE\_API\_BASE\_URL` contains the backend origin only. The frontend API service appends `/api/v1` once.



Ani owns backend contract decisions. Kajan implements frontend calls against this file. Any later shared change must be announced as \*\*SHARED CONTRACT CHANGE\*\* with OLD, NEW, BACKEND IMPACT, FRONTEND IMPACT, DATABASE IMPACT, and DOCUMENTATION IMPACT.



\## Shared conventions



\- Protected requests use `Authorization: Bearer <access\_token>`. Business-scoped requests also use `X-Business-Id` when the account owns multiple businesses.

\- Account roles: `WORKER`, `BUSINESS`.

\- Application statuses: `PENDING`, `ACCEPTED`, `REJECTED`.

\- Shift statuses: `OPEN`, `FILLED`, `COMPLETED`, `CANCELLED`.

\- Attendance statuses: `NOT\_MARKED`, `PRESENT`, `ABSENT`.

\- Dates: `YYYY-MM-DD`. Times: `HH:MM:SS`. Timestamps: ISO 8601.

\- Money in JSON is a decimal \*\*string\*\*, such as `"1500.00"`, representing LKR per shift.

\- The backend derives ownership IDs, protected statuses, accepted counts, remaining slots, and earnings. Ordinary frontend forms must not submit them.

\- Most error responses are `{"detail":"Readable message."}`. Pydantic request validation uses FastAPI’s standard `422` response.



\## Response objects



`Skill`:



```json

{"id": 1, "name": "Cashier", "description": "Handles checkout"}

```



`Availability`:



```json

{

&#x20; "id": 1,

&#x20; "worker\_id": 4,

&#x20; "date": "2026-09-28",

&#x20; "start\_time": "15:00:00",

&#x20; "end\_time": "19:00:00"

}

```



`Shift`:



```json

{

&#x20; "id": 12,

&#x20; "business\_id": 2,

&#x20; "business\_name": "Demo Business",

&#x20; "role": "Cashier",

&#x20; "date": "2026-09-28",

&#x20; "start\_time": "15:00:00",

&#x20; "end\_time": "19:00:00",

&#x20; "required\_workers": 3,

&#x20; "payment": "1500.00",

&#x20; "required\_skill\_id": 1,

&#x20; "required\_skill\_name": "Cashier",

&#x20; "status": "OPEN",

&#x20; "accepted\_count": 1,

&#x20; "remaining\_slots": 2

}

```



`Application`:



```json

{

&#x20; "id": 20,

&#x20; "shift\_id": 12,

&#x20; "worker\_id": 4,

&#x20; "worker\_name": "Example Worker",

&#x20; "status": "PENDING",

&#x20; "applied\_at": "2026-09-23T07:00:00Z",

&#x20; "attendance\_status": null,

&#x20; "rejection\_reason": null

}

```



`description`, `attendance\_status`, and `rejection\_reason` may be `null` where appropriate. Arrays below contain these exact objects.



\## Authentication



| Method and path | Access | Request | Success | Main errors |

|---|---|---|---|---|

| `POST /auth/register/worker` | Public | `{email:string, password:string, name:string}` | `201 {user\_id:int, role:"WORKER"}` | `409` email exists; `422` invalid fields |

| `POST /auth/register/business` | Public | `{email:string, password:string, business\_name:string}` | `201 {user\_id:int, role:"BUSINESS"}` | `409`, `422` |

| `POST /auth/login` | Public | `{email:string, password:string}` | `200 {access\_token:string, token\_type:"bearer", role:string, user\_id:int}` | `401` wrong credentials; `422` |

| `GET /auth/me` | Either logged-in role | No body | `200 {id:int, email:string, role:string, worker\_id:int|null, business\_id:int|null, businesses:Business[]}` | `401` |

| `GET /businesses/me` | BUSINESS | No body | `200 [{id:int, business\_name:string}]` | `401`, `403` |

| `POST /businesses` | BUSINESS | `{business\_name:string}` | `201 {id:int, business\_name:string}` | `401`, `403`, `422` |



Email must be valid and unique; password is required and at least 8 characters. Registration creates the matching worker or business profile. Passwords and password hashes never appear in API responses. For this MVP, frontend logout removes its stored token; there is no server logout route.



\## Skills and worker profile



| Method and path | Access | Request | Success | Main errors |

|---|---|---|---|---|

| `GET /skills` | Either role | No body | `200 Skill\[]` | `401` |

| `GET /workers/me` | WORKER; own profile | No body | `200 {id:int, user\_id:int, name:string, skills:Skill\[], availability:Availability\[]}` | `401`, `403` |

| `PATCH /workers/me` | WORKER; own profile | `{name?:string}` | `200` updated worker profile in the same shape | `401`, `403`, `422` |

| `POST /workers/me/skills` | WORKER; own profile | `{skill\_id:int}` | `201 Skill` | `404` skill missing; `409` already added; `422` |

| `DELETE /workers/me/skills/{skill\_id}` | WORKER; own profile | Path `skill\_id:int`; no body | `204` no body | `404` link missing; `401`, `403` |



Skill names come from the central catalogue. Workers select existing skill IDs; they do not type new free-text skills.



\## Worker availability



| Method and path | Access | Request | Success | Main errors |

|---|---|---|---|---|

| `POST /workers/me/availability` | WORKER | `{date:string, start\_time:string, end\_time:string}` | `201 Availability` | `422` invalid date/time or start not before end |

| `PATCH /workers/me/availability/{id}` | WORKER; owns record | Path `id:int`; any of `{date?, start\_time?, end\_time?}` | `200 Availability` | `403`, `404`, `422` |

| `DELETE /workers/me/availability/{id}` | WORKER; owns record | Path `id:int`; no body | `204` no body | `403`, `404` |



Availability is dated and shown in the UI. In v1, the mandatory acceptance blockers are required skill, confirmed time overlap, and capacity; availability itself is not an additional acceptance blocker.



\## Shifts



| Method and path | Access | Request | Success | Main errors |

|---|---|---|---|---|

| `GET /shifts` | Either role | Optional query: `role:string`, `skill\_id:int`, `date:YYYY-MM-DD`, `min\_payment:decimal`, `status:shift status` | `200 Shift\[]` | `401`, `422` invalid query |

| `GET /shifts/{shift\_id}` | Either role; protected visibility | Path `shift\_id:int` | `200 Shift` | `401`, `404` |

| `GET /businesses/me/shifts` | BUSINESS; own shifts | No body | `200 Shift\[]` | `401`, `403` |

| `POST /shifts` | BUSINESS | `{role:string, date:string, start\_time:string, end\_time:string, required\_workers:int, payment:decimal string, required\_skill\_id:int}` | `201 Shift` | `401`, `403`, `404` skill missing, `422` |

| `PATCH /shifts/{shift\_id}` | Owning BUSINESS | Any editable fields from the POST body | `200 Shift` | `403` not owner; `404`; `409` invalid state/capacity; `422` |

| `DELETE /shifts/{shift\_id}` | Owning BUSINESS | No body; cancels rather than erases | `204` no body | `403`, `404`, `409` invalid state |



The shift `role` means job title, such as “Cashier”; it is not the account role. `required\_workers` must be greater than zero, payment cannot be negative, and start time must precede end time. The v1 shift starts and ends on one date. `business\_id`, `status`, `accepted\_count`, and `remaining\_slots` are backend-controlled.



Workers browse open shifts and may see details of shifts they applied to. Businesses use `/businesses/me/shifts` for their own management view. Completed or cancelled shifts cannot be edited. `required\_workers` cannot be reduced below the accepted count.



\## Applications, acceptance, and attendance



| Method and path | Access | Request | Success | Main errors |

|---|---|---|---|---|

| `POST /shifts/{shift\_id}/applications` | WORKER | Path `shift\_id:int`; no body | `201 Application` with `PENDING` | `403`; `404` shift; `409` duplicate or not open |

| `GET /workers/me/applications` | WORKER; own records | Optional `status:application status` | `200 Application\[]` | `401`, `403`, `422` |

| `GET /shifts/{shift\_id}/applications` | Owning BUSINESS | Path `shift\_id:int` | `200 Application\[]` | `403`, `404` |

| `PATCH /applications/{id}/accept` | Owning BUSINESS | Path `id:int`; no body | `200 Application` with `ACCEPTED` | `403`, `404`, `409` state, skill, overlap, or capacity |

| `PATCH /applications/{id}/reject` | Owning BUSINESS | Path `id:int`; `{reason?:string}` | `200 Application` with `REJECTED` | `403`, `404`, `409` invalid state |

| `PATCH /applications/{id}/attendance` | Owning BUSINESS | Path `id:int`; `{status:"PRESENT"|"ABSENT"}` | `200 Application` with updated `attendance\_status` | `403`, `404`, `409` not accepted |

| `PATCH /shifts/{shift\_id}/complete` | Owning BUSINESS | Path `shift\_id:int`; no body | `200 Shift` with `COMPLETED` | `403`, `404`, `409` invalid state or unmarked attendance |



Only `PENDING` applications may be accepted or rejected. A failed acceptance leaves the application `PENDING`. The accept operation must run its checks and update in one transaction:



1\. Verify the business owns the shift.

2\. Require a `PENDING` application and an `OPEN` shift.

3\. Verify the worker has `required\_skill\_id` in `worker\_skills`.

4\. Reject an overlap with another accepted shift on the same date when `new\_start < existing\_end AND new\_end > existing\_start`. Pending applications do not count.

5\. Reject when the accepted count is already at `required\_workers`.

6\. Set the application `ACCEPTED`; set the shift `FILLED` when capacity is reached.



Skill mismatch, overlap, and capacity failures all use `409 Conflict` with a readable `detail` message. Acceptance creates an attendance record initially marked `NOT\_MARKED`. A shift is completed only after its accepted workers’ attendance is marked.



\## Bulk shift CSV import



`POST /shifts/import` — BUSINESS only; request is `multipart/form-data` with file field named `file`.



Required CSV headers:



```text

role,date,start\_time,end\_time,required\_workers,payment,required\_skill\_id

```



The server validates the file, headers, field values, skill IDs, positive worker count, non-negative payment, and same-day time range. It creates valid rows and reports invalid rows; it never silently skips them.



Processed-file response, `200`:



```json

{

&#x20; "total\_rows": 10,

&#x20; "created": 8,

&#x20; "failed": 2,

&#x20; "errors": \[

&#x20;   {"row": 4, "field": "required\_skill\_id", "message": "Skill does not exist."}

&#x20; ]

}

```



An unusable file or wrong headers return `400`; unauthenticated or wrong-role requests return `401` or `403`. The owning business is derived from the token, not the CSV.



\## Business reports and CSV exports



All reports are limited to the logged-in business’s shifts. Every endpoint accepts optional `from\_date` and `to\_date` query parameters in `YYYY-MM-DD` format. Exports use the same filters as the displayed JSON data.



| JSON endpoint → `200` array | CSV endpoint → `200 text/csv` download | Fields in each row and CSV header |

|---|---|---|

| `GET /reports/staffing` | `GET /reports/staffing/export` | `shift\_id, role, date, required\_workers, confirmed\_workers, remaining\_slots, status, payment` |

| `GET /reports/workers` | `GET /reports/workers/export` | `worker\_id, worker\_name, completed\_shifts, total\_hours, total\_earnings` |

| `GET /reports/attendance` | `GET /reports/attendance/export` | `worker\_id, worker\_name, shift\_id, role, date, application\_status, attendance\_status, completion\_status, rejection\_reason` |



`payment` and `total\_earnings` are decimal strings. `total\_hours` is a decimal number. Worker hours and earnings count `PRESENT` workers on `COMPLETED` shifts. `rejection\_reason` may be null and comes from an actual business rejection. Failed acceptance attempts are not saved as fake “conflict history.” Report endpoints return `401` or `403` for unauthorized access and `422` for invalid filters.



\## Frontend and deployment handoff



The frontend calls the API through one service file. Local `VITE\_API\_BASE\_URL` is `http://127.0.0.1:8000`; production uses the publicly reachable HTTPS backend origin. Never hardcode localhost throughout components. Backend CORS must allow the local frontend origin and the actual Vercel domain. The Vercel project’s root directory is `frontend`; build command is `npm run build`; output directory is `dist`.



Ratings, advanced analytics, and skill-catalogue import have no v1 frontend endpoint contract. Define and announce their contracts before building those bonus screens.

## SHARED CONTRACT CHANGE - multiple businesses per BUSINESS account (2026-09-26)

OLD: A BUSINESS account owned exactly one `businesses` row. `GET /auth/me` returned a single `business_id`; business actions inferred that business automatically.

NEW: A BUSINESS account may own multiple `businesses` rows. `GET /auth/me` retains `business_id` as the first business for compatibility and adds `businesses: [{"id": 1, "business_name": "Name"}]`. `GET /businesses/me` lists owned businesses. `POST /businesses` with `{"business_name": "Name"}` creates another business (`201`). For any business-scoped action, send `X-Business-Id: <id>`. If the account owns exactly one business, an omitted header still selects it; with multiple businesses, an omitted header returns `400`. A header naming a business owned by another user returns `403`. The authenticated user, not the header alone, determines ownership.

BACKEND IMPACT: `get_business` validates the selected business for shift creation/management, applicant decisions, import, and reports. Workers still receive `403` on business-only endpoints. `GET /shifts/{id}` uses the selected business for a BUSINESS account.

FRONTEND IMPACT: The navigation shows the active business and allows switching. The Businesses page creates another profile. The central API client sends `X-Business-Id` with protected requests. Switching returns to Manage Shifts so data refreshes under the chosen business.

DATABASE IMPACT: `businesses.user_id` is a non-unique indexed foreign key. Existing MySQL or PostgreSQL databases must remove the old unique rule before a second business can be created; `create_all` alone does not migrate it. See `backend/migrations/allow_multiple_businesses.py` and back up before running it.

DOCUMENTATION IMPACT: The database relationship is now USERS one-to-many BUSINESSES. Update examples, demo steps, and production migration notes together. The existing WORKER-versus-BUSINESS account roles remain unchanged.

