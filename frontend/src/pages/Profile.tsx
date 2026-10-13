import { useState, FormEvent } from "react";
import api from "../api/api";
import { useAuth } from "../context/AuthContext";
import { PageHeader, initialsOf } from "../components/ui";
import { BuildingIcon, PinIcon } from "../components/Icons";

const AVATAR_COLORS = ["#4f46e5", "#0891b2", "#16a34a", "#d97706", "#dc2626", "#7c3aed", "#db2777"];

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [location, setLocation] = useState(user?.location || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [avatarColor, setAvatarColor] = useState(user?.avatarColor || "#4f46e5");
  // seeker-only
  const [headline, setHeadline] = useState(user?.headline || "");
  const [skillsInput, setSkillsInput] = useState((user?.skills || []).join(", "));
  const [yearsExperience, setYearsExperience] = useState(user?.yearsExperience ?? "");
  // recruiter-only
  const [companyName, setCompanyName] = useState(user?.companyName || "");
  const [companyWebsite, setCompanyWebsite] = useState(user?.companyWebsite || "");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name,
        phone: phone || null,
        location: location || null,
        bio: bio || null,
        avatarColor,
      };
      if (user!.role === "seeker") {
        payload.headline = headline || null;
        payload.skills = skillsInput
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        payload.yearsExperience = yearsExperience === "" ? null : Number(yearsExperience);
      } else {
        payload.companyName = companyName || null;
        payload.companyWebsite = companyWebsite || null;
      }

      const res = await api.put("/users/me", payload);
      updateUser({ ...user!, ...res.data });
      setSuccess("Profile updated.");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  const initials = initialsOf(name);

  return (
    <div className="container">
      <PageHeader title="Profile Settings" subtitle="Keep your details current so recruiters and candidates see the right information." />
      <div className="profile-layout">
        <div className="card profile-preview">
          <div className="profile-cover" />
          <div className="profile-preview-body">
            <div className="avatar avatar-lg" style={{ background: avatarColor }}>
              {initials || "?"}
            </div>
            <h3>{name || "Your name"}</h3>
            <p className="muted" style={{ margin: 0 }}>
              {user.role === "recruiter" ? companyName || "Recruiter" : headline || "Job seeker"}
            </p>
            <p className="muted small" style={{ marginTop: 10 }}>{user.email}</p>
            {(location || (user.role === "recruiter" && companyName)) && (
              <div className="meta-row" style={{ justifyContent: "center", marginTop: 4 }}>
                {location && (
                  <span>
                    <PinIcon /> {location}
                  </span>
                )}
                {user.role === "recruiter" && companyName && (
                  <span>
                    <BuildingIcon /> {companyName}
                  </span>
                )}
              </div>
            )}
            <div className="avatar-color-picker">
              {AVATAR_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`avatar-swatch ${avatarColor === c ? "selected" : ""}`}
                  style={{ background: c }}
                  onClick={() => setAvatarColor(c)}
                  aria-label={`Choose color ${c}`}
                  aria-pressed={avatarColor === c}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="card profile-form">
          <form onSubmit={handleSubmit}>
            <div className="form-section-title">Basic information</div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="p-name">Full name</label>
                <input id="p-name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label htmlFor="p-phone">Phone</label>
                <input id="p-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Optional" />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="p-loc">Location</label>
              <input
                id="p-loc"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="City, Country"
              />
            </div>
            <div className="form-group">
              <label htmlFor="p-bio">Bio</label>
              <textarea
                id="p-bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="A short introduction about yourself"
              />
            </div>

            {user.role === "seeker" ? (
              <>
                <div className="form-section-title">Job seeker details</div>
                <div className="form-group">
                  <label htmlFor="p-headline">Headline</label>
                  <input
                    id="p-headline"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    placeholder="e.g. Senior Frontend Engineer"
                  />
                </div>
                <div className="form-row">
                  <div className="form-group grow">
                    <label htmlFor="p-skills">Skills (comma separated)</label>
                    <input
                      id="p-skills"
                      value={skillsInput}
                      onChange={(e) => setSkillsInput(e.target.value)}
                      placeholder="React, Node.js, SQL"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="p-years">Years of experience</label>
                    <input
                      id="p-years"
                      type="number"
                      min={0}
                      value={yearsExperience}
                      onChange={(e) =>
                        setYearsExperience(e.target.value === "" ? "" : Number(e.target.value))
                      }
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="form-section-title">Company details</div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="p-company">Company name</label>
                    <input id="p-company" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="p-site">Company website</label>
                    <input
                      id="p-site"
                      value={companyWebsite}
                      onChange={(e) => setCompanyWebsite(e.target.value)}
                      placeholder="https://"
                    />
                  </div>
                </div>
              </>
            )}

            {error && <p className="error-text" role="alert">{error}</p>}
            {success && <p className="success-text" role="status">{success}</p>}
            <button className="btn" type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save changes"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
