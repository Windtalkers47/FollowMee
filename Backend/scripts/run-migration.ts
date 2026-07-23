/**
 * Run TypeORM Migration Script
 * 
 * Usage:
 *   npx ts-node scripts/run-migration.ts
 */

import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

const dataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'followmee',
  synchronize: false, // Important: must be false for migrations
  logging: true,
  entities: [
    path.join(__dirname, '../src/entities/**/*.ts'),
  ],
  migrations: [
    path.join(__dirname, '../src/migrations/**/*.ts'),
  ],
});

async function runMigration() {
  try {
    console.log('Initializing database connection...');
    await dataSource.initialize();
    console.log('Database connected successfully!');

    console.log('Running migrations...');
    await dataSource.runMigrations();
    console.log('Migrations completed successfully!');

    await dataSource.destroy();
    console.log('Database connection closed.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();