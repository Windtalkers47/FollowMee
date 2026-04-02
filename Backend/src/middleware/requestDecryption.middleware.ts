import { Request, Response, NextFunction } from 'express';

// Simple XOR decryption for development
// Use same key as frontend
const DECRYPTION_KEY = 'dev-key-change-in-production'; // Default key

const xorDecrypt = (str: string, key: string): string => {
  try {
    // The frontend uses btoa() which creates base64, so we need to decode it first
    const decoded = Buffer.from(str, 'base64').toString();
    let result = '';
    for (let i = 0; i < decoded.length; i++) {
      result += String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return result;
  } catch (error) {
    console.error('Decryption error:', error);
    return '';
  }
};

/**
 * Middleware to decrypt encrypted request body
 * Only active in development
 */
export const decryptRequestMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Skip decryption in production
  if (process.env.NODE_ENV === 'production') {
    return next();
  }

  try {
    // Check if request body is encrypted
    if (req.body && req.body.encrypted) {
      const decrypted = xorDecrypt(req.body.data, DECRYPTION_KEY);
      
      if (decrypted) {
        req.body = JSON.parse(decrypted);
      }
    }
    
    next();
  } catch (error) {
    console.error('Request decryption error:', error);
    return next();
  }
};
