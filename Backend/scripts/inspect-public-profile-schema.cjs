const dotenv = require('dotenv');
const mysql = require('mysql2/promise');

dotenv.config();

async function inspect() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'followmee',
  });
  try {
    const [tables] = await connection.query(`
      SELECT TABLE_NAME, TABLE_COLLATION
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME IN (
          'customers', 'users', 'public_profiles',
          'public_profile_links', 'public_profile_events'
        )
      ORDER BY TABLE_NAME
    `);
    const [columns] = await connection.query(`
      SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, CHARACTER_SET_NAME, COLLATION_NAME
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND (
          (TABLE_NAME = 'customers' AND COLUMN_NAME = 'customerId')
          OR (TABLE_NAME = 'public_profiles' AND COLUMN_NAME IN ('profileId', 'customerId'))
        )
      ORDER BY TABLE_NAME, COLUMN_NAME
    `);
    const [foreignKeys] = await connection.query(`
      SELECT TABLE_NAME, CONSTRAINT_NAME, COLUMN_NAME,
        REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME LIKE 'public_profile%'
        AND REFERENCED_TABLE_NAME IS NOT NULL
      ORDER BY TABLE_NAME, CONSTRAINT_NAME
    `);
    const [profileCounts] = await connection.query(`
      SELECT status, visibility, COUNT(*) AS count
      FROM public_profiles
      GROUP BY status, visibility
      ORDER BY status, visibility
    `);
    const [sessionColumns] = await connection.query(`
      SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_KEY, EXTRA
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user_sessions'
      ORDER BY ORDINAL_POSITION
    `);
    const [testUsers] = await connection.query(`
      SELECT userId, userEmail, isActive
      FROM users
      WHERE userEmail LIKE 'codex.profile.%@example.com'
    `);
    const [userIdDefinition] = await connection.query(`
      SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_KEY, EXTRA
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'users'
        AND COLUMN_NAME = 'userId'
    `);
    console.log(JSON.stringify({
      tables,
      columns,
      foreignKeys,
      profileCounts,
      sessionColumns,
      testUsers,
      userIdDefinition,
    }, null, 2));
  } finally {
    await connection.end();
  }
}

inspect().catch((error) => {
  console.error(`${error.code || 'INSPECT_FAILED'}: ${error.message}`);
  process.exitCode = 1;
});
