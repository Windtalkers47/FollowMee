const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const outputPath = process.argv[2];

if (!outputPath) {
  console.error('Usage: node scripts/backup-database.cjs <absolute-output-path>');
  process.exit(1);
}

const resolvedOutputPath = path.resolve(outputPath);
const repositoryRoot = path.resolve(__dirname, '..', '..');
const relativeOutputPath = path.relative(repositoryRoot, resolvedOutputPath);
if (!path.isAbsolute(outputPath)) {
  console.error('Backup output path must be absolute.');
  process.exit(1);
}
if (relativeOutputPath === '' || (!relativeOutputPath.startsWith('..') && !path.isAbsolute(relativeOutputPath))) {
  console.error('Database backups must be stored outside the repository.');
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

  await connection.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
  await connection.query('START TRANSACTION WITH CONSISTENT SNAPSHOT');

  try {
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
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  }

  chunks.push('SET FOREIGN_KEY_CHECKS = 1;', '');
  fs.mkdirSync(path.dirname(resolvedOutputPath), { recursive: true });
  fs.writeFileSync(resolvedOutputPath, chunks.join('\n'), { encoding: 'utf8', flag: 'wx' });
  await connection.end();

  console.log(JSON.stringify({ outputPath: resolvedOutputPath, tables: tables.length }));
}

backup().catch((error) => {
  console.error(`${error.code || 'BACKUP_FAILED'}: ${error.message}`);
  process.exitCode = 1;
});
