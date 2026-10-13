export type Role = "recruiter" | "seeker";

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
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
  createdAt: string;
}

export type NotificationType =
  | "new_application"
  | "application_status"
  | "general";

export interface Notification {
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
}
