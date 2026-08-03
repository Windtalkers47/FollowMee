import dataSource from '../src/config/database';
import { formatDatabaseConnectionError } from '../src/utils/database-error.util';
import { MigrationExecutor } from 'typeorm';

const host = process.env.DB_HOST || 'localhost';
const port = Number(process.env.DB_PORT || 3306);
const database = process.env.DB_NAME || 'followmee';

const printFailure = (message: string): void => {
  console.error(`[Database Doctor] ${message}`);
  console.error('[Database Doctor] Follow the guidance above, then rerun: npm run doctor:db');
};

const main = async (): Promise<void> => {
  try {
    await dataSource.initialize();
    const [server] = await dataSource.query('SELECT DATABASE() AS databaseName, VERSION() AS version');

    const migrationExecutor = new MigrationExecutor(dataSource);
    const pending = (await migrationExecutor.getPendingMigrations()).map(migration => migration.name);

    console.log(`[Database Doctor] Connected to ${host}:${port}/${server?.databaseName || database}.`);
    console.log(`[Database Doctor] Server version: ${server?.version || 'unknown'}.`);

    if (pending.length > 0) {
      console.error('[Database Doctor] Pending migrations:');
      pending.forEach(name => console.error(`  - ${name}`));
      console.error('[Database Doctor] Back up the database, then run: npm --prefix Backend run migration:run');
      process.exitCode = 1;
      return;
    }

    console.log('[Database Doctor] Database and migration state are ready.');
  } catch (error) {
    printFailure(formatDatabaseConnectionError(error, {
      host,
      port,
      exposeDetails: true,
    }));
    process.exitCode = 1;
  } finally {
    if (dataSource.isInitialized) await dataSource.destroy();
  }
};

void main();
