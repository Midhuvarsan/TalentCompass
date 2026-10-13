import axios from "axios";

const api = axios.create({ baseURL: "/api" });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;

/**
 * Resume files are served from an authenticated endpoint (the backend
 * checks the JWT to make sure only the owning seeker or the job's
 * recruiter can access them), so a plain `<a href="...">` won't work -
 * the browser navigation has no Authorization header and the request
 * just gets rejected with 401. Instead we fetch the file as a blob
 * through axios (which does attach the header) and hand the browser an
 * in-memory blob: URL to view or download.
 */
export async function fetchResumeBlob(resumeFileName: string): Promise<Blob> {
  const res = await api.get(`/applications/resume/${resumeFileName}`, {
    responseType: "blob",
  });
  return res.data;
}

/** Opens a resume in a new tab so the browser can preview the PDF/text inline. */
export async function viewResume(resumeFileName: string): Promise<void> {
  // Open the tab synchronously (before the await) so browsers don't treat
  // it as an unsolicited popup and block it.
  const newTab = window.open("", "_blank");
  try {
    const blob = await fetchResumeBlob(resumeFileName);
    const url = URL.createObjectURL(blob);
    if (newTab) {
      newTab.location.href = url;
    } else {
      window.open(url, "_blank");
    }
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (err) {
    if (newTab) newTab.close();
    throw err;
  }
}

/** Downloads a resume to the user's device with its original file name. */
export async function downloadResume(
  resumeFileName: string,
  originalFileName: string
): Promise<void> {
  const blob = await fetchResumeBlob(resumeFileName);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = originalFileName || resumeFileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5_000);
}

export type Role = "recruiter" | "seeker";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone: string | null;
  location: string | null;
  bio: string | null;
  avatarColor: string;
  skills: string[];
  headline: string | null;
  yearsExperience: number | null;
  companyName: string | null;
  companyWebsite: string | null;
  createdAt?: string;
}

export type NotificationType = "new_application" | "application_status" | "general";

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface Job {
  id: string;
  recruiterId: string;
  title: string;
  company: string;
  description: string;
  requiredSkills: string[];
  minExperienceYears: number;
  location: string;
  createdAt: string;
}

export type ApplicationStatus = "pending" | "accepted" | "rejected";

export interface Application {
  id: string;
  jobId: string;
  seekerId: string;
  resumeFileName: string;
  resumeOriginalName: string;
  matchedSkills: string[];
  missingSkills: string[];
  extractedExperienceYears: number | null;
  riskScore: number;
  matchScore: number;
  status: ApplicationStatus;
  appliedAt: string;
  job?: Job | null;
  seeker?: {
    id: string;
    name: string;
    email: string;
    headline?: string | null;
    yearsExperience?: number | null;
  } | null;
}
