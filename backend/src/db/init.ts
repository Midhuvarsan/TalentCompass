import fs from "fs";
import path from "path";
import { pool } from "./pool";

export async function initDb(): Promise<void> {
  const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf-8");
  await pool.query(schema);
  console.log("Postgres schema is ready");
}
