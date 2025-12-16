import App from './app';

// Create and start the application
const app = new App();
app.start().catch(error => {
  console.error('Failed to start the application:', error);
  process.exit(1);
});