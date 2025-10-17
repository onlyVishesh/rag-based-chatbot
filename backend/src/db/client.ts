import { Pool } from "pg";

const pool = new Pool({
  host: "localhost",
  port: 5432,
  database: "ai_tutor_dev",
  user: process.env.USER || "postgres",
  password: "", // No password for local dev
});

export async function query(text: string, params?: any[]) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  console.log("Executed query", { text, duration, rows: res.rowCount });
  return res;
}

export default pool;
