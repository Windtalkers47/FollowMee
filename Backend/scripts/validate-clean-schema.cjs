const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');

dotenv.config();

const validationDatabase = 'followmee_schema_validation';
const schemaPath = path.resolve(__dirname, '../../database/followmee-clean-schema.sql');

async function validate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });

  try {
    await connection.query(`DROP DATABASE IF EXISTS \`${validationDatabase}\``);

    const schema = fs
      .readFileSync(schemaPath, 'utf8')
      .replaceAll('`followmee`', `\`${validationDatabase}\``);

    await connection.query(schema);

    const [[tableResult]] = await connection.query(
      `SELECT COUNT(*) AS count
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = ?`,
      [validationDatabase]
    );
    const [[foreignKeyResult]] = await connection.query(
      `SELECT COUNT(*) AS count
       FROM information_schema.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = ? AND REFERENCED_TABLE_NAME IS NOT NULL`,
      [validationDatabase]
    );
    const [[indexResult]] = await connection.query(
      `SELECT COUNT(DISTINCT TABLE_NAME, INDEX_NAME) AS count
       FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = ?`,
      [validationDatabase]
    );

    console.log(
      JSON.stringify({
        valid: true,
        tables: Number(tableResult.count),
        foreignKeys: Number(foreignKeyResult.count),
        indexes: Number(indexResult.count),
      })
    );
  } finally {
    await connection.query(`DROP DATABASE IF EXISTS \`${validationDatabase}\``);
    await connection.end();
  }
}

validate().catch((error) => {
  console.error(`${error.code || 'SCHEMA_VALIDATION_FAILED'}: ${error.message}`);
  process.exitCode = 1;
});
