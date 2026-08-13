import 'reflect-metadata';
import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import dataSource from './config/database';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger.config';
import { logger } from './utils/logger';
import { processObjectDates } from './utils/date.utils';
import { NotificationHelper } from './utils/notification.util';
import { NotificationService } from './services/notification.service';
import { webSocketService } from './services/websocket.service';
import { notificationQueueService } from './services/notification-queue.service';
import { notificationCleanupService } from './services/notification-cleanup.service';
import { taskDeadlineNotificationService } from './services/task-deadline-notification.service';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import rateLimit from 'express-rate-limit';
import { getAllowedOrigins, isAllowedOrigin, verifyMutationOrigin } from './config/security.config';
import { formatDatabaseConnectionError } from './utils/database-error.util';
import crypto from 'crypto';

// Import routes
import authRoutes from './routes/auth.routes';
import customerRoutes from './routes/customer.routes';
import customerProfileRoutes from './routes/customer-profile.routes';
import userManagementRoutes from './routes/user-management.routes';
import userRoutes from './routes/user.routes';
import taskRoutes from './routes/task.routes';
import taskImageRoutes from './routes/task-image.routes';
import taskCommentRoutes from './routes/task-comment.routes';
import taskLikeRoutes from './routes/task-like.routes';
import commentReactionRoutes from './routes/comment-reaction.routes';
import notificationRoutes from './routes/notification.routes';
import dashboardRoutes from './routes/dashboard.routes';
import publicProfileRoutes from './routes/public-profile.routes';
import userPreferenceRoutes from './routes/user-preference.routes';
import rewardRoutes from './routes/reward.routes';
import adminRewardRoutes from './routes/admin-reward.routes';
import productivityRoutes from './routes/productivity.routes';
import analyticsRoutes from './routes/analytics.routes';
import userProfileRoutes from './routes/user-profile.routes';
import { rewardService } from './services/reward.service';
import { outboxService } from './services/outbox.service';
import { productivityService } from './services/productivity.service';

// Load environment variables
dotenv.config();

class App {
  private port: number;
  private app: express.Application;
  private database: any;
  private apiPath = '/api';

  constructor() {
    this.app = express();
    if (process.env.NODE_ENV === 'production') {
      this.app.set('trust proxy', 1);
    }
    this.port = parseInt(process.env.PORT || '5000');
    this.database = dataSource;
  }

