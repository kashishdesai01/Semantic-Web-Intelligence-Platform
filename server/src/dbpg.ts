import { Pool } from "pg";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

export const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Optional: quick connectivity check (you can remove later)
export async function pgHealthCheck() {
  const res = await pgPool.query("SELECT 1 as ok");
  return res.rows[0]?.ok === 1;
}

console.log("DATABASE_URL:", process.env.DATABASE_URL);
