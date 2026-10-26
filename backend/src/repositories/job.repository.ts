import { pool } from "../db/pool";
import { Job } from "../types";
import { mapJobRow } from "../utils/mappers";

export class JobRepository {
  async create(data: {
    id: string;
    recruiterId: string;
    title: string;
    company: string;
    description: string;
    requiredSkills: string[];
    minExperienceYears: number;
    location: string;
  }): Promise<Job> {
    const result = await pool.query(
      `INSERT INTO jobs
        (id, recruiter_id, title, company, description, required_skills, min_experience_years, location)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        data.id,
        data.recruiterId,
        data.title,
        data.company,
        data.description,
        data.requiredSkills,
        data.minExperienceYears || 0,
        data.location || "Remote",
      ]
    );
    return mapJobRow(result.rows[0]);
  }

  async findAll(): Promise<Job[]> {
    const result = await pool.query("SELECT * FROM jobs ORDER BY created_at DESC");
    return result.rows.map(mapJobRow);
  }

  async findByRecruiterId(recruiterId: string): Promise<Job[]> {
    const result = await pool.query(
      "SELECT * FROM jobs WHERE recruiter_id = $1 ORDER BY created_at DESC",
      [recruiterId]
    );
    return result.rows.map(mapJobRow);
  }

  async findById(id: string): Promise<Job | null> {
    const result = await pool.query("SELECT * FROM jobs WHERE id = $1", [id]);
    if (result.rows.length === 0) return null;
    return mapJobRow(result.rows[0]);
  }

  async delete(id: string): Promise<boolean> {
    const result = await pool.query("DELETE FROM jobs WHERE id = $1", [id]);
    return (result.rowCount ?? 0) > 0;
  }
}

export const jobRepository = new JobRepository();
