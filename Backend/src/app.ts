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
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

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

// Load environment variables
dotenv.config();

class App {
  private port: number;
  private app: express.Application;
  private database: any;
  private apiPath = '/api';

  constructor() {
    this.app = express();
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

  // Initialize database connection
  private async initializeDatabase(): Promise<void> {
    try {
      if (!this.database.isInitialized) {
        await this.database.initialize();
        logger.info('Database connection has been established successfully.');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error : new Error('Unknown database error');
      logger.error(`Unable to connect to the database: ${errorMessage.message}`);
      throw errorMessage;
    }
  }

  private initializeMiddlewares(): void {
    // Enable CORS with credentials
    this.app.use(cors({
      origin: function(origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        const allowedOrigins = [
          'http://localhost:3000',
          'http://localhost:5173',
          process.env.FRONTEND_URL || ''
        ].filter(Boolean) as string[];

        if (allowedOrigins.includes(origin) || allowedOrigins.some(allowed => origin?.startsWith(allowed))) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-application-name'],
      exposedHeaders: ['set-cookie']
    }));

    // Parse JSON request body
    this.app.use(express.json({ limit: '10mb' })); //  JSON parsing limit to 10MB

    // Parse urlencoded request body
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' })); // URL encoded parsing limit to 10MB

    // Parse cookies
    this.app.use(cookieParser());

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
    this.app.get('/health', (req: Request, res: Response) => {
      res.status(200).json({ status: 'UP' });
    });

    // Swagger API Documentation
    this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
      explorer: true,
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'FollowMee API Docs',
    }));

    // API routes
    this.app.use('/api/auth', authRoutes);
    
    // Customer profile routes (more specific, must come before general customer routes)
    this.app.use('/api/customers/profile', customerProfileRoutes);

    // Customer routes
    this.app.use('/api/customers', customerRoutes);

    // User management routes
    this.app.use('/api/user-management', userManagementRoutes);

    // User routes
    this.app.use('/api/users', userRoutes);

    // Task routes
    this.app.use('/api/tasks', taskRoutes);
    this.app.use('/api/tasks', taskImageRoutes);
    this.app.use('/api/tasks/:taskId/comments', taskCommentRoutes);
    this.app.use('/api/tasks/:taskId/likes', taskLikeRoutes);
    this.app.use('/api/tasks/comments', commentReactionRoutes);

    // Notification routes
    this.app.use('/api/notifications', notificationRoutes);

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
      console.error(err.stack);
      res.status(500).json({
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err.message : {}
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

      // Initialize Socket.io
      const io = new SocketIOServer(httpServer, {
        cors: {
          origin: process.env.FRONTEND_URL || 'http://localhost:5173',
          credentials: true,
        },
      });

      // Initialize WebSocket service
      webSocketService.initialize(io);

      logger.info('WebSocket service initialized');

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
      const errorMessage = error instanceof Error ? error : new Error('Failed to start the server');
      logger.error(`Server startup error: ${errorMessage.message}`);
      process.exit(1);
    }
  }
}

export default App;