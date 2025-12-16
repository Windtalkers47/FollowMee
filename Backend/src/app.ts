import 'reflect-metadata';
import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dataSource from './config/database';
import dotenv from 'dotenv';
import { logger } from './utils/logger';

// Import routes (we'll create these later)
// import authRoutes from './routes/auth.routes';
// import userRoutes from './routes/user.routes';

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

    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    this.app.use(cors());
    this.app.use(helmet());
    this.app.use(morgan('dev'));
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
  }

  private initializeRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req: Request, res: Response) => {
      res.status(200).json({ status: 'UP' });
    });

    // API routes
    // this.app.use('/api/auth', authRoutes);
    // this.app.use('/api/users', userRoutes);

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

  private async initializeDatabase() {
    try {
      await this.database.initialize();
      // Database connection is now silent
    } catch (error) {
      console.error('Database connection error:', error);
      throw error;
    }
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
      await this.initializeDatabase();
      logger.success('Database connected successfully');

      // Start the server
      this.app.listen(this.port, () => {
        logger.serverStart(this.port);
      });
    } catch (error) {
      console.error('Error starting the server:', error);
      process.exit(1);
    }
  }
}

export default App;