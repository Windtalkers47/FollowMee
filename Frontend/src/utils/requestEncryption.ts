// Simple XOR-based encryption for development
// In production, use proper TLS/HTTPS
const ENCRYPTION_KEY = import.meta.env.VITE_ENCRYPTION_KEY || 'dev-key-change-in-production';

/**
 * Simple XOR encryption for development obfuscation
 * Note: This is basic obfuscation, not real security
 */
const xorEncrypt = (str: string, key: string): string => {
  let result = '';
  for (let i = 0; i < str.length; i++) {
    result += String.fromCharCode(str.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return btoa(result);
};

const xorDecrypt = (str: string, key: string): string => {
  try {
    const decoded = atob(str);
    let result = '';
    for (let i = 0; i < decoded.length; i++) {
      result += String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return result;
  } catch (error) {
    return '';
  }
};

/**
 * Encrypt sensitive request data
 * Note: This is basic obfuscation for development only
 * Real security comes from HTTPS + proper backend hashing
 */
export const encryptRequestData = (data: any): any => {
  if (import.meta.env.PROD) {
    // In production, rely on HTTPS - don't encrypt
    return data;
  }

  try {
    const jsonString = JSON.stringify(data);
    const encrypted = xorEncrypt(jsonString, ENCRYPTION_KEY);
    
    return {
      encrypted: true,
      data: encrypted,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('Encryption error:', error);
    return data; // Fallback to unencrypted
  }
};

/**
 * Decrypt response data
 */
export const decryptResponseData = (response: any): any => {
  if (import.meta.env.PROD || !response?.encrypted) {
    return response;
  }

  try {
    const decrypted = xorDecrypt(response.data, ENCRYPTION_KEY);
    return JSON.parse(decrypted);
  } catch (error) {
    console.error('Decryption error:', error);
    return response; // Fallback to original response
  }
};

/**
 * Mask sensitive fields for logging
 */
export const maskSensitiveData = (data: any): any => {
  if (!data || typeof data !== 'object') return data;

  const sensitive = ['password', 'userPassword', 'token', 'secret'];
  const masked = { ...data };

  for (const key of Object.keys(masked)) {
    if (sensitive.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
      masked[key] = '***MASKED***';
    }
  }

  return masked;
};
