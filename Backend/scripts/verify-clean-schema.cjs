const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const VERIFY_DATABASE = process.env.E2E_DB_NAME || 'followmee_e2e';
if (VERIFY_DATABASE !== 'followmee_e2e') {
  throw new Error(`Unsafe verification database "${VERIFY_DATABASE}". Target must be exactly "followmee_e2e".`);
}

async function verify() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });

  const schemaPath = path.resolve(
    __dirname,
    '../../database/followmee-clean-schema.sql'
  );
  const sourceSql = fs.readFileSync(schemaPath, 'utf8');
  const expectedTables = [
    ...sourceSql.matchAll(/CREATE TABLE `([^`]+)`/g),
  ].map((match) => match[1]).sort();
  const verificationSql = sourceSql.replace(
    /`followmee`/g,
    `\`${VERIFY_DATABASE}\``
  );

  try {
    await connection.query(`DROP DATABASE IF EXISTS \`${VERIFY_DATABASE}\``);
    await connection.query(verificationSql);

    const [tableRows] = await connection.query(
      `SELECT TABLE_NAME
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = ?
       ORDER BY TABLE_NAME`,
      [VERIFY_DATABASE]
    );
    const actualTables = tableRows.map((row) => row.TABLE_NAME);
    const missingTables = expectedTables.filter(
      (table) => !actualTables.includes(table)
    );
    const unexpectedTables = actualTables.filter(
      (table) => !expectedTables.includes(table)
    );

    const [foreignKeyRows] = await connection.query(
      `SELECT COUNT(*) AS count
       FROM information_schema.REFERENTIAL_CONSTRAINTS
       WHERE CONSTRAINT_SCHEMA = ?`,
      [VERIFY_DATABASE]
    );
    const [migrationRows] = await connection.query(
      `SELECT COUNT(*) AS count
       FROM \`${VERIFY_DATABASE}\`.\`migrations\``
    );
    const [indexRows] = await connection.query(
      `SELECT COUNT(DISTINCT TABLE_NAME, INDEX_NAME) AS count
       FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = ?
         AND INDEX_NAME <> 'PRIMARY'`,
      [VERIFY_DATABASE]
    );
    const [missingPrimaryKeyRows] = await connection.query(
      `SELECT table_row.TABLE_NAME
       FROM information_schema.TABLES table_row
       LEFT JOIN information_schema.TABLE_CONSTRAINTS constraint_row
         ON constraint_row.CONSTRAINT_SCHEMA = table_row.TABLE_SCHEMA
        AND constraint_row.TABLE_NAME = table_row.TABLE_NAME
        AND constraint_row.CONSTRAINT_TYPE = 'PRIMARY KEY'
       WHERE table_row.TABLE_SCHEMA = ?
         AND table_row.TABLE_TYPE = 'BASE TABLE'
         AND constraint_row.CONSTRAINT_NAME IS NULL
       ORDER BY table_row.TABLE_NAME`,
      [VERIFY_DATABASE]
    );
    const [userIdentityRows] = await connection.query(
      `SELECT EXTRA
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = ?
         AND TABLE_NAME = 'users'
         AND COLUMN_NAME = 'userId'`,
      [VERIFY_DATABASE]
    );
    const [seedRows] = await connection.query(
      `SELECT
         (SELECT COUNT(*) FROM \`${VERIFY_DATABASE}\`.\`roles\`) AS roles,
         (SELECT COUNT(*) FROM \`${VERIFY_DATABASE}\`.\`permissions\`) AS permissions,
         (SELECT COUNT(*) FROM \`${VERIFY_DATABASE}\`.\`role_permissions\`) AS rolePermissions`
    );

    const result = {
      schemaPath,
      tables: actualTables.length,
      expectedTables: expectedTables.length,
      missingTables,
      unexpectedTables,
      foreignKeys: Number(foreignKeyRows[0].count),
      secondaryIndexes: Number(indexRows[0].count),
      tablesMissingPrimaryKey: missingPrimaryKeyRows.map((row) => row.TABLE_NAME),
      migrations: Number(migrationRows[0].count),
      userIdAutoIncrement: String(userIdentityRows[0]?.EXTRA || '')
        .toLowerCase()
        .includes('auto_increment'),
      seedData: seedRows[0],
    };

    if (
      missingTables.length ||
      unexpectedTables.length ||
      result.tablesMissingPrimaryKey.length ||
      result.migrations !== 21 ||
      !result.userIdAutoIncrement
    ) {
      throw new Error(`Clean schema verification failed: ${JSON.stringify(result)}`);
    }

    console.log(JSON.stringify(result, null, 2));
  } finally {
    // Do not mask the original schema error if MySQL has already closed the
    // connection (for example after a server restart or packet limit failure).
    try {
      await connection.query(`DROP DATABASE IF EXISTS \`${VERIFY_DATABASE}\``);
    } catch (cleanupError) {
      console.warn(`Schema verification cleanup skipped: ${cleanupError.message}`);
    }
    try {
      await connection.end();
    } catch {
      // Connection is already closed.
    }
  }
}

verify().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
