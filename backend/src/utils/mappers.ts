import { Application, ApplicationStatus, Job, Notification, NotificationType, Role, User } from "../types";

export function mapUserRow(row: any): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role as Role,
    phone: row.phone ?? null,
    location: row.location ?? null,
    bio: row.bio ?? null,
    avatarColor: row.avatar_color || "#4f46e5",
    skills: row.skills || [],
    headline: row.headline ?? null,
    yearsExperience:
      row.years_experience === null || row.years_experience === undefined
        ? null
        : Number(row.years_experience),
    companyName: row.company_name ?? null,
    companyWebsite: row.company_website ?? null,
    createdAt: row.created_at,
  };
}

/** User fields that are safe to send to the client (no password hash). */
export function toPublicUser(user: User) {
  const { passwordHash, ...publicUser } = user;
  return publicUser;
}

export function mapNotificationRow(row: any): Notification {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type as NotificationType,
    title: row.title,
    message: row.message,
    link: row.link ?? null,
    isRead: row.is_read,
    createdAt: row.created_at,
  };
}

export function mapJobRow(row: any): Job {
  return {
    id: row.id,
    recruiterId: row.recruiter_id,
    title: row.title,
    company: row.company,
    description: row.description,
    requiredSkills: row.required_skills || [],
    minExperienceYears: row.min_experience_years,
    location: row.location,
    createdAt: row.created_at,
  };
}

export function mapApplicationRow(row: any): Application {
  return {
    id: row.id,
    jobId: row.job_id,
    seekerId: row.seeker_id,
    resumeFileName: row.resume_file_name,
    resumeOriginalName: row.resume_original_name,
    matchedSkills: row.matched_skills || [],
    missingSkills: row.missing_skills || [],
    extractedExperienceYears:
      row.extracted_experience_years === null || row.extracted_experience_years === undefined
        ? null
        : Number(row.extracted_experience_years),
    riskScore: row.risk_score,
    matchScore: row.match_score,
    status: row.status as ApplicationStatus,
    appliedAt: row.applied_at,
  };
}
