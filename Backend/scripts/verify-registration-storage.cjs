const path = require('node:path');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

async function main() {
  const database = process.env.DB_NAME || 'followmee';
  const sslCa = process.env.DB_SSL_CA_BASE64 ? Buffer.from(process.env.DB_SSL_CA_BASE64, 'base64').toString('utf8') : undefined;
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true, ...(sslCa ? { ca: sslCa } : {}) } : undefined,
  });
  try {
    const [plan] = await connection.query("EXPLAIN SELECT requestId FROM registration_requests WHERE verificationTokenHash = REPEAT('a', 64)");
    const [indexes] = await connection.query("SHOW INDEX FROM registration_requests WHERE Key_name = 'UQ_registration_verification_token'");
    const [requests] = await connection.query('SELECT COUNT(*) AS total FROM registration_requests');
    const [owners] = await connection.query('SELECT COUNT(*) AS total FROM system_owner WHERE singletonId = 1');
    const [users] = await connection.query('SELECT COUNT(*) AS total FROM users WHERE isActive = 1');
    const [migrations] = await connection.query('SELECT name FROM migrations WHERE timestamp IN (1854000000000, 1855000000000) ORDER BY timestamp');
    const key = plan[0]?.key || null;
    const possibleKeys = String(plan[0]?.possible_keys || '').split(',').filter(Boolean);
    const indexedPlan = key === 'UQ_registration_verification_token' || possibleKeys.includes('UQ_registration_verification_token');
    const requestCount = Number(requests[0]?.total || 0);
    // MySQL reports no access path for an empty table. In that case SHOW INDEX is
    // the authoritative check; once rows exist, require EXPLAIN to see the index.
    const passed = indexes.length === 1 && migrations.length === 2 && (requestCount === 0 || indexedPlan);
    console.log(JSON.stringify({ database, passed, tokenLookupKey: key, possibleKeys, registrationRequests: requestCount, ownerSingletons: Number(owners[0]?.total || 0), activeUsers: Number(users[0]?.total || 0), migrations: migrations.map(row => row.name) }));
    if (!passed) process.exitCode = 1;
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
