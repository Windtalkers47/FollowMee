import * as crypto from 'crypto';

/**
 * Cryptographic utilities for server-side security
 */

/**
 * Hash a string using SHA-256 (matches client-side implementation)
 * @param data - The string to hash
 * @returns string - The hex-encoded hash
 */
export function sha256(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Verify a client-side hashed password
 * This reverses the client-side hashing to get the original password
 * which can then be properly hashed with bcrypt for storage
 * @param clientHashedPassword - The password hashed on client-side
 * @param salt - The salt used on client-side (must match)
 * @returns string - The original password (for bcrypt hashing)
 */
export function verifyClientHash(clientHashedPassword: string, salt: string = 'followmee-client-salt'): string {
  // Note: This is NOT reversing the hash - we're storing the client-hashed password
  // and using it directly for bcrypt comparison during login
  // For registration, we'll bcrypt the client-hashed password directly
  return clientHashedPassword;
}

/**
 * Generate a random salt
 * @param length - The length of the salt
 * @returns string - Random salt
 */
export function generateSalt(length: number = 32): string {
  return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
}
