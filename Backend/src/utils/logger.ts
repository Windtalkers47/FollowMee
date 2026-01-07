import chalk from 'chalk';

export class Logger {
  private static instance: Logger;
  private readonly appName: string;
  private readonly isProduction: boolean;

  private constructor() {
    this.appName = 'FollowMee Backend';
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private getTimestamp(): string {
    return new Date().toISOString();
  }

  private formatMessage(level: string, message: string, color: chalk.ChalkFunction): string {
    const timestamp = chalk.gray(`[${this.getTimestamp()}]`);
    const app = chalk.blueBright(`[${this.appName}]`);
    const levelStr = color(`[${level}]`);
    return `${timestamp} ${app} ${levelStr} ${message}`;
  }

  public info(message: string): void {
    console.log(this.formatMessage('INFO', message, chalk.blue));
  }

  public success(message: string): void {
    console.log(this.formatMessage('SUCCESS', message, chalk.green));
  }

  public error(message: string, error?: Error): void {
    console.error(this.formatMessage('ERROR', message, chalk.red));
    if (error && !this.isProduction) {
      console.error(chalk.red(error.stack || error.message));
    }
  }

  public warn(message: string): void {
    console.warn(this.formatMessage('WARN', message, chalk.yellow));
  }

  public serverStart(port: number | string): void {
    const divider = '='.repeat(50);
    const title = `${this.appName} is running`;

    // วิธีเปิดปิด ENV Log
    
    // console.log('\n' + divider);
    // console.log(chalk.bold.blue(title));
    // console.log(divider);
    // console.log(`\n${chalk.bold('Server Information:')}`);
    // console.log(`  - Environment: ${chalk.blue(process.env.NODE_ENV || 'development')}`);
    // console.log(`  - Port: ${chalk.blue(port)}`);
    // console.log(`  - URL: ${chalk.blue(`http://localhost:${port}`)}`);
    // console.log(`  - API Docs: ${chalk.blue(`http://localhost:${port}/api-docs`)}`);
    // console.log(`  - Time: ${new Date().toLocaleString()}`);
    // console.log('\n' + divider + '\n');
  }
}

export const logger = Logger.getInstance();
