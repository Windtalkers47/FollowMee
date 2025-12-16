import { DataSource, DataSourceOptions } from 'typeorm';
import dotenv from 'dotenv';
import path from 'path';

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
  logging: !isProduction,
  entities: [
    path.join(__dirname, '../entities/**/*.entity{.ts,.js}')
  ],
  migrations: [
    path.join(__dirname, '../migrations/*{.ts,.js}')
  ],
  subscribers: [],
  migrationsRun: true,
};

const dataSource = new DataSource(dataSourceOptions);

export default dataSource;
