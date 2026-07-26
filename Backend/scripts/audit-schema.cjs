const dotenv = require('dotenv');
const mysql = require('mysql2/promise');

dotenv.config();

async function auditSchema() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'followmee',
  });

  const [tables] = await connection.query(`
    SELECT TABLE_NAME, TABLE_ROWS, ENGINE, TABLE_COLLATION
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
    ORDER BY TABLE_NAME
  `);
  const [columns] = await connection.query(`
    SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY, EXTRA
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    ORDER BY TABLE_NAME, ORDINAL_POSITION
  `);
  const [indexes] = await connection.query(`
    SELECT TABLE_NAME, INDEX_NAME, NON_UNIQUE,
      GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS columns_list
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
    GROUP BY TABLE_NAME, INDEX_NAME, NON_UNIQUE
    ORDER BY TABLE_NAME, INDEX_NAME
  `);
  const [foreignKeys] = await connection.query(`
    SELECT TABLE_NAME, COLUMN_NAME, CONSTRAINT_NAME,
      REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
    FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND REFERENCED_TABLE_NAME IS NOT NULL
    ORDER BY TABLE_NAME, CONSTRAINT_NAME
  `);

  console.log(JSON.stringify({ tables, columns, indexes, foreignKeys }, null, 2));
  await connection.end();
}

auditSchema().catch((error) => {
  console.error(`${error.code || 'SCHEMA_AUDIT_FAILED'}: ${error.message}`);
  process.exitCode = 1;
});
