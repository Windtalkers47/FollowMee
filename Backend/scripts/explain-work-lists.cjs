require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mysql = require('mysql2/promise');

(async () => {
  const database = process.env.DB_NAME;
  if (!database) throw new Error('DB_NAME is required');
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database,
  });
  const statements = {
    tasks: "EXPLAIN SELECT taskId FROM tasks WHERE isActive=1 AND assignedTo=1 AND status IN ('todo','in_progress','review') ORDER BY updatedAt DESC,taskId DESC LIMIT 50",
    customers: "EXPLAIN SELECT customerId FROM customers WHERE status='active' ORDER BY createdAt DESC,customerId DESC LIMIT 25",
  };
  for (const [name, sql] of Object.entries(statements)) {
    const [rows] = await connection.query(sql);
    console.log(JSON.stringify({ name, plan: rows.map(row => ({ key: row.key, rows: row.rows, extra: row.Extra })) }));
  }
  await connection.end();
})().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
