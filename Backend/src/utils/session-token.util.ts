import crypto from 'crypto';

export const hashSessionToken = (token: string): string =>
  crypto.createHash('sha256').update(token, 'utf8').digest('hex');

export const createSessionToken = (): string => crypto.randomBytes(32).toString('base64url');
