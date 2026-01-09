import { DataSource, DataSourceOptions } from 'typeorm';
import dotenv from 'dotenv';
import path from 'path';
import { User } from '../entities/User';
import { UserSession } from '../entities/UserSession';
import { AuditLog } from '../entities/AuditLog';
import { Customer } from '../entities/Customer';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

const dataSourceOptions: DataSourceOptions = {
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'followmee',
  synchronize: !isProduction, // Set to false in production

  // วิธีเปิดปิด logging ใน Terminal
  // logging: !isProduction,
  logging: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : false,
  
  entities: [
    User,
    UserSession,
    AuditLog,
    Customer,
    // Other entities will be loaded automatically by the glob pattern
    path.join(__dirname, '../entities/**/*.entity{.ts,.js}')
  ],
  migrations: [
    path.join(__dirname, '../migrations/**/*{.ts,.js}')
  ],
  subscribers: [],
  migrationsRun: true,
};

// Log the database connection options
console.log('Database connection options:', {
  host: dataSourceOptions.host,
  port: dataSourceOptions.port,
  database: dataSourceOptions.database,
  username: dataSourceOptions.username,
  entities: dataSourceOptions.entities
});

const dataSource = new DataSource(dataSourceOptions);

export default dataSource;
