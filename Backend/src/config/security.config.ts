import type { CookieOptions, Request, Response, NextFunction } from 'express';

export const getAllowedOrigins = (): string[] => [
  'http://localhost:3000',
  'http://localhost:5173',
  process.env.FRONTEND_URL,
  process.env.CORS_ORIGIN,
  ...(process.env.CORS_PREVIEW_ORIGINS || '').split(','),
]
  .filter((value): value is string => Boolean(value?.trim()))
  .map(value => value.trim().replace(/\/$/, ''));

export const isAllowedOrigin = (origin?: string): boolean =>
  !origin || getAllowedOrigins().includes(origin.replace(/\/$/, ''));

export const authCookieOptions = (path = '/'): CookieOptions => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  path,
});

/**
 * Browser mutations using cross-site cookies must originate from an explicitly
 * configured FollowMee frontend. Requests without Origin are retained for
 * trusted server-to-server clients and CLI maintenance tools.
 */
export const verifyMutationOrigin = (req: Request, res: Response, next: NextFunction): void => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    next();
    return;
  }

  const origin = req.get('origin');
  if (origin && !isAllowedOrigin(origin)) {
    res.status(403).json({
      success: false,
      code: 'INVALID_REQUEST_ORIGIN',
      message: 'The request origin is not allowed.',
    });
    return;
  }

  next();
};
