const path = require('node:path');

const wait = (milliseconds) => new Promise(resolve => setTimeout(resolve, milliseconds));

async function main() {
  const modulePath = path.resolve(__dirname, '..', 'dist', 'config', 'database.js');
  const dataSource = require(modulePath).default;
  const attempts = Math.max(1, Number(process.env.DB_CONNECT_RETRIES || 8));
  const baseDelay = Math.max(100, Number(process.env.DB_RETRY_DELAY_MS || 1000));

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      if (!dataSource.isInitialized) await dataSource.initialize();
      break;
    } catch (error) {
      if (dataSource.isInitialized) await dataSource.destroy().catch(() => undefined);
      if (attempt === attempts) throw error;
      const exponential = Math.min(baseDelay * (2 ** (attempt - 1)), 10_000);
      const delay = Math.round(exponential * (1 + Math.random() * 0.25));
      console.warn(`[Migration] Database unavailable (attempt ${attempt}/${attempts}); retrying in ${delay}ms.`);
      await wait(delay);
    }
  }

  try {
    // Connection failures are transient and safe to retry. A DDL failure is not:
    // some managed MySQL-compatible databases auto-commit schema changes, so
    // re-running a partially applied migration could make the incident worse.
    const migrations = await dataSource.runMigrations({ transaction: 'each' });
    console.log(`[Migration] Applied ${migrations.length} pending migration(s).`);
  } finally {
    if (dataSource.isInitialized) await dataSource.destroy().catch(() => undefined);
  }
}

main().catch((error) => {
  console.error(`[Migration] Startup migration failed: ${error instanceof Error ? error.message : 'unknown error'}`);
  process.exit(1);
});
