const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');

dotenv.config();

const outputPath = process.argv[2];

if (!outputPath) {
  console.error('Usage: node scripts/backup-database.cjs <absolute-output-path>');
  process.exit(1);
}

async function backup() {
  const database = process.env.DB_NAME || 'followmee';
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database,
  });

  const [tableRows] = await connection.query('SHOW FULL TABLES WHERE Table_type = "BASE TABLE"');
  const tableKey = `Tables_in_${database}`;
  const tables = tableRows.map((row) => row[tableKey]);
  const chunks = [
    '-- FollowMee database backup generated before schema migration',
    `-- Database: ${database}`,
    `-- Generated: ${new Date().toISOString()}`,
    'SET NAMES utf8mb4;',
    'SET FOREIGN_KEY_CHECKS = 0;',
    '',
  ];

  for (const table of tables) {
    const [[createRow]] = await connection.query(`SHOW CREATE TABLE \`${table}\``);
    const createSql = createRow['Create Table'];
    chunks.push(`DROP TABLE IF EXISTS \`${table}\`;`);
    chunks.push(`${createSql};`, '');

    const [rows] = await connection.query(`SELECT * FROM \`${table}\``);
    for (const row of rows) {
      const columns = Object.keys(row).map((column) => `\`${column}\``).join(', ');
      const values = Object.values(row).map((value) => mysql.escape(value)).join(', ');
      chunks.push(`INSERT INTO \`${table}\` (${columns}) VALUES (${values});`);
    }
    if (rows.length) chunks.push('');
  }

  chunks.push('SET FOREIGN_KEY_CHECKS = 1;', '');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, chunks.join('\n'), 'utf8');
  await connection.end();

  console.log(JSON.stringify({ outputPath, tables: tables.length }));
}

backup().catch((error) => {
  console.error(`${error.code || 'BACKUP_FAILED'}: ${error.message}`);
  process.exitCode = 1;
});
