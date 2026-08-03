import { DataSource, DataSourceOptions } from 'typeorm';
import dotenv from 'dotenv';
import path from 'path';
import { User } from '../entities/User';
import { UserSession } from '../entities/UserSession';
import { AuditLog } from '../entities/AuditLog';
import { Customer } from '../entities/Customer';
import { Role } from '../entities/Role';
import { Permission } from '../entities/Permission';
import { RolePermission } from '../entities/RolePermission';
import { UserRole } from '../entities/UserRole';
import { Task } from '../entities/Task';
import { TaskImage } from '../entities/TaskImage';
import { TaskComment } from '../entities/TaskComment';
import { TaskLike } from '../entities/TaskLike';
import { CommentReaction } from '../entities/CommentReaction';
import { Notification } from '../entities/Notification';
import { NotificationRecipient } from '../entities/NotificationRecipient';
import { NotificationGroupActor } from '../entities/NotificationGroupActor';
import { UserNotificationSettings } from '../entities/UserNotificationSettings';
import { NotificationQueue } from '../entities/NotificationQueue';
import { NotificationMetric } from '../entities/NotificationMetric';
import { PublicProfile } from '../entities/PublicProfile';
import { PublicProfileLink } from '../entities/PublicProfileLink';
import { PublicProfileEvent } from '../entities/PublicProfileEvent';
import { PushSubscription } from '../entities/PushSubscription';
import { UserPreference } from '../entities/UserPreference';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';
const sslCa = process.env.DB_SSL_CA_BASE64
  ? Buffer.from(process.env.DB_SSL_CA_BASE64, 'base64').toString('utf8')
  : undefined;

const dataSourceOptions: DataSourceOptions = {
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'followmee',
  synchronize: false, // Always use migrations instead of auto-sync
  ssl: process.env.DB_SSL === 'true'
    ? { rejectUnauthorized: true, ...(sslCa ? { ca: sslCa } : {}) }
    : undefined,
  connectTimeout: Number(process.env.DB_CONNECT_TIMEOUT_MS || 10_000),
  extra: {
    connectionLimit: Number(process.env.DB_POOL_SIZE || (isProduction ? 10 : 5)),
    enableKeepAlive: true,
    keepAliveInitialDelay: 10_000,
  },

  // วิธีเปิดปิด logging ใน Terminal
  // logging: !isProduction,
  logging: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : false,
  
  entities: [
    User,
    UserSession,
    AuditLog,
    Customer,
    Role,
    Permission,
    RolePermission,
    UserRole,
    Task,
    TaskImage,
    TaskComment,
    TaskLike,
    CommentReaction,
    Notification,
    NotificationRecipient,
    NotificationGroupActor,
    UserNotificationSettings,
    NotificationQueue,
    NotificationMetric,
    PublicProfile,
    PublicProfileLink,
    PublicProfileEvent,
    PushSubscription,
    UserPreference,
    // Other entities will be loaded automatically by the glob pattern
    path.join(__dirname, '../entities/**/*.entity{.ts,.js}')
  ],
  migrations: [
    path.join(__dirname, '../migrations/**/*{.ts,.js}')
  ],
  subscribers: [],
  migrationsRun: false,
};

// Log the database connection options
// console.log('Database connection options:', {
//   host: dataSourceOptions.host,
//   port: dataSourceOptions.port,
//   database: dataSourceOptions.database,
//   username: dataSourceOptions.username,
//   entities: dataSourceOptions.entities
// });

const dataSource = new DataSource(dataSourceOptions);

export default dataSource;
