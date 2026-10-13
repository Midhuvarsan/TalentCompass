import { Pool } from "pg";

// Uses DATABASE_URL if set, otherwise falls back to PG* env vars
// (PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE), which `pg` reads
// automatically.
export const pool = new Pool(
  process.env.DATABASE_URL ? { connectionString: process.env.DATABASE_URL } : undefined
);

pool.on("error", (err) => {
  console.error("Unexpected Postgres pool error", err);
});
