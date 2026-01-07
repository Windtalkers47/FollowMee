/**
 * Environment Variable Utilities
 * 
 * Provides type-safe access to environment variables and utility functions
 * for working with feature flags and environment-specific configurations.
 */

import { API_BASE_URL } from '../api/config';

/**
 * Get the current environment (development, production, test)
 */
export const getEnv = (): 'development' | 'production' | 'test' => {
  return import.meta.env.VITE_NODE_ENV || 'development';
};

/**
 * Check if the app is running in development mode
 */
export const isDev = (): boolean => getEnv() === 'development';

/**
 * Check if the app is running in production mode
 */
export const isProd = (): boolean => getEnv() === 'production';

/**
 * Check if a feature is enabled
 * @param feature - The feature flag to check (without VITE_FEATURE_ prefix)
 * @returns boolean - True if the feature is enabled
 */
export const isFeatureEnabled = (feature: string): boolean => {
  const value = import.meta.env[`VITE_FEATURE_${feature.toUpperCase()}`];
  return value === 'true' || value === true;
};

/**
 * Get an environment variable with type safety
 * @param key - The environment variable key (without VITE_ prefix)
 * @param defaultValue - Default value if the environment variable is not set
 * @returns The environment variable value or the default value
 */
export const getEnvVar = <T extends string | number | boolean>(
  key: string,
  defaultValue: T
): T => {
  const value = import.meta.env[`VITE_${key}`];
  
  if (value === undefined) {
    return defaultValue;
  }

  // Type conversion based on the type of defaultValue
  if (typeof defaultValue === 'boolean') {
    return (value === 'true' || value === true) as T;
  } else if (typeof defaultValue === 'number') {
    return (value ? Number(value) : defaultValue) as T;
  }

  return (value as string) as T;
};

// Export commonly used environment variables
export const env = {
  // App Info
  appName: import.meta.env.VITE_APP_NAME || 'FollowMee',
  
  // API - Using the centralized API_BASE_URL from config.ts
  apiUrl: API_BASE_URL,
  
  // Auth
  defaultLoginRedirect: import.meta.env.VITE_DEFAULT_LOGIN_REDIRECT || '/dashboard',
  defaultLogoutRedirect: import.meta.env.VITE_DEFAULT_LOGOUT_REDIRECT || '/',
  
  // Feature Flags
  features: {
    registration: isFeatureEnabled('REGISTRATION'),
    passwordReset: isFeatureEnabled('PASSWORD_RESET'),
    socialLogin: isFeatureEnabled('SOCIAL_LOGIN'),
  },
  
  // Environment
  isDev: isDev(),
  isProd: isProd(),
  env: getEnv(),
};
