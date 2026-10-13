import { useEffect, useMemo, useState } from "react";
import api, { Application, Job } from "../api/api";
import RiskBadge from "../components/RiskBadge";
import ResumeLink from "../components/ResumeLink";
import ScoreRing from "../components/ScoreRing";
import { CompanyTile, EmptyState, PageHeader, SkeletonList } from "../components/ui";
import {
  BriefcaseIcon,
  CheckCircleIcon,
  CheckIcon,
  ClockIcon,
  FileIcon,
  PinIcon,
  SearchIcon,
  UploadIcon,
  XIcon,
} from "../components/Icons";
import { useAuth } from "../context/AuthContext";

export default function SeekerDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"jobs" | "applications">("jobs");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [applyingJobId, setApplyingJobId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState<{ score: number } | null>(null);

  async function loadJobs() {
    const res = await api.get("/jobs");
    setJobs(res.data);
  }

  async function loadApplications() {
    const res = await api.get("/applications/mine");
    setApplications(res.data);
    setAppliedJobIds(new Set(res.data.map((a: Application) => a.jobId)));
  }

  useEffect(() => {
    Promise.allSettled([loadJobs(), loadApplications()]).finally(() => setLoading(false));
  }, []);

  async function handleApply(jobId: string) {
    if (!file) {
      setError("Please choose a resume file (.pdf or .txt) first");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("jobId", jobId);
      formData.append("resume", file);
      const res = await api.post("/applications", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setApplyingJobId(null);
      setFile(null);
      await loadApplications();
      setTab("applications");
      setNotice({ score: res.data.riskScore });
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to submit application");
    } finally {
      setSubmitting(false);
    }
  }

  function cancelApply() {
    setApplyingJobId(null);
    setFile(null);
    setError("");
  }

  const filteredJobs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return jobs;
    return jobs.filter((j) =>
      [j.title, j.company, j.location, ...j.requiredSkills].join(" ").toLowerCase().includes(q)
    );
  }, [jobs, query]);

  const firstName = (user?.name || "").split(" ")[0];

  return (
    <div className="container">
      <PageHeader
        title={firstName ? `Hi ${firstName}, find your next role` : "Find your next role"}
        subtitle="Browse open positions, apply with your resume, and get an instant AI risk score for each application."
      />

      {notice && (
        <div className="banner" role="status">
          <CheckCircleIcon />
          <div>
            <strong>Application submitted.</strong> Your AI risk score for this job is{" "}
            <strong>{notice.score}</strong> (lower is better).
          </div>
          <button className="banner-close" onClick={() => setNotice(null)} aria-label="Dismiss">
            <XIcon />
          </button>
        </div>
      )}

      <div className="toolbar">
        <div className="tabs" role="tablist">
          <button role="tab" aria-selected={tab === "jobs"} className={tab === "jobs" ? "active" : ""} onClick={() => setTab("jobs")}>
            Browse Jobs <span className="count-pill">{jobs.length}</span>
          </button>
          <button
            role="tab"
            aria-selected={tab === "applications"}
            className={tab === "applications" ? "active" : ""}
            onClick={() => setTab("applications")}
          >
            My Applications <span className="count-pill">{applications.length}</span>
          </button>
        </div>
        {tab === "jobs" && (
          <div className="input-icon">
            <SearchIcon />
            <input
              className="input"
              placeholder="Search title, company, skill or location..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        )}
      </div>

      {loading && <SkeletonList />}

      {!loading && tab === "jobs" && (
        <>
          {filteredJobs.length === 0 && (
            <EmptyState
              icon={<BriefcaseIcon />}
              title={jobs.length === 0 ? "No jobs available yet" : "No jobs match your search"}
              message={
                jobs.length === 0
                  ? "New openings will show up here as soon as recruiters post them."
                  : "Try a different keyword or clear the search box."
              }
            />
          )}
          {filteredJobs.map((job) => {
            const alreadyApplied = appliedJobIds.has(job.id);
            const isApplying = applyingJobId === job.id;
            return (
              <div className="card job-card interactive fade-up" key={job.id}>
                <div className="job-head">
                  <CompanyTile name={job.company} />
                  <div className="job-head-main">
                    <h3 className="job-title">{job.title}</h3>
                    <div className="job-company">{job.company}</div>
                    <div className="meta-row">
                      <span>
                        <PinIcon /> {job.location}
                      </span>
                      <span>
                        <ClockIcon /> {job.minExperienceYears}+ yrs experience
                      </span>
                    </div>
                  </div>
                </div>

                <p className="job-desc">{job.description}</p>

                <div>
                  {job.requiredSkills.map((s) => (
                    <span className="skill-tag" key={s}>
                      {s}
                    </span>
                  ))}
                </div>

                {isApplying ? (
                  <div className="apply-panel">
                    <label className={`dropzone ${file ? "has-file" : ""}`}>
                      <input
                        type="file"
                        accept=".pdf,.txt"
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                      />
                      <span className="dropzone-icon">{file ? <FileIcon /> : <UploadIcon />}</span>
                      <span>
                        <strong>{file ? file.name : "Choose your resume"}</strong>
                        <span className="hint">
                          {file ? "Click to choose a different file" : "PDF or TXT for best AI scoring accuracy"}
                        </span>
                      </span>
                    </label>
                    {error && (
                      <p className="error-text" role="alert" style={{ marginTop: 12, marginBottom: 0 }}>
                        {error}
                      </p>
                    )}
                    <div className="apply-actions">
                      <button className="btn" disabled={submitting} onClick={() => handleApply(job.id)}>
                        {submitting ? "Scoring & submitting..." : "Submit Application"}
                      </button>
                      <button className="btn secondary" onClick={cancelApply}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="job-footer">
                    {alreadyApplied ? (
                      <span className="applied-note">
                        <CheckCircleIcon /> You already applied to this job
                      </span>
                    ) : (
                      <span className="muted small">Resume is scored instantly on submit</span>
                    )}
                    {!alreadyApplied && (
                      <button className="btn" onClick={() => setApplyingJobId(job.id)}>
                        Apply with Resume
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}

      {!loading && tab === "applications" && (
        <>
          {applications.length === 0 && (
            <EmptyState
              icon={<FileIcon />}
              title="You haven't applied to any jobs yet"
              message="Head to Browse Jobs, pick a role and apply with your resume. Your scores will appear here."
            />
          )}
          {applications.map((app) => (
            <div className={`card app-card s-${app.status} fade-up`} key={app.id}>
              <div className="app-card-top">
                <div className="job-head" style={{ alignItems: "center" }}>
                  <CompanyTile name={app.job?.company || "?"} />
                  <div className="job-head-main">
                    <h3 className="job-title">{app.job?.title}</h3>
                    <div className="job-company" style={{ marginBottom: 0 }}>
                      {app.job?.company}
                    </div>
                  </div>
                </div>
                <span className={`badge status status-${app.status}`}>{app.status}</span>
              </div>

              <div className="app-card-body">
                <div className="score-item">
                  <ScoreRing value={app.riskScore} kind="risk" label="AI risk score" />
                  <div className="score-item-label">
                    Your AI risk score
                    <RiskBadge score={app.riskScore} label="Your AI Risk Score" />
                  </div>
                </div>
                <div className="score-item">
                  <ScoreRing value={app.matchScore} kind="match" label="Match score" />
                  <div className="score-item-label">
                    Skill match
                    <b>{app.matchScore}%</b>
                  </div>
                </div>
                <div className="score-item-label">
                  Detected experience
                  <b>
                    {app.extractedExperienceYears !== null ? `${app.extractedExperienceYears} yrs` : "Not detected"}
                  </b>
                </div>
              </div>

              <div className="app-skills">
                {app.matchedSkills.map((s) => (
                  <span className="skill-tag matched" key={s}>
                    <CheckIcon /> {s}
                  </span>
                ))}
                {app.missingSkills.map((s) => (
                  <span className="skill-tag missing" key={s}>
                    <XIcon /> {s}
                  </span>
                ))}
              </div>

              <div className="app-foot">
                <ResumeLink
                  resumeFileName={app.resumeFileName}
                  resumeOriginalName={app.resumeOriginalName}
                />
                <span className="muted small">Applied {new Date(app.appliedAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
