import { pool } from "../db/pool";
import { Role, User } from "../types";
import { mapUserRow } from "../utils/mappers";

export class UserRepository {
  async findById(id: string): Promise<User | null> {
    const result = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
    if (result.rows.length === 0) return null;
    return mapUserRow(result.rows[0]);
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await pool.query(
      "SELECT * FROM users WHERE lower(email) = lower($1)",
      [email]
    );
    if (result.rows.length === 0) return null;
    return mapUserRow(result.rows[0]);
  }

  async create(data: {
    id: string;
    name: string;
    email: string;
    passwordHash: string;
    role: Role;
  }): Promise<User> {
    const result = await pool.query(
      `INSERT INTO users (id, name, email, password_hash, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [data.id, data.name, data.email, data.passwordHash, data.role]
    );
    return mapUserRow(result.rows[0]);
  }

  async update(id: string, data: Partial<User>): Promise<User | null> {
    const current = await this.findById(id);
    if (!current) return null;

    const result = await pool.query(
      `UPDATE users SET
        name = $1,
        phone = $2,
        location = $3,
        bio = $4,
        avatar_color = $5,
        skills = $6,
        headline = $7,
        years_experience = $8,
        company_name = $9,
        company_website = $10
       WHERE id = $11
       RETURNING *`,
      [
        data.name !== undefined ? data.name : current.name,
        data.phone !== undefined ? data.phone : current.phone,
        data.location !== undefined ? data.location : current.location,
        data.bio !== undefined ? data.bio : current.bio,
        data.avatarColor !== undefined ? data.avatarColor : current.avatarColor,
        data.skills !== undefined ? data.skills : current.skills,
        data.headline !== undefined ? data.headline : current.headline,
        data.yearsExperience !== undefined ? data.yearsExperience : current.yearsExperience,
        data.companyName !== undefined ? data.companyName : current.companyName,
        data.companyWebsite !== undefined ? data.companyWebsite : current.companyWebsite,
        id,
      ]
    );

    return mapUserRow(result.rows[0]);
  }
}

export const userRepository = new UserRepository();
