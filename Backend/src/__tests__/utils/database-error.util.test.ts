import {
  formatDatabaseConnectionError,
  getDatabaseErrorCode,
} from '../../utils/database-error.util';

describe('database connection error formatting', () => {
  it('extracts a useful code from nested AggregateError-shaped failures', () => {
    const error = {
      message: 'Multiple connection attempts failed',
      errors: [
        { code: 'ECONNREFUSED', address: '::1', port: 3306 },
        { code: 'ECONNREFUSED', address: '127.0.0.1', port: 3306 },
      ],
    };

    expect(getDatabaseErrorCode(error)).toBe('ECONNREFUSED');
    expect(formatDatabaseConnectionError(error, {
      host: 'localhost',
      port: 3306,
      exposeDetails: true,
    })).toContain('Start MySQL in the XAMPP Control Panel');
  });

  it('does not expose connection details in production-safe messages', () => {
    const message = formatDatabaseConnectionError(
      { code: 'ER_ACCESS_DENIED_ERROR', message: 'password=secret' },
      { host: 'private.example', port: 4000, exposeDetails: false },
    );

    expect(message).toBe('Database connection failed (ER_ACCESS_DENIED_ERROR).');
    expect(message).not.toContain('secret');
    expect(message).not.toContain('private.example');
  });
});
