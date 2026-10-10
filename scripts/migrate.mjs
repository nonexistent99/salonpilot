import { readFile, readdir } from "node:fs/promises";
import { Pool } from "pg";
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.DATABASE_SSL === "disable"
      ? false
      : {
          rejectUnauthorized:
            process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false",
        },
});
const client = await pool.connect();
try {
  await client.query("SELECT pg_advisory_lock(731429)");
  await client.query(
    "CREATE TABLE IF NOT EXISTS salonpilot_schema_migrations(name TEXT PRIMARY KEY,applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())",
  );
  const files = (await readdir(new URL("../db/migrations/", import.meta.url)))
    .filter((x) => x.endsWith(".sql"))
    .sort();
  for (const name of files) {
    if (
      (
        await client.query(
          "SELECT name FROM salonpilot_schema_migrations WHERE name=$1",
          [name],
        )
      ).rowCount
    )
      continue;
    await client.query("BEGIN");
    try {
      await client.query(
        await readFile(
          new URL(`../db/migrations/${name}`, import.meta.url),
          "utf8",
        ),
      );
      await client.query(
        "INSERT INTO salonpilot_schema_migrations(name) VALUES($1)",
        [name],
      );
      await client.query("COMMIT");
      console.log("Applied", name);
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    }
  }
} finally {
  await client.query("SELECT pg_advisory_unlock(731429)");
  client.release();
  await pool.end();
}