  // Initialize the application
  public async initialize() {
    try {
      // Initialize database first
      await this.initializeDatabase();

      // Initialize notification helper
      const notificationService = new NotificationService(this.database);
      NotificationHelper.initialize(notificationService);

      // Initialize notification services
      await this.initializeNotificationServices(notificationService);
      await rewardService.ensureDevelopmentSeed();
      rewardService.startExpiryWorker();
      outboxService.start();
      productivityService.startRecurrenceWorker();

      // Then set up other middleware and routes
      this.initializeMiddlewares();
      this.initializeRoutes();
      this.initializeErrorHandling();

      logger.info('Application initialized successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error : new Error('Unknown error during initialization');
      logger.error('Failed to initialize application:', errorMessage);
      throw errorMessage;
    }
  }

  // Get the port number
  public getPort(): number {
    return this.port;
  }

  // Initialize notification services
  private async initializeNotificationServices(notificationService: NotificationService): Promise<void> {
    // Initialize notification queue service (W2-RATE-LIMIT - Database backed)
    notificationQueueService.initialize(notificationService);
    await notificationQueueService.loadPending();

    // Initialize notification cleanup service (NEW-SOFT-DELETE-CLEANUP)
    notificationCleanupService.start();
    taskDeadlineNotificationService.start();
  }

  // Graceful shutdown
  public async gracefulShutdown(): Promise<void> {
    logger.info('Starting graceful shutdown...');

    try {
      // Flush all queued notifications
      await notificationQueueService.flushAll();
      notificationQueueService.clearAll();
      taskDeadlineNotificationService.stop();
      rewardService.stopExpiryWorker();
      outboxService.stop();
      productivityService.stopRecurrenceWorker();

      // Stop cleanup service
      notificationCleanupService.stop();

      logger.info('Graceful shutdown completed');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Error during graceful shutdown: ${errorMessage}`);
    }
  }

  // Initialize database connection
  private async initializeDatabase(): Promise<void> {
    if (this.database.isInitialized) return;

    const isProduction = process.env.NODE_ENV === 'production';
    const maxAttempts = Math.max(1, Number(
      process.env.DB_CONNECT_RETRIES || (isProduction ? 5 : 1),
    ));
    const baseDelayMs = Math.max(100, Number(process.env.DB_RETRY_DELAY_MS || 1_000));
    const host = process.env.DB_HOST || 'localhost';
    const port = Number(process.env.DB_PORT || 3306);
    let finalMessage = 'Database connection failed.';

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        await this.database.initialize();
        logger.info('Database connection has been established successfully.');
        return;
      } catch (error) {
        finalMessage = formatDatabaseConnectionError(error, {
          host,
          port,
          exposeDetails: !isProduction,
        });

        if (attempt < maxAttempts) {
          const delayMs = Math.min(baseDelayMs * (2 ** (attempt - 1)), 10_000);
          logger.warn(`Database unavailable (attempt ${attempt}/${maxAttempts}). Retrying in ${delayMs}ms.`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }

    logger.error(`Unable to connect to the database: ${finalMessage}`);
    throw new Error(finalMessage);
  }

  private initializeMiddlewares(): void {
    this.app.disable('x-powered-by');
    this.app.use(helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }));

    // Enable CORS with credentials
    this.app.use(cors({
      origin: function(origin, callback) {
        callback(null, isAllowedOrigin(origin));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-application-name', 'x-user-locale'],
      exposedHeaders: ['set-cookie', 'x-request-id']
    }));

    // Parse JSON request body
    this.app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '6mb' }));

    // Parse urlencoded request body
    this.app.use(express.urlencoded({ extended: true, limit: process.env.JSON_BODY_LIMIT || '6mb' }));

    // Parse cookies
    this.app.use(cookieParser());
    this.app.use((req, res, next) => {
      const requestId = req.get('x-request-id') || crypto.randomUUID();
      res.locals.requestId = requestId;
      res.setHeader('x-request-id', requestId);
      next();
    });
    this.app.use(verifyMutationOrigin);

    this.app.use('/api', rateLimit({
      windowMs: 60_000,
      limit: Number(process.env.API_RATE_LIMIT_PER_MINUTE || 300),
      standardHeaders: true,
      legacyHeaders: false,
      skip: req => req.path === '/health',
    }));

    // Logger middleware
    if (process.env.NODE_ENV === 'development') {
      this.app.use(morgan('dev'));
    }

    // Apply response interceptor to format dates
    this.app.use((req, res, next) => {
      const originalJson = res.json.bind(res);
      res.json = function (data: any) {
        // Only process if data exists and is an object
        if (data && typeof data === 'object') {
          // If it's an object with data property (common pattern in your responses)
          if ('data' in data) {
            data.data = processObjectDates(data.data);
          } else {
            data = processObjectDates(data);
          }
        }
        return originalJson(data);
      };
      next();
    });
  }

  private initializeRoutes(): void {
    // Health check endpoint
    this.app.get('/health', async (req: Request, res: Response) => {
      try {
        if (!this.database.isInitialized) throw new Error('Database is not initialized');
        await this.database.query('SELECT 1');
        res.status(200).json({ status: 'UP', database: 'UP' });
      } catch {
        res.status(503).json({ status: 'DEGRADED', database: 'DOWN' });
      }
    });

    // Swagger API Documentation
    if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_API_DOCS === 'true') {
      this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
        explorer: true,
        customCss: '.swagger-ui .topbar { display: none }',
        customSiteTitle: 'FollowMee API Docs',
      }));
    }

    // API routes
    this.app.use('/api/auth', authRoutes);
    
    // Customer profile routes (more specific, must come before general customer routes)
    this.app.use('/api/customers/profile', customerProfileRoutes);

    // Customer routes
    this.app.use('/api/customers', customerRoutes);

    // Public profile management and public landing-card delivery
    this.app.use('/api/public-profiles', publicProfileRoutes);

    // User management routes
    this.app.use('/api/user-management', userManagementRoutes);

    // User routes
    this.app.use('/api/users', userRoutes);
    this.app.use('/api/user-preferences', userPreferenceRoutes);
    this.app.use('/api/user-profiles', userProfileRoutes);
    this.app.use('/api/rewards', rewardRoutes);
    this.app.use('/api/admin/rewards', adminRewardRoutes);
    this.app.use('/api/productivity', productivityRoutes);
    this.app.use('/api/analytics', analyticsRoutes);

    // Task routes
    this.app.use('/api/tasks', taskRoutes);
    this.app.use('/api/tasks', taskImageRoutes);
    this.app.use('/api/tasks/:taskId/comments', taskCommentRoutes);
    this.app.use('/api/tasks/:taskId/likes', taskLikeRoutes);
    this.app.use('/api/tasks/comments', commentReactionRoutes);

    // Notification routes
    this.app.use('/api/notifications', notificationRoutes);

    // Dashboard routes
    this.app.use('/api/dashboard', dashboardRoutes);

    // 404 handler
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({ message: 'Not Found' });
    });
  }

  private initializeErrorHandling(): void {
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      logger.info(`${req.method} ${req.path}`);
      next();
    });

    this.app.use((err: any, req: Request, res: Response, next: NextFunction) => {
      const statusCode = Number(err?.statusCode) || 500;
      const isTaskTransition = err?.code === 'INVALID_TASK_TRANSITION';
      const isTaskAction = err?.code === 'TASK_ACTION_FORBIDDEN' || err?.code === 'INVALID_TASK_ACTION';
      if (statusCode >= 500) console.error(err.stack);
      res.status(statusCode).json({
        message: err?.message || 'Internal Server Error',
        ...(err?.code ? { code: err.code } : {}),
        ...(err?.details ? { details: err.details } : {}),
        ...(err?.messageKey ? { messageKey: err.messageKey } : {}),
        ...(err?.currentVersion ? { currentVersion: err.currentVersion } : {}),
        requestId: res.locals.requestId,
        ...(err?.code === 'INVALID_TASK_PAYLOAD' ? { code: err.code, fields: err.fields } : {}),
        ...(isTaskTransition ? {
          code: err.code,
          currentStatus: err.currentStatus,
          requestedStatus: err.requestedStatus,
          allowedTransitions: err.allowedTransitions,
        } : {}),
        ...(isTaskAction ? {
          code: err.code,
          action: err.action,
          currentStatus: err.currentStatus,
        } : {}),
        ...(statusCode >= 500 && process.env.NODE_ENV === 'development' ? { error: err.message } : {})
      });
    });
  }



  private getIpAddress(): string {
    const interfaces = require('os').networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        const { address, family, internal } = iface;
        if (family === 'IPv4' && !internal) {
          return address;
        }
      }
    }
    return '0.0.0.0';
  }

  public async start(): Promise<void> {
    try {
      // Create HTTP server
      const httpServer = createServer(this.app);

      // Initialize Socket.io with CORS for production
      const allowedOrigins = getAllowedOrigins();

      const io = new SocketIOServer(httpServer, {
        cors: {
          origin: function(origin, callback) {
            // Allow requests with no origin (like mobile apps or curl requests)
            if (!origin) return callback(null, true);
            
            // Check if origin is in allowed list
            if (allowedOrigins.includes(origin.replace(/\/$/, ''))) {
              callback(null, true);
            } else {
              callback(new Error('Not allowed by CORS'));
            }
          },
          credentials: true,
        },
      });

      // Initialize WebSocket service
      webSocketService.initialize(io);

      logger.info('WebSocket service initialized');

      // Set up graceful shutdown handlers
      const appInstance = this;
      process.on('SIGTERM', async () => {
        logger.info('SIGTERM received, shutting down gracefully...');
        await appInstance.gracefulShutdown();
        process.exit(0);
      });

      process.on('SIGINT', async () => {
        logger.info('SIGINT received, shutting down gracefully...');
        await appInstance.gracefulShutdown();
        process.exit(0);
      });

      // Start the server
      return new Promise((resolve) => {
        httpServer.listen(this.port, () => {
          const ip = this.getIpAddress();
          logger.info(`Server is running on http://${ip}:${this.port}`);
          logger.info(`API Documentation: http://${ip}:${this.port}/api-docs`);
          logger.info(`WebSocket server is running on ws://${ip}:${this.port}`);
          resolve();
        });
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error : Error(error instanceof Error ? error.message : String(error));
      logger.error(`Server startup error: ${errorMessage.message}`);
      process.exit(1);
    }
  }
}

export default App;
