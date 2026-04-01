/**
 * Cryptographic utilities for client-side security
 */

/**
 * Hash a string using SHA-256
 * @param data - The string to hash
 * @returns Promise<string> - The hex-encoded hash
 */
export async function sha256(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Hash a password with a salt for client-side obfuscation
 * Note: This is NOT a substitute for server-side hashing with bcrypt
 * This only prevents the raw password from being visible in network requests
 * @param password - The plain text password
 * @param salt - Optional salt (defaults to a fixed salt for consistency)
 * @returns Promise<string> - The hashed password
 */
export async function hashPassword(password: string, salt: string = 'followmee-client-salt'): Promise<string> {
  const saltedPassword = password + salt;
  return await sha256(saltedPassword);
}

/**
 * Generate a random string for additional security
 * @param length - The length of the random string
 * @returns string - Random string
 */
export function generateRandomString(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
