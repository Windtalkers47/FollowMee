const dotenv = require('dotenv');
const mysql = require('mysql2/promise');

dotenv.config();

const legacyMigrations = [
  {
    timestamp: '1770104312494',
    name: 'InitialSchema1770104312494',
    checks: [
      ['users', 'userId'],
      ['customers', 'customerId'],
      ['user_sessions', 'refreshToken'],
    ],
  },
  {
    timestamp: '1785000000000',
    name: 'AddNotificationRecipientColumns1785000000000',
    checks: [
      ['notification_recipients', 'isRead'],
      ['notification_recipients', 'isSeen'],
      ['notification_recipients', 'isArchived'],
      ['notification_recipients', 'isDeleted'],
    ],
  },
];

async function reconcile() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'followmee',
  });

  try {
    await connection.beginTransaction();

    for (const migration of legacyMigrations) {
      for (const [table, column] of migration.checks) {
        const [[result]] = await connection.query(
          `SELECT COUNT(*) AS count
           FROM information_schema.COLUMNS
           WHERE TABLE_SCHEMA = DATABASE()
             AND TABLE_NAME = ?
             AND COLUMN_NAME = ?`,
          [table, column]
        );
        if (Number(result.count) !== 1) {
          throw new Error(
            `Cannot reconcile ${migration.name}: ${table}.${column} is missing`
          );
        }
      }

      await connection.query(
        `INSERT INTO migrations (timestamp, name)
         SELECT ?, ?
         WHERE NOT EXISTS (
           SELECT 1 FROM migrations WHERE timestamp = ? AND name = ?
         )`,
        [
          migration.timestamp,
          migration.name,
          migration.timestamp,
          migration.name,
        ]
      );
    }

    await connection.commit();
    console.log(JSON.stringify({ reconciled: legacyMigrations.map((item) => item.name) }));
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
}

reconcile().catch((error) => {
  console.error(`${error.code || 'RECONCILE_FAILED'}: ${error.message}`);
  process.exitCode = 1;
});
