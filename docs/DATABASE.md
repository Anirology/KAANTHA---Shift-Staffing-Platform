\# KAANTHA — Database Design



\*\*Status:\*\* Planned schema; tables are not yet confirmed as implemented.  

\*\*Database:\*\* MySQL. IDs are database-generated, auto-incrementing integers.



\## Tables



Unless marked nullable, fields are required.



| Table | Fields |

|---|---|

| `users` | `id` INT PK; `email` VARCHAR(255) UNIQUE; `password\_hash` VARCHAR(255); `role` VARCHAR(20) |

| `workers` | `id` INT PK; `user\_id` INT FK UNIQUE; `name` VARCHAR(100) |

| `businesses` | `id` INT PK; `user\_id` INT FK UNIQUE; `business\_name` VARCHAR(150) |

| `skills` | `id` INT PK; `name` VARCHAR(100) UNIQUE; `description` TEXT nullable |

| `worker\_skills` | `worker\_id` INT FK; `skill\_id` INT FK; composite PK (`worker\_id`, `skill\_id`) |

| `worker\_availability` | `id` INT PK; `worker\_id` INT FK; `date` DATE; `start\_time` TIME; `end\_time` TIME |

| `shifts` | `id` INT PK; `business\_id` INT FK; `role` VARCHAR(100); `date` DATE; `start\_time` TIME; `end\_time` TIME; `required\_workers` INT; `payment` DECIMAL(10,2); `required\_skill\_id` INT FK; `status` VARCHAR(20), default `OPEN` |

| `applications` | `id` INT PK; `shift\_id` INT FK; `worker\_id` INT FK; `status` VARCHAR(20), default `PENDING`; `applied\_at` DATETIME; `rejection\_reason` VARCHAR(255) nullable; UNIQUE (`worker\_id`, `shift\_id`) |

| `attendance` | `id` INT PK; `application\_id` INT FK UNIQUE; `status` VARCHAR(20), default `NOT\_MARKED` |



`password\_hash` stores a hash, never the original password. `business\_id` and `worker\_id` on protected records come from the authenticated user, not an ordinary form field.



\## Relationships



\- One `users` record has one role-specific profile: either `workers` or `businesses`.

\- One business posts many shifts.

\- One skill can be required by many shifts.

\- Workers and skills have a many-to-many relationship through `worker\_skills`.

\- One worker has many dated availability periods and applications.

\- One shift has many applications.

\- An accepted application may have one attendance record.



\## ER diagram



```mermaid

%%{init: {"theme":"base","themeVariables":{"primaryColor":"#DDF4F1","primaryTextColor":"#17313A","primaryBorderColor":"#0F4C5C","lineColor":"#0E8F88","background":"#F8FBFA"}}}%%

erDiagram

&#x20;   USERS ||--o| WORKERS : has

&#x20;   USERS ||--o| BUSINESSES : has

&#x20;   BUSINESSES ||--o{ SHIFTS : posts

&#x20;   SKILLS ||--o{ SHIFTS : required\_by

&#x20;   WORKERS ||--o{ WORKER\_SKILLS : has

&#x20;   SKILLS ||--o{ WORKER\_SKILLS : links

&#x20;   WORKERS ||--o{ WORKER\_AVAILABILITY : sets

&#x20;   WORKERS ||--o{ APPLICATIONS : submits

&#x20;   SHIFTS ||--o{ APPLICATIONS : receives

&#x20;   APPLICATIONS ||--o| ATTENDANCE : records



&#x20;   USERS {

&#x20;       int id PK

&#x20;       varchar email UK

&#x20;       varchar password\_hash

&#x20;       varchar role

&#x20;   }

&#x20;   WORKERS {

&#x20;       int id PK

&#x20;       int user\_id FK

&#x20;       varchar name

&#x20;   }

&#x20;   BUSINESSES {

&#x20;       int id PK

&#x20;       int user\_id FK

&#x20;       varchar business\_name

&#x20;   }

&#x20;   SKILLS {

&#x20;       int id PK

&#x20;       varchar name UK

&#x20;       text description

&#x20;   }

&#x20;   WORKER\_SKILLS {

&#x20;       int worker\_id PK

&#x20;       int skill\_id PK

&#x20;   }

&#x20;   WORKER\_AVAILABILITY {

&#x20;       int id PK

&#x20;       int worker\_id FK

&#x20;       date date

&#x20;       time start\_time

&#x20;       time end\_time

&#x20;   }

&#x20;   SHIFTS {

&#x20;       int id PK

&#x20;       int business\_id FK

&#x20;       varchar role

&#x20;       date date

&#x20;       time start\_time

&#x20;       time end\_time

&#x20;       int required\_workers

&#x20;       decimal payment

&#x20;       int required\_skill\_id FK

&#x20;       varchar status

&#x20;   }

&#x20;   APPLICATIONS {

&#x20;       int id PK

&#x20;       int shift\_id FK

&#x20;       int worker\_id FK

&#x20;       varchar status

&#x20;       datetime applied\_at

&#x20;       varchar rejection\_reason

&#x20;   }

&#x20;   ATTENDANCE {

&#x20;       int id PK

&#x20;       int application\_id FK

&#x20;       varchar status

&#x20;   }

```



\## Constraints and rules



\- Account roles: `WORKER`, `BUSINESS`.

\- Application statuses: `PENDING`, `ACCEPTED`, `REJECTED`.

\- Shift statuses: `OPEN`, `FILLED`, `COMPLETED`, `CANCELLED`.

\- Attendance statuses: `NOT\_MARKED`, `PRESENT`, `ABSENT`.

\- `required\_workers` must be greater than zero; `payment` cannot be negative.

\- `start\_time` must be earlier than `end\_time`. The first version supports same-day shifts only.

\- Availability uses a specific `date`; a worker may have multiple availability periods.

\- Payment is in LKR \*\*per shift\*\*, not per hour.

\- Only accepted applications count as confirmed staffing. Their count determines whether a shift becomes `FILLED`.

\- Acceptance must check required skill, overlap with other accepted shifts on the same date, and remaining capacity in one transaction.

\- Failed acceptance leaves the application `PENDING`.

\- Cancelling a shift preserves its row and application history by setting status `CANCELLED`.

\- `applied\_at` is stored as a UTC timestamp.



\## Reports



Reports calculate values from these tables. `accepted\_count`, `remaining\_slots`, completed hours, and earnings are calculated values; they are not extra columns in `shifts` or `workers`. Earnings count workers marked `PRESENT` on `COMPLETED` shifts.



Ratin

