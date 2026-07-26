const dotenv = require('dotenv');
const mysql = require('mysql2/promise');

dotenv.config();

const requiredForeignKeys = [
  ['task_likes', 'taskId', 'tasks', 'taskId'],
  ['task_likes', 'userId', 'users', 'userId'],
  ['notification_metrics', 'recipientId', 'notification_recipients', 'recipientId'],
  ['notification_metrics', 'userId', 'users', 'userId'],
  ['notification_metrics', 'notificationId', 'notifications', 'notificationId'],
  ['notification_queue', 'recipientUserId', 'users', 'userId'],
];

async function verify() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'followmee',
  });

  try {
    const [ghostColumns] = await connection.query(`
      SELECT COLUMN_NAME
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'task_likes'
        AND COLUMN_NAME IN ('taskTaskId', 'userUserId')
    `);
    const [foreignKeys] = await connection.query(`
      SELECT TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL
    `);
    const [customerEmailIndexes] = await connection.query(`
      SELECT DISTINCT INDEX_NAME
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'customers'
        AND COLUMN_NAME = 'customerEmail'
        AND NON_UNIQUE = 0
    `);
    const [collations] = await connection.query(`
      SELECT COUNT(*) AS total,
        SUM(TABLE_COLLATION = 'utf8mb4_unicode_ci') AS utf8mb4Count
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'
    `);
    const [migration] = await connection.query(`
      SELECT COUNT(*) AS count
      FROM migrations
      WHERE name = 'RepairSchemaDrift1790000000000'
    `);
    const [counts] = await connection.query(`
      SELECT
        (SELECT COUNT(*) FROM users) AS users,
        (SELECT COUNT(*) FROM customers) AS customers,
        (SELECT COUNT(*) FROM user_sessions) AS sessions
    `);

    const missingForeignKeys = requiredForeignKeys.filter(
      ([table, column, parentTable, parentColumn]) =>
        !foreignKeys.some(
          (foreignKey) =>
            foreignKey.TABLE_NAME === table &&
            foreignKey.COLUMN_NAME === column &&
            foreignKey.REFERENCED_TABLE_NAME === parentTable &&
            foreignKey.REFERENCED_COLUMN_NAME === parentColumn
        )
    );

    const checks = {
      migrationApplied: migration[0].count === 1,
      ghostColumnsRemoved: ghostColumns.length === 0,
      requiredForeignKeysPresent: missingForeignKeys.length === 0,
      oneCustomerEmailUniqueIndex: customerEmailIndexes.length === 1,
      allTableDefaultsUtf8mb4: Number(collations[0].utf8mb4Count) === Number(collations[0].total),
    };
    const passed = Object.values(checks).every(Boolean);

    console.log(JSON.stringify({
      passed,
      checks,
      missingForeignKeys,
      preservedRows: counts[0],
      tableCount: Number(collations[0].total),
    }, null, 2));

    if (!passed) process.exitCode = 1;
  } finally {
    await connection.end();
  }
}

verify().catch((error) => {
  console.error(`${error.code || 'SCHEMA_VERIFY_FAILED'}: ${error.message}`);
  process.exitCode = 1;
});
