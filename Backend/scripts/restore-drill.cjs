const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const backupPath = process.argv[2];
const reportPath = process.argv[3];
const sourceDatabase = process.env.DB_NAME || 'followmee';
const targetDatabase = process.env.E2E_DB_NAME || 'followmee_e2e';
const repositoryRoot = path.resolve(__dirname, '..', '..');
const criticalTables = ['users', 'tasks', 'customers', 'notifications', 'reward_point_ledger', 'migrations'];

if (!/^[a-zA-Z0-9_]+$/.test(sourceDatabase)) {
  throw new Error(`RESTORE_DRILL_REFUSED: unsafe source database identifier "${sourceDatabase}".`);
}

const fail = (message) => {
  throw new Error(`RESTORE_DRILL_REFUSED: ${message}`);
};

const assertOutsideRepository = (candidate, label) => {
  if (!candidate || !path.isAbsolute(candidate)) fail(`${label} path must be absolute.`);
  const relative = path.relative(repositoryRoot, path.resolve(candidate));
  if (relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))) {
    fail(`${label} must be stored outside the repository.`);
  }
};

const countRows = async (connection, database) => {
  const counts = {};
  for (const table of criticalTables) {
    const [rows] = await connection.query(`SELECT COUNT(*) AS total FROM \`${database}\`.\`${table}\``);
    counts[table] = Number(rows[0].total);
  }
  return counts;
};

const schemaHealth = async (connection, database) => {
  const [[tables], [foreignKeys], [indexes], [migrations]] = await Promise.all([
    connection.query('SELECT COUNT(*) AS total FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_TYPE=\'BASE TABLE\'', [database]),
    connection.query('SELECT COUNT(*) AS total FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=?', [database]),
    connection.query('SELECT COUNT(DISTINCT TABLE_NAME,INDEX_NAME) AS total FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=? AND INDEX_NAME<>\'PRIMARY\'', [database]),
    connection.query(`SELECT timestamp,name FROM \`${database}\`.migrations ORDER BY timestamp,name`),
  ]);
  return {
    tables: Number(tables[0].total),
    foreignKeys: Number(foreignKeys[0].total),
    secondaryIndexes: Number(indexes[0].total),
    migrations: migrations.map(row => ({ timestamp: String(row.timestamp), name: row.name })),
  };
};

async function main() {
  assertOutsideRepository(backupPath, 'Backup');
  assertOutsideRepository(reportPath, 'Report');
  if (targetDatabase !== 'followmee_e2e') fail(`target must be exactly "followmee_e2e", received "${targetDatabase}".`);
  if (sourceDatabase === targetDatabase) fail('source and target databases must be different.');
  if (!fs.existsSync(backupPath)) fail('backup file does not exist.');
  if (fs.existsSync(reportPath)) fail('report path already exists.');

  const dump = fs.readFileSync(backupPath, 'utf8');
  if (!dump.includes('CREATE TABLE') || !dump.includes('INSERT INTO') || !dump.includes(`-- Database: ${sourceDatabase}`)) {
    fail('backup identity or required SQL statements are missing.');
  }
  if (/^\s*(?:(?:CREATE|DROP)\s+(?:DATABASE|SCHEMA)\b|USE\s+)/im.test(dump)) {
    fail('backup must not contain database-level CREATE, USE, or DROP statements.');
  }

  const checksum = crypto.createHash('sha256').update(dump).digest('hex');
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });

  try {
    const sourceCounts = await countRows(connection, sourceDatabase);
    await connection.query(`DROP DATABASE IF EXISTS \`${targetDatabase}\``);
    await connection.query(`CREATE DATABASE \`${targetDatabase}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await connection.query(`USE \`${targetDatabase}\``);
    await connection.query(dump);

    const restoredCounts = await countRows(connection, targetDatabase);
    const health = await schemaHealth(connection, targetDatabase);
    const comparisons = Object.fromEntries(criticalTables.map(table => [table, {
      source: sourceCounts[table],
      restored: restoredCounts[table],
      matches: sourceCounts[table] === restoredCounts[table],
    }]));
    const passed = Object.values(comparisons).every(item => item.matches)
      && health.tables > 0 && health.foreignKeys > 0 && health.secondaryIndexes > 0;
    const report = {
      status: passed ? 'passed' : 'failed',
      generatedAt: new Date().toISOString(),
      sourceDatabase,
      targetDatabase,
      backup: { path: path.resolve(backupPath), sha256: checksum, bytes: Buffer.byteLength(dump) },
      comparisons,
      schema: health,
    };
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
    console.log(JSON.stringify({ status: report.status, reportPath: path.resolve(reportPath), sha256: checksum }));
    if (!passed) process.exitCode = 1;
  } finally {
    await connection.end();
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
