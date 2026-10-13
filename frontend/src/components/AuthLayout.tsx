import { ReactNode } from "react";
import { CompassIcon, GaugeIcon, ShieldIcon, TargetIcon } from "./Icons";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-shell">
      <aside className="auth-hero">
        <div className="brand">
          <span className="brand-mark">
            <CompassIcon />
          </span>
          <span>
            TalentCompass
            <small>AI Risk Score</small>
          </span>
        </div>

        <div>
          <h1>
            Hire with <em>clarity</em>, not guesswork.
          </h1>
          <p className="lead">
            Every application is scored against the role the moment it lands, so recruiters see the
            strongest candidates first and seekers know exactly where they stand.
          </p>
          <ul className="feature-list">
            <li>
              <span className="feature-icon">
                <GaugeIcon />
              </span>
              <div>
                <b>AI risk scoring</b>
                <span>Resume-to-role risk calculated instantly on every application.</span>
              </div>
            </li>
            <li>
              <span className="feature-icon">
                <TargetIcon />
              </span>
              <div>
                <b>Skill match breakdown</b>
                <span>See matched and missing skills at a glance.</span>
              </div>
            </li>
            <li>
              <span className="feature-icon">
                <ShieldIcon />
              </span>
              <div>
                <b>Private by design</b>
                <span>Resumes are only visible to the applicant and the hiring recruiter.</span>
              </div>
            </li>
          </ul>
        </div>

        <div className="auth-foot">© {new Date().getFullYear()} TalentCompass</div>
      </aside>

      <main className="auth-panel">
        <div className="auth-box">
          <div className="brand brand-mobile">
            <span className="brand-mark">
              <CompassIcon />
            </span>
            <span>TalentCompass</span>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
