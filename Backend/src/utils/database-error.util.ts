export interface DatabaseConnectionContext {
  host: string;
  port: number;
  exposeDetails?: boolean;
}

interface ErrorLike {
  code?: string;
  errno?: string | number;
  syscall?: string;
  address?: string;
  port?: number;
  message?: string;
  errors?: unknown[];
  cause?: unknown;
}

const asErrorLike = (value: unknown): ErrorLike | undefined =>
  value && typeof value === 'object' ? value as ErrorLike : undefined;

const flattenErrors = (error: unknown, seen = new Set<unknown>()): ErrorLike[] => {
  if (!error || seen.has(error)) return [];
  seen.add(error);

  const current = asErrorLike(error);
  if (!current) return [];

  return [
    current,
    ...(current.errors || []).flatMap(child => flattenErrors(child, seen)),
    ...flattenErrors(current.cause, seen),
  ];
};

const guidanceForCode = (code?: string): string => {
  switch (code) {
    case 'ECONNREFUSED':
      return 'Start MySQL in the XAMPP Control Panel, then try again.';
    case 'ETIMEDOUT':
    case 'PROTOCOL_CONNECTION_LOST':
      return 'Check that MySQL is running and that the configured host and port are reachable.';
    case 'ER_ACCESS_DENIED_ERROR':
      return 'Check DB_USERNAME and DB_PASSWORD in Backend/.env.';
    case 'ER_BAD_DB_ERROR':
      return 'Create the configured database or restore the FollowMee backup before starting the app.';
    default:
      return 'Check the database service and Backend/.env, then try again.';
  }
};

export const getDatabaseErrorCode = (error: unknown): string | undefined =>
  flattenErrors(error).find(item => item.code)?.code;

export const formatDatabaseConnectionError = (
  error: unknown,
  context: DatabaseConnectionContext,
): string => {
  const code = getDatabaseErrorCode(error) || 'DATABASE_CONNECTION_ERROR';
  if (!context.exposeDetails) {
    return `Database connection failed (${code}).`;
  }

  return `${code} ${context.host}:${context.port} — ${guidanceForCode(code)}`;
};
