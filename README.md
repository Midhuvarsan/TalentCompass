# Job Portal with AI Risk Score

A simple full-stack job portal where:

- **Recruiters** post jobs (with required skills + minimum experience), view every applicant sorted by **AI risk score**, and accept/reject them.
- **Job Seekers** browse jobs, apply by uploading a resume (PDF or TXT), and instantly see their own **AI risk score** and skill match for that job.

The "AI risk score" is a **rule-based scoring engine** (`backend/src/utils/riskScore.ts`) — no external API key needed, so it runs immediately. It:
1. Extracts text from the uploaded resume (PDF parsing via `pdf-parse`, or plain text).
2. Compares resume content against the job's required skills (matched vs. missing).
3. Tries to detect years of experience mentioned in the resume.
4. Combines these into:
   - `matchScore` (0–100, higher = better fit)
   - `riskScore` (0–100, **lower = safer hire / better fit, higher = riskier**)

You can later swap the internals of `computeRiskScore()` with a real LLM call (Claude/OpenAI API) for deeper semantic analysis — the rest of the app (routes, UI, sorting, accept/reject) doesn't need to change.

## Tech Stack

- **Backend:** Node.js + Express + TypeScript, JWT auth, Multer for file upload, a simple JSON file as the database (`backend/src/data/db.json`) — no external DB setup required.
- **Frontend:** React + TypeScript + Vite, React Router, Axios.

## Project Structure

```
job-portal/
├── backend/
│   ├── src/
│   │   ├── index.ts              # Express app entry
│   │   ├── routes/                # auth, jobs, applications
│   │   ├── middleware/auth.ts     # JWT auth + role guards
│   │   ├── utils/riskScore.ts     # AI risk scoring engine
│   │   ├── utils/extractText.ts   # resume text extraction
│   │   ├── utils/db.ts            # JSON file persistence
│   │   ├── types/                 # shared TS types
│   │   └── data/db.json           # the "database"
│   └── uploads/                   # uploaded resumes
└── frontend/
    └── src/
        ├── pages/                 # Login, Register, RecruiterDashboard, SeekerDashboard
        ├── components/            # Navbar, RiskBadge
        ├── context/AuthContext.tsx
        └── api/api.ts
```

## Setup & Run

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env      # edit JWT_SECRET if you like
npm run dev                # starts on http://localhost:5000
```

### 2. Frontend

In a separate terminal:

```bash
cd frontend
npm install
npm run dev                # starts on http://localhost:5173
```

The frontend dev server proxies `/api/*` requests to `http://localhost:5000` (see `vite.config.ts`), so just open **http://localhost:5173**.

## Using the App

1. Register two accounts: one as **Recruiter**, one as **Job Seeker** (use two different browsers/incognito tabs, or logout/login between).
2. As the recruiter: click **"Post a Job"**, fill in title, company, description, required skills (comma separated, e.g. `React, Node.js, TypeScript, SQL`), and minimum experience.
3. As the seeker: go to **Browse Jobs**, click **"Apply with Resume"**, upload a `.pdf` or `.txt` resume, and submit. You'll immediately see your AI risk score.
4. Back as the recruiter: click **"View Applicants"** on that job — applicants are sorted with the lowest (best) risk score first. You can **Accept** or **Reject** each one.
5. As the seeker: check the **My Applications** tab to see your risk score, matched/missing skills, and current status (pending/accepted/rejected).

## Notes & Possible Extensions

- Resumes are stored on disk under `backend/uploads/`; only `.pdf` and `.txt` are accepted in this demo build (for reliable text extraction). You can extend `extractText.ts` with a `.docx` parser (e.g. `mammoth`) if needed.
- The database is a single JSON file for simplicity — swap `utils/db.ts` for a real database (Postgres/Mongo) without touching the routes' logic much.
- Passwords are hashed with bcrypt; auth uses JWT bearer tokens.
- To use a **real AI model** for scoring (semantic resume understanding instead of keyword matching), replace the body of `computeRiskScore()` in `backend/src/utils/riskScore.ts` with a call to an LLM API, passing the resume text + job requirements and asking it to return a structured risk/match score.
