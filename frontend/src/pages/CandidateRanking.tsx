import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api, { Application, Job } from "../api/api";
import RiskBadge from "../components/RiskBadge";
import ResumeLink from "../components/ResumeLink";
import ScoreRing from "../components/ScoreRing";
import { EmptyState, PageHeader, SkeletonList, initialsOf } from "../components/ui";
import { CheckIcon, ClockIcon, GaugeIcon, SearchIcon, TargetIcon, UsersIcon, XIcon } from "../components/Icons";

const SORT_OPTIONS = [
  { value: "risk_asc", label: "AI Risk: Low to High (best first)" },
  { value: "risk_desc", label: "AI Risk: High to Low" },
  { value: "match_desc", label: "Match Score: High to Low" },
  { value: "match_asc", label: "Match Score: Low to High" },
  { value: "newest", label: "Newest Applications" },
  { value: "oldest", label: "Oldest Applications" },
];

export default function CandidateRanking() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [candidates, setCandidates] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  const jobId = searchParams.get("jobId") || "";
  const status = searchParams.get("status") || "";
  const sort = searchParams.get("sort") || "risk_asc";
  const [search, setSearch] = useState(searchParams.get("search") || "");

  useEffect(() => {
    api.get("/jobs").then((res) => setJobs(res.data));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams(searchParams);
      if (search) params.set("search", search);
      else params.delete("search");
      setSearchParams(params, { replace: true });
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function loadCandidates() {
    setLoading(true);
    try {
      const params: Record<string, string> = { sort };
      if (jobId) params.jobId = jobId;
      if (status) params.status = status;
      if (search) params.search = search;
      const res = await api.get("/applications/candidates", { params });
      setCandidates(res.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCandidates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, status, sort, searchParams.get("search")]);

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    setSearchParams(params, { replace: true });
  }

  async function handleStatusChange(appId: string, newStatus: "accepted" | "rejected") {
    await api.patch(`/applications/${appId}/status`, { status: newStatus });
    loadCandidates();
  }

  const stats = useMemo(() => {
    const total = candidates.length;
    const avgRisk = total
      ? Math.round(candidates.reduce((sum, c) => sum + c.riskScore, 0) / total)
      : 0;
    const avgMatch = total
      ? Math.round(candidates.reduce((sum, c) => sum + c.matchScore, 0) / total)
      : 0;
    const pending = candidates.filter((c) => c.status === "pending").length;
    return { total, avgRisk, avgMatch, pending };
  }, [candidates]);

  return (
    <div className="container">
      <PageHeader
        title="Candidate Ranking"
        subtitle="Every applicant across all of your job postings, ranked by AI risk and match score so you can focus on the strongest candidates first."
      />

      <div className="stat-grid">
        <div className="stat-card">
          <span className="stat-icon">
            <UsersIcon />
          </span>
          <div>
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Candidates shown</div>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon amber">
            <ClockIcon />
          </span>
          <div>
            <div className="stat-value">{stats.pending}</div>
            <div className="stat-label">Pending review</div>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon green">
            <TargetIcon />
          </span>
          <div>
            <div className="stat-value">{stats.avgMatch}%</div>
            <div className="stat-label">Avg match score</div>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon sky">
            <GaugeIcon />
          </span>
          <div>
            <div className="stat-value">{stats.avgRisk}</div>
            <div className="stat-label">Avg AI risk score</div>
          </div>
        </div>
      </div>

      <div className="card filter-bar">
        <div className="form-group">
          <label htmlFor="f-job">Job</label>
          <select id="f-job" value={jobId} onChange={(e) => updateParam("jobId", e.target.value)}>
            <option value="">All jobs</option>
            {jobs.map((j) => (
              <option value={j.id} key={j.id}>
                {j.title} @ {j.company}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="f-status">Status</label>
          <select id="f-status" value={status} onChange={(e) => updateParam("status", e.target.value)}>
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="f-sort">Sort by</label>
          <select id="f-sort" value={sort} onChange={(e) => updateParam("sort", e.target.value)}>
            {SORT_OPTIONS.map((o) => (
              <option value={o.value} key={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="f-search">Search candidates</label>
          <div className="input-icon">
            <SearchIcon />
            <input
              id="f-search"
              className="input"
              placeholder="Name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {loading && <SkeletonList />}
      {!loading && candidates.length === 0 && (
        <EmptyState
          icon={<UsersIcon />}
          title="No candidates match these filters"
          message="Try widening the filters or clearing the search."
        />
      )}

      <div className="ranking-list">
        {!loading &&
          candidates.map((c, idx) => (
            <div className="card ranking-card fade-up" key={c.id}>
              <div className={`rank-number ${idx < 3 ? `r${idx + 1}` : ""}`}>#{idx + 1}</div>
              <div className="ranking-main">
                <div className="ranking-top">
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <span className="avatar avatar-md" style={{ background: "#6366f1" }}>
                      {initialsOf(c.seeker?.name) || "?"}
                    </span>
                    <div>
                      <div className="ranking-name">{c.seeker?.name}</div>
                      <div className="muted small">
                        {c.seeker?.email}
                        {c.seeker?.headline ? ` · ${c.seeker.headline}` : ""}
                      </div>
                    </div>
                  </div>
                  <span className={`badge status status-${c.status}`}>{c.status}</span>
                </div>
                <p className="muted small" style={{ margin: 0 }}>
                  Applied to <strong>{c.job?.title}</strong> @ {c.job?.company}
                </p>

                <div className="ranking-scores">
                  <div className="score-item">
                    <ScoreRing value={c.riskScore} kind="risk" label="AI risk score" />
                    <div className="score-item-label">
                      AI risk score
                      <RiskBadge score={c.riskScore} label="AI Risk Score" />
                    </div>
                  </div>
                  <div className="match-bar-wrap">
                    <div className="match-bar-label">
                      <span>Skill match</span>
                      <span>{c.matchScore}%</span>
                    </div>
                    <div className="match-bar-track">
                      <div className="match-bar-fill" style={{ width: `${c.matchScore}%` }} />
                    </div>
                  </div>
                  <div className="score-item-label">
                    Experience
                    <b>
                      {c.extractedExperienceYears !== null ? `${c.extractedExperienceYears} yrs` : "Not detected"}
                    </b>
                  </div>
                </div>

                <div>
                  {c.matchedSkills.map((s) => (
                    <span className="skill-tag matched" key={s}>
                      <CheckIcon /> {s}
                    </span>
                  ))}
                  {c.missingSkills.map((s) => (
                    <span className="skill-tag missing" key={s}>
                      <XIcon /> {s}
                    </span>
                  ))}
                </div>

                <div className="ranking-footer">
                  <ResumeLink
                    resumeFileName={c.resumeFileName}
                    resumeOriginalName={c.resumeOriginalName}
                  />
                  <div className="applicant-actions">
                    <button
                      className="btn sm success"
                      disabled={c.status === "accepted"}
                      onClick={() => handleStatusChange(c.id, "accepted")}
                    >
                      <CheckIcon /> Accept
                    </button>
                    <button
                      className="btn sm danger"
                      disabled={c.status === "rejected"}
                      onClick={() => handleStatusChange(c.id, "rejected")}
                    >
                      <XIcon /> Reject
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
