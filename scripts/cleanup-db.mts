import "dotenv/config";
import pg from "pg";

async function main() {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const tables = [
      { table: "wfh_records", unique: "emp_id, date" },
      { table: "shift_schedules", unique: "emp_id, work_date" },
      { table: "attendance_logs", unique: "emp_id, date" },
      { table: "admin_users", unique: "username" },
    ];

    for (const { table, unique } of tables) {
      const cols = unique.split(", ").map((c) => c.trim());
      const colList = cols.join(", ");
      await client.query(`
        DELETE FROM ${table} a USING ${table} b
        WHERE a.ctid < b.ctid AND (${cols.map((c) => `a.${c} = b.${c}`).join(" AND ")})
      `).catch(async () => {
        await client.query(`
          DELETE FROM ${table} WHERE id NOT IN (
            SELECT MIN(id) FROM ${table} GROUP BY ${colList}
          )
        `);
      });
      console.log(`Cleaned ${table}`);
    }
  } finally {
    await client.end();
  }

  console.log("DB cleanup done.");
}

main().catch((e) => {
  console.error("Cleanup failed:", e);
  process.exit(1);
});
