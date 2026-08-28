const path = require('node:path');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const database = process.env.DB_NAME || 'followmee_e2e';
const host = process.env.DB_HOST || 'localhost';
if (database !== 'followmee_e2e') throw new Error(`Refusing local Owner setup for database "${database}".`);
if (!['localhost', '127.0.0.1', '::1'].includes(host.toLowerCase())) throw new Error(`Refusing local Owner setup on non-loopback host "${host}".`);

async function main() {
  const connection = await mysql.createConnection({
    host,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database,
  });
  try {
    const [owners] = await connection.query('SELECT userId FROM system_owner WHERE singletonId = 1 LIMIT 1');
    if (owners.length) {
      console.log(`Local database "${database}" already has an Owner; preserving it.`);
      return;
    }
    const [counts] = await connection.query('SELECT COUNT(*) AS total FROM users WHERE isActive = 1');
    if (Number(counts[0]?.total || 0) > 0) throw new Error('Active users exist without system_owner; use the audited Owner recovery command.');

    await connection.beginTransaction();
    const passwordHash = await bcrypt.hash('12345678', 12);
    const [userResult] = await connection.execute(
      `INSERT INTO users (userName, userLastName, userEmail, userPassword, isActive, createdAt, updatedAt)
       VALUES ('Local', 'Owner', 'test@example.com', ?, 1, NOW(), NOW())`,
      [passwordHash],
    );
    const userId = userResult.insertId;
    await connection.execute("INSERT INTO user_roles (userId, roleId) SELECT ?, roleId FROM roles WHERE roleName = 'Owner' AND isActive = 1", [userId]);
    await connection.execute('INSERT INTO system_owner (singletonId, userId) VALUES (1, ?)', [userId]);
    await connection.commit();
    console.log(`Local database "${database}" now has test@example.com as Owner.`);
  } catch (error) {
    try { await connection.rollback(); } catch { /* no transaction was active */ }
    throw error;
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
