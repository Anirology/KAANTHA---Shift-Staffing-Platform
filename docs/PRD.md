\# KAANTHA — Product Requirements Document



\*\*Status:\*\* Proposed plan; implementation has not been verified.  

\*\*Team:\*\* Sutherman Aniruththen (Ani) and Sivaneswaran Kajarsan (Kajan)



\## Problem and objective



Businesses need a simple way to fill temporary work shifts. Workers need to find suitable shifts and track their applications. KAANTHA connects them and prevents invalid staffing confirmations.



\## Users



\- \*\*Business:\*\* Creates and manages its own shifts, reviews applicants, accepts or rejects applications, marks attendance, and views reports.

\- \*\*Worker:\*\* Maintains a profile, skills, and dated availability; browses shifts; applies; and tracks outcomes.



\## Required scope



\- Worker and business registration and secure login

\- Backend role and ownership protection

\- Relational worker skills and availability

\- Shift creation, viewing, updating, and cancellation

\- Worker applications and business acceptance/rejection

\- Server-side acceptance checks for required skill, confirmed time overlap, and remaining capacity

\- Validated bulk shift CSV import

\- Three real-data reports with CSV download: staffing, worker hours/earnings, and attendance/completion

\- Responsive React frontend and a tested online deployment



An application starts as `PENDING`. Applying does not confirm a worker. Only a business decision can change it to `ACCEPTED` or `REJECTED`.



\## Acceptance criteria



The team can demonstrate one full journey: a business creates a shift, a worker applies, the business accepts the worker, and the worker sees confirmation. The backend rejects skill mismatch, overlapping accepted shifts, and full capacity. Users cannot perform another role’s actions or modify another user’s protected records. Import errors identify affected CSV rows. Reports use stored data rather than hardcoded examples.



\## Technology



React and Vite frontend; FastAPI, Pydantic, and SQLAlchemy backend; MySQL database; GitHub monorepo. Deploy the frontend to Vercel and use a publicly reachable HTTPS backend with a production database.



\## Priorities and exclusions



Functionality, security, integration, testing, and deployment take priority over visual polish. Ratings, advanced search, and staffing analytics are stretch features after the required scope works. AI/ML features, animations, and complex infrastructure are out of scope.



\## Team ownership



Ani leads database design, backend, API contract, security, business rules, testing, integration, and GitHub review. Kajan leads frontend pages and forms, API integration, UI states, screenshots, and assigned documentation. Both review shared decisions before implementation.

