import 'reflect-metadata';
import App from './app';
import { logger } from './utils/logger';

async function bootstrap() {
  try {
    // Create the application
    const app = new App();
    
    // Initialize the application (including database connection)
    await app.initialize();
    
    // Start the server
    await app.start();
    
    logger.info(`Application is up and running on port ${app.getPort()}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error : new Error('Failed to start the application');
    logger.error(`Application startup error: ${errorMessage.message}`);
    process.exit(1);
  }
}

// Start the application
bootstrap();