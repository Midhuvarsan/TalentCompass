import { pool } from "../db/pool";
import { Application, ApplicationStatus } from "../types";
import { mapApplicationRow, mapJobRow } from "../utils/mappers";

export interface CandidateResult extends Application {
  job: ReturnType<typeof mapJobRow>;
  seeker: {
    id: string;
    name: string;
    email: string;
    headline: string | null;
    yearsExperience: number | null;
  };
}

export interface EnrichedApplication extends Application {
  job: ReturnType<typeof mapJobRow>;
}

export class ApplicationRepository {
  async findByJobAndSeeker(
    jobId: string,
    seekerId: string
  ): Promise<Application | null> {
    const result = await pool.query(
      "SELECT * FROM applications WHERE job_id = $1 AND seeker_id = $2",
      [jobId, seekerId]
    );
    if (result.rows.length === 0) return null;
    return mapApplicationRow(result.rows[0]);
  }

  async create(data: {
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
  }): Promise<Application> {
    const result = await pool.query(
      `INSERT INTO applications
        (id, job_id, seeker_id, resume_file_name, resume_original_name,
         matched_skills, missing_skills, extracted_experience_years,
         risk_score, match_score, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending')
       RETURNING *`,
      [
        data.id,
        data.jobId,
        data.seekerId,
        data.resumeFileName,
        data.resumeOriginalName,
        data.matchedSkills,
        data.missingSkills,
        data.extractedExperienceYears,
        data.riskScore,
        data.matchScore,
      ]
    );
    return mapApplicationRow(result.rows[0]);
  }

  async findBySeekerId(seekerId: string): Promise<EnrichedApplication[]> {
    const result = await pool.query(
      `SELECT a.*,
              row_to_json(j.*) AS job_row
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       WHERE a.seeker_id = $1
       ORDER BY a.applied_at DESC`,
      [seekerId]
    );

    return result.rows.map((row) => ({
      ...mapApplicationRow(row),
      job: mapJobRow(row.job_row),
    }));
  }

  async findCandidates(
    recruiterId: string,
    filters: { jobId?: string; status?: string; search?: string; sort?: string }
  ): Promise<CandidateResult[]> {
    const conditions: string[] = ["j.recruiter_id = $1"];
    const params: any[] = [recruiterId];

    if (filters.jobId) {
      params.push(filters.jobId);
      conditions.push(`a.job_id = $${params.length}`);
    }
    if (
      filters.status &&
      ["pending", "accepted", "rejected"].includes(filters.status)
    ) {
      params.push(filters.status);
      conditions.push(`a.status = $${params.length}`);
    }
    if (filters.search) {
      params.push(`%${filters.search.toLowerCase()}%`);
      conditions.push(
        `(lower(u.name) LIKE $${params.length} OR lower(u.email) LIKE $${params.length})`
      );
    }

    let orderBy = "a.risk_score ASC, a.match_score DESC";
    if (filters.sort === "risk_desc") orderBy = "a.risk_score DESC, a.match_score ASC";
    else if (filters.sort === "match_desc") orderBy = "a.match_score DESC, a.risk_score ASC";
    else if (filters.sort === "match_asc") orderBy = "a.match_score ASC, a.risk_score DESC";
    else if (filters.sort === "newest") orderBy = "a.applied_at DESC";
    else if (filters.sort === "oldest") orderBy = "a.applied_at ASC";

    const result = await pool.query(
      `SELECT a.*,
              u.id AS seeker_user_id, u.name AS seeker_name, u.email AS seeker_email,
              u.headline AS seeker_headline, u.years_experience AS seeker_years_experience,
              row_to_json(j.*) AS job_row
       FROM applications a
       JOIN users u ON u.id = a.seeker_id
       JOIN jobs j ON j.id = a.job_id
       WHERE ${conditions.join(" AND ")}
       ORDER BY ${orderBy}`,
      params
    );

    return result.rows.map((row) => ({
      ...mapApplicationRow(row),
      job: mapJobRow(row.job_row),
      seeker: {
        id: row.seeker_user_id,
        name: row.seeker_name,
        email: row.seeker_email,
        headline: row.seeker_headline,
        yearsExperience:
          row.seeker_years_experience === null ||
          row.seeker_years_experience === undefined
            ? null
            : Number(row.seeker_years_experience),
      },
    }));
  }

  async findByJobId(
    jobId: string
  ): Promise<Array<Application & { seeker: { id: string; name: string; email: string } }>> {
    const result = await pool.query(
      `SELECT a.*,
              u.id AS seeker_user_id, u.name AS seeker_name, u.email AS seeker_email
       FROM applications a
       JOIN users u ON u.id = a.seeker_id
       WHERE a.job_id = $1
       ORDER BY a.risk_score ASC`,
      [jobId]
    );

    return result.rows.map((row) => ({
      ...mapApplicationRow(row),
      seeker: { id: row.seeker_user_id, name: row.seeker_name, email: row.seeker_email },
    }));
  }

  async findById(id: string): Promise<Application | null> {
    const result = await pool.query("SELECT * FROM applications WHERE id = $1", [id]);
    if (result.rows.length === 0) return null;
    return mapApplicationRow(result.rows[0]);
  }

  async findByResumeFileName(filename: string): Promise<Application | null> {
    const result = await pool.query(
      "SELECT * FROM applications WHERE resume_file_name = $1",
      [filename]
    );
    if (result.rows.length === 0) return null;
    return mapApplicationRow(result.rows[0]);
  }

  async updateStatus(id: string, status: ApplicationStatus): Promise<Application | null> {
    const result = await pool.query(
      "UPDATE applications SET status = $1 WHERE id = $2 RETURNING *",
      [status, id]
    );
    if (result.rows.length === 0) return null;
    return mapApplicationRow(result.rows[0]);
  }
}

export const applicationRepository = new ApplicationRepository();
