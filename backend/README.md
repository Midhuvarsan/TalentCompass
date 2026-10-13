# Job Portal Backend — Node + Express + TypeScript + PostgreSQL

Backend-only API for a job portal with two roles:

- **Recruiters** post jobs (title, required skills, minimum experience) and view every applicant for a job, sorted by **AI risk score**, with accept/reject actions.
- **Job Seekers** browse jobs and apply by uploading a resume (`.pdf` or `.txt`). The API instantly computes a risk/match score for that application.

Data is stored in **PostgreSQL** (tables: `users`, `jobs`, `applications`). The schema is created automatically on startup from `src/db/schema.sql` — no manual migration step needed.

## AI Risk Scoring

`src/utils/riskScore.ts` is a rule-based scoring engine (no external API key required):

1. Extracts resume text (PDF via `pdf-parse`, or plain text).
2. Compares it against the job's `requiredSkills` → matched vs. missing skills.
3. Attempts to detect years of experience mentioned in the resume.
4. Produces:
   - `matchScore` (0–100, higher = better fit)
   - `riskScore` (0–100, **lower = safer hire, higher = riskier**)

Swap the body of `computeRiskScore()` with a real LLM call later (Claude/OpenAI) for semantic scoring — the rest of the app (routes, DB, sorting) doesn't need to change.

## Requirements

- Node.js 18+
- A running PostgreSQL instance (14+ recommended)

## Setup

### 1. Start PostgreSQL

**Option A — Docker (easiest):**
```bash
docker compose up -d
```
This starts Postgres on `localhost:5432` with user `postgres` / password `postgres` / database `job_portal` (see `docker-compose.yml`).

**Option B — your own Postgres install:**
Create a database, e.g.:
```sql
CREATE DATABASE job_portal;
```

### 2. Configure environment

```bash
cp .env.example .env
```
Edit `.env` if your Postgres credentials differ from the defaults. You can set either a single `DATABASE_URL`, or the individual `PGHOST` / `PGPORT` / `PGUSER` / `PGPASSWORD` / `PGDATABASE` variables.

### 3. Install & run

```bash
npm install
npm run dev
```

On startup the server runs `src/db/schema.sql` automatically (safe to run repeatedly — uses `CREATE TABLE IF NOT EXISTS`), then listens on `http://localhost:5000`.

Check it's alive:
```bash
curl http://localhost:5000/api/health
```

## API Reference

All endpoints are under `/api`. Protected routes require `Authorization: Bearer <token>`.

### Auth
| Method | Path | Body | Notes |
|---|---|---|---|
| POST | `/api/auth/register` | `{ name, email, password, role }` | `role` is `"recruiter"` or `"seeker"` |
| POST | `/api/auth/login` | `{ email, password }` | Returns `{ token, user }` |

### Jobs
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/jobs` | recruiter | `{ title, company, description, requiredSkills[], minExperienceYears, location }` |
| GET | `/api/jobs` | any | Recruiters see only their own jobs; seekers see all jobs |
| GET | `/api/jobs/:id` | any | Single job |
| DELETE | `/api/jobs/:id` | recruiter (owner) | Cascades and deletes its applications |

### Applications
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/applications` | seeker | `multipart/form-data`: `jobId` + `resume` file (.pdf/.txt). Computes and stores the risk score. |
| GET | `/api/applications/mine` | seeker | Own applications with risk scores + job details |
| GET | `/api/applications/job/:jobId` | recruiter (owner) | All applicants for a job, sorted by **lowest risk first** |
| PATCH | `/api/applications/:id/status` | recruiter (owner) | `{ status: "accepted" \| "rejected" \| "pending" }` |
| GET | `/api/applications/resume/:filename` | seeker (own) or recruiter (owner) | Streams the resume file |

## Project Structure

```
backend/
├── docker-compose.yml        # local Postgres for development
├── src/
│   ├── index.ts               # Express app entry, runs schema on boot
│   ├── db/
│   │   ├── pool.ts            # pg Pool (reads DATABASE_URL or PG* env vars)
│   │   ├── init.ts            # runs schema.sql on startup
│   │   └── schema.sql         # users / jobs / applications tables
│   ├── routes/                # auth, jobs, applications
│   ├── middleware/auth.ts     # JWT auth + role guards
│   ├── utils/
│   │   ├── riskScore.ts       # AI risk scoring engine
│   │   ├── extractText.ts     # resume text extraction
│   │   └── mappers.ts         # DB row (snake_case) -> API object (camelCase)
│   └── types/                 # shared TS types
└── uploads/                    # uploaded resumes (gitignored)
```

## Quick Test (curl)

```bash
# Register a recruiter
curl -X POST localhost:5000/api/auth/register -H "Content-Type: application/json" \
  -d '{"name":"Rita","email":"rita@co.com","password":"pass123","role":"recruiter"}'

# Register a seeker
curl -X POST localhost:5000/api/auth/register -H "Content-Type: application/json" \
  -d '{"name":"Sam","email":"sam@seeker.com","password":"pass123","role":"seeker"}'

# Post a job (use the recruiter's token)
curl -X POST localhost:5000/api/jobs -H "Content-Type: application/json" \
  -H "Authorization: Bearer <RECRUITER_TOKEN>" \
  -d '{"title":"Backend Engineer","company":"Acme","description":"Build APIs","requiredSkills":["Node.js","TypeScript","SQL"],"minExperienceYears":2}'

# Apply with a resume (use the seeker's token)
curl -X POST localhost:5000/api/applications \
  -H "Authorization: Bearer <SEEKER_TOKEN>" \
  -F "jobId=<JOB_ID>" -F "resume=@resume.txt"
```

## Notes

- Passwords are hashed with bcrypt; auth uses JWT bearer tokens (7-day expiry).
- Only `.pdf` and `.txt` resumes are accepted for reliable text extraction; add a `.docx` parser (e.g. `mammoth`) in `utils/extractText.ts` if needed.
- `required_skills`, `matched_skills`, and `missing_skills` are stored as native Postgres `TEXT[]` columns.
- This is backend-only — pair it with any frontend (or tools like Postman/curl) by pointing requests at `http://localhost:5000/api`.
