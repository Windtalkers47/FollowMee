/// <reference types="vite/client" />

interface ImportMetaEnv {
  // API Configuration
  readonly VITE_API_URL: string;
  
  // App Configuration
  readonly VITE_APP_NAME: string;
  readonly VITE_NODE_ENV: 'development' | 'production' | 'test';
  
  // Authentication
  readonly VITE_DEFAULT_LOGIN_REDIRECT: string;
  readonly VITE_DEFAULT_LOGOUT_REDIRECT: string;
  
  // Feature Flags
  readonly VITE_FEATURE_REGISTRATION: 'true' | 'false';
  readonly VITE_FEATURE_PASSWORD_RESET: 'true' | 'false';
  readonly VITE_FEATURE_SOCIAL_LOGIN: 'true' | 'false';
  
  // Add more environment variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
