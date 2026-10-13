import { useState, FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import api, { Role, User } from "../api/api";
import { useAuth } from "../context/AuthContext";
import AuthLayout from "../components/AuthLayout";
import { BriefcaseIcon, UserIcon } from "../components/Icons";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("seeker");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/register", { name, email, password, role });
      const user: User = res.data.user;
      login(user, res.data.token);
      navigate(user.role === "recruiter" ? "/recruiter" : "/seeker");
    } catch (err: any) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <h2>Create your account</h2>
      <p className="sub">Choose how you'll use TalentCompass.</p>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>I am a...</label>
          <div className="role-picker" role="radiogroup" aria-label="Account type">
            <button
              type="button"
              role="radio"
              aria-checked={role === "seeker"}
              className={`role-option ${role === "seeker" ? "selected" : ""}`}
              onClick={() => setRole("seeker")}
            >
              <UserIcon />
              <b>Job Seeker</b>
              <span>Find roles and apply</span>
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={role === "recruiter"}
              className={`role-option ${role === "recruiter" ? "selected" : ""}`}
              onClick={() => setRole("recruiter")}
            >
              <BriefcaseIcon />
              <b>Recruiter</b>
              <span>Post jobs and review</span>
            </button>
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="name">Full name</label>
          <input id="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
          <div className="form-hint">At least 6 characters.</div>
        </div>
        {error && <p className="error-text" role="alert">{error}</p>}
        <button className="btn block" type="submit" disabled={loading}>
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>
      <p className="auth-switch">
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </AuthLayout>
  );
}
