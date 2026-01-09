import 'reflect-metadata';
import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import dataSource from './config/database';
import dotenv from 'dotenv';
import { logger } from './utils/logger';

// Import routes
import authRoutes from './routes/auth.routes';
import customerRoutes from './routes/customer.routes';

// Load environment variables
dotenv.config();

class App {
  private port: number;
  private app: express.Application;
  private database: any;
  private apiPath = '/api';

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || '3000');
    this.database = dataSource;
  }

  // Initialize the application
  public async initialize() {
    try {
      // Initialize database first
      await this.initializeDatabase();
      
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
      origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-application-name'],
      exposedHeaders: ['set-cookie']
    }));

    // Set security HTTP headers
    this.app.use(helmet());

    // Parse JSON request body
    this.app.use(express.json());

    // Parse urlencoded request body
    this.app.use(express.urlencoded({ extended: true }));

    // Parse cookies
    this.app.use(cookieParser());

    // Logger middleware
    if (process.env.NODE_ENV === 'development') {
      this.app.use(morgan('dev'));
    }
  }

  private initializeRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req: Request, res: Response) => {
      res.status(200).json({ status: 'UP' });
    });

    // API routes
    this.app.use('/api/auth', authRoutes);
    
    // Customer routes
    this.app.use('/api/customers', customerRoutes);
    
    // Protected API routes (example)
    // this.app.use('/api/users', authenticateToken, userRoutes);

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
      // Initialize database connection first
      await this.initializeDatabase();
      
      // Start the server
      return new Promise((resolve) => {
        this.app.listen(this.port, () => {
          const ip = this.getIpAddress();
          logger.info(`Server is running on http://${ip}:${this.port}`);
          logger.info(`API Documentation: http://${ip}:${this.port}/api-docs`);
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