import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "./NotificationBell";
import { CompassIcon, GridIcon, LogoutIcon, TrophyIcon } from "./Icons";
import { initialsOf } from "./ui";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  if (!user) return null;

  const home = user.role === "recruiter" ? "/recruiter" : "/seeker";

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link to={home} className="brand">
          <span className="brand-mark">
            <CompassIcon />
          </span>
          <span>
            TalentCompass
            <small>AI Risk Score</small>
          </span>
        </Link>

        <nav className="nav-links">
          <NavLink to={home} end className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
            <GridIcon />
            <span>Dashboard</span>
          </NavLink>
          {user.role === "recruiter" && (
            <NavLink
              to="/recruiter/candidates"
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
            >
              <TrophyIcon />
              <span>Candidates</span>
            </NavLink>
          )}
        </nav>

        <div className="navbar-right">
          <NotificationBell />
          <Link to="/profile" className="navbar-profile" title="Profile settings">
            <span className="avatar avatar-sm" style={{ background: user.avatarColor }}>
              {initialsOf(user.name) || "?"}
            </span>
            <span className="navbar-username">{user.name}</span>
            <span className="role-chip">{user.role}</span>
          </Link>
          <button className="icon-btn" onClick={handleLogout} title="Log out" aria-label="Log out">
            <LogoutIcon />
          </button>
        </div>
      </div>
    </header>
  );
}
