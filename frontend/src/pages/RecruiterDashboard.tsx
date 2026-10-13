import { useEffect, useState, FormEvent } from "react";
import { Link } from "react-router-dom";
import api, { Application, Job } from "../api/api";
import RiskBadge from "../components/RiskBadge";
import ResumeLink from "../components/ResumeLink";
import ScoreRing from "../components/ScoreRing";
import { CompanyTile, EmptyState, PageHeader, SkeletonList, initialsOf } from "../components/ui";
import {
  BriefcaseIcon,
  CheckIcon,
  ClockIcon,
  PinIcon,
  PlusIcon,
  TrashIcon,
  TrophyIcon,
  UsersIcon,
  XIcon,
} from "../components/Icons";

export default function RecruiterDashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [applicants, setApplicants] = useState<Application[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loadingApplicants, setLoadingApplicants] = useState(false);
  const [loadingJobs, setLoadingJobs] = useState(true);

  // form state
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [description, setDescription] = useState("");
  const [skillsInput, setSkillsInput] = useState("");
  const [minExperience, setMinExperience] = useState(0);
  const [location, setLocation] = useState("Remote");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  async function loadJobs() {
    try {
      const res = await api.get("/jobs");
      setJobs(res.data);
    } finally {
      setLoadingJobs(false);
    }
  }

  useEffect(() => {
    loadJobs();
  }, []);

  async function loadApplicants(jobId: string) {
    setSelectedJobId(jobId);
    setLoadingApplicants(true);
    try {
      const res = await api.get(`/applications/job/${jobId}`);
      setApplicants(res.data);
    } finally {
      setLoadingApplicants(false);
    }
  }

  async function handleCreateJob(e: FormEvent) {
    e.preventDefault();
    setError("");
    setCreating(true);
    try {
      const requiredSkills = skillsInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      await api.post("/jobs", {
        title,
        company,
        description,
        requiredSkills,
        minExperienceYears: Number(minExperience),
        location,
      });
      setTitle("");
      setCompany("");
      setDescription("");
      setSkillsInput("");
      setMinExperience(0);
      setLocation("Remote");
      setShowForm(false);
      loadJobs();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to create job");
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteJob(jobId: string) {
    if (!confirm("Delete this job and all its applications?")) return;
    await api.delete(`/jobs/${jobId}`);
    if (selectedJobId === jobId) {
      setSelectedJobId(null);
      setApplicants([]);
    }
    loadJobs();
  }

  async function handleStatusChange(appId: string, status: "accepted" | "rejected") {
    await api.patch(`/applications/${appId}/status`, { status });
    if (selectedJobId) loadApplicants(selectedJobId);
  }

  return (
    <div className="container">
      <PageHeader
        title="Recruiter Dashboard"
        subtitle="Post openings, then review every applicant ranked by their AI risk score."
        actions={
          <>
            <Link className="btn secondary" to="/recruiter/candidates">
              <TrophyIcon /> Candidate Ranking
            </Link>
            <button className="btn" onClick={() => setShowForm((s) => !s)}>
              {showForm ? (
                <>
                  <XIcon /> Cancel
                </>
              ) : (
                <>
                  <PlusIcon /> Post a Job
                </>
              )}
            </button>
          </>
        }
      />

      {showForm && (
        <div className="card fade-up">
          <h3 className="card-title">New job posting</h3>
          <form onSubmit={handleCreateJob}>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="job-title">Job title</label>
                <input id="job-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>
              <div className="form-group">
                <label htmlFor="job-company">Company</label>
                <input id="job-company" value={company} onChange={(e) => setCompany(e.target.value)} required />
              </div>
              <div className="form-group span-2">
                <label htmlFor="job-desc">Description</label>
                <textarea
                  id="job-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>
              <div className="form-group span-2">
                <label htmlFor="job-skills">Required skills</label>
                <input
                  id="job-skills"
                  placeholder="e.g. React, Node.js, TypeScript, SQL"
                  value={skillsInput}
                  onChange={(e) => setSkillsInput(e.target.value)}
                  required
                />
                <div className="form-hint">Separate skills with commas. Resumes are matched against these.</div>
              </div>
              <div className="form-group">
                <label htmlFor="job-exp">Minimum experience (years)</label>
                <input
                  id="job-exp"
                  type="number"
                  min={0}
                  value={minExperience}
                  onChange={(e) => setMinExperience(Number(e.target.value))}
                />
              </div>
              <div className="form-group">
                <label htmlFor="job-loc">Location</label>
                <input id="job-loc" value={location} onChange={(e) => setLocation(e.target.value)} />
              </div>
            </div>
            {error && <p className="error-text" role="alert">{error}</p>}
            <button className="btn" type="submit" disabled={creating}>
              {creating ? "Posting..." : "Post Job"}
            </button>
          </form>
        </div>
      )}

      <div className="section-title">
        Your job postings <span className="count-pill">{jobs.length}</span>
      </div>

      {loadingJobs && <SkeletonList />}
      {!loadingJobs && jobs.length === 0 && (
        <EmptyState
          icon={<BriefcaseIcon />}
          title="No jobs posted yet"
          message="Post your first opening and applicants will appear here, ranked by AI risk score."
        />
      )}

      {jobs.map((job) => (
        <div className="card fade-up" key={job.id}>
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
              <div style={{ marginTop: 8 }}>
                {job.requiredSkills.map((s) => (
                  <span className="skill-tag" key={s}>
                    {s}
                  </span>
                ))}
              </div>
            </div>
            <div className="job-actions">
              <button
                className={`btn sm ${selectedJobId === job.id ? "" : "secondary"}`}
                onClick={() => loadApplicants(job.id)}
              >
                <UsersIcon /> View Applicants
              </button>
              <button className="btn sm danger" onClick={() => handleDeleteJob(job.id)} aria-label="Delete job">
                <TrashIcon /> Delete
              </button>
            </div>
          </div>

          {selectedJobId === job.id && (
            <div className="applicants-panel">
              <div className="section-title" style={{ marginTop: 0 }}>
                Applicants <span className="muted small">sorted by lowest AI risk score first</span>
              </div>
              {loadingApplicants && <SkeletonList count={1} />}
              {!loadingApplicants && applicants.length === 0 && (
                <EmptyState icon={<UsersIcon />} title="No applicants yet" message="Check back soon." />
              )}
              {applicants.map((app) => (
                <div className="applicant" key={app.id}>
                  <div className="applicant-main">
                    <div className="applicant-who">
                      <span className="avatar avatar-md" style={{ background: "#6366f1" }}>
                        {initialsOf(app.seeker?.name) || "?"}
                      </span>
                      <div>
                        <strong>{app.seeker?.name}</strong>
                        <div className="muted small">{app.seeker?.email}</div>
                      </div>
                      <span className={`badge status status-${app.status}`} style={{ marginLeft: "auto" }}>
                        {app.status}
                      </span>
                    </div>

                    <div className="score-panel" style={{ marginBottom: 10 }}>
                      <div className="score-item">
                        <ScoreRing value={app.riskScore} kind="risk" label="AI risk score" size={56} />
                        <div className="score-item-label">
                          AI risk
                          <RiskBadge score={app.riskScore} label="AI Risk Score" />
                        </div>
                      </div>
                      <div className="score-item">
                        <ScoreRing value={app.matchScore} kind="match" label="Match score" size={56} />
                        <div className="score-item-label">
                          Skill match
                          <b>{app.matchScore}%</b>
                        </div>
                      </div>
                      <div className="score-item-label">
                        Detected experience
                        <b>
                          {app.extractedExperienceYears !== null
                            ? `${app.extractedExperienceYears} yrs`
                            : "Not detected"}
                        </b>
                      </div>
                    </div>

                    <div>
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
                    <div style={{ marginTop: 8 }}>
                      <ResumeLink
                        resumeFileName={app.resumeFileName}
                        resumeOriginalName={app.resumeOriginalName}
                      />
                    </div>
                  </div>
                  <div className="applicant-actions">
                    <button
                      className="btn sm success"
                      disabled={app.status === "accepted"}
                      onClick={() => handleStatusChange(app.id, "accepted")}
                    >
                      <CheckIcon /> Accept
                    </button>
                    <button
                      className="btn sm danger"
                      disabled={app.status === "rejected"}
                      onClick={() => handleStatusChange(app.id, "rejected")}
                    >
                      <XIcon /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
