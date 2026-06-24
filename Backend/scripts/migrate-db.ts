/**
 * Database Migration Script
 * 
 * This script helps export your local MySQL schema and prepare it for production.
 * 
 * Usage:
 *   npm run db:migrate:export    - Export local schema to SQL file
 *   npm run db:migrate:import    - Import schema to production (TiDB)
 * 
 * Prerequisites:
 *   - MySQL CLI installed locally
 *   - TiDB cluster created at https://tidbcloud.com
 */

import { exec } from 'child_process';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config();

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || '3306';
const DB_USERNAME = process.env.DB_USERNAME || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'followmee';

const EXPORT_FILE = path.join(__dirname, '../schema-export.sql');

/**
 * Export local MySQL schema
 */
function exportSchema(): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`Exporting schema from ${DB_HOST}:${DB_PORT}/${DB_NAME}...`);
    
    const mysqldumpCmd = `mysqldump -h${DB_HOST} -P${DB_PORT} -u${DB_USERNAME} ${DB_PASSWORD ? `-p${DB_PASSWORD}` : ''} --no-data ${DB_NAME} > "${EXPORT_FILE}"`;
    
    exec(mysqldumpCmd, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`Export failed: ${error.message}. Make sure MySQL CLI is installed.`));
        return;
      }
      console.log(`Schema exported to ${EXPORT_FILE}`);
      resolve();
    });
  });
}

/**
 * Import schema to production database (TiDB)
 */
function importSchema(prodConfig: { host: string; port: string; username: string; password: string; database: string }): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`Importing schema to ${prodConfig.host}:${prodConfig.port}/${prodConfig.database}...`);
    
    if (!fs.existsSync(EXPORT_FILE)) {
      reject(new Error(`Export file not found: ${EXPORT_FILE}. Run export first.`));
      return;
    }
    
    const mysqlCmd = `mysql -h${prodConfig.host} -P${prodConfig.port} -u${prodConfig.username} -p${prodConfig.password} ${prodConfig.database} < "${EXPORT_FILE}"`;
    
    exec(mysqlCmd, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`Import failed: ${error.message}`));
        return;
      }
      console.log('Schema imported successfully!');
      resolve();
    });
  });
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  try {
    switch (command) {
      case 'export':
        await exportSchema();
        console.log('\nNext steps:');
        console.log('1. Create a TiDB cluster at https://tidbcloud.com');
        console.log('2. Get your connection string from TiDB dashboard');
        console.log('3. Run: npm run db:migrate:import');
        break;
        
      case 'import':
        // Load production config from .env.production
        const prodEnv = dotenv.parse(fs.readFileSync(path.join(__dirname, '../.env.production')));
        
        const prodConfig = {
          host: prodEnv.DB_HOST || '',
          port: prodEnv.DB_PORT || '4000',
          username: prodEnv.DB_USERNAME || '',
          password: prodEnv.DB_PASSWORD || '',
          database: prodEnv.DB_NAME || 'followmee'
        };
        
        if (!prodConfig.host || prodConfig.host.includes('your-tidb-host')) {
          console.error('Error: Please update .env.production with your TiDB connection details first.');
          process.exit(1);
        }
        
        await importSchema(prodConfig);
        break;
        
      default:
        console.log('Usage: npm run db:migrate <export|import>');
        console.log('');
        console.log('Commands:');
        console.log('  export  - Export local MySQL schema to schema-export.sql');
        console.log('  import  - Import schema to production database (TiDB)');
        process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();