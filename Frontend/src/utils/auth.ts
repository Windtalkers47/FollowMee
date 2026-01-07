// Token storage keys
const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const TOKEN_EXPIRY_KEY = 'token_expiry';

// Save tokens to storage
const setAuthToken = (accessToken: string, refreshToken: string, rememberMe: boolean): void => {
  if (rememberMe) {
    // Store in localStorage for persistent sessions
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    
    // Set token expiry (1 day from now)
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 1);
    localStorage.setItem(TOKEN_EXPIRY_KEY, expiry.toISOString());
  } else {
    // Store in sessionStorage for session-only
    sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
};

// Get access token
const getAccessToken = (): string | null => {
  return localStorage.getItem(ACCESS_TOKEN_KEY) || sessionStorage.getItem(ACCESS_TOKEN_KEY);
};

// Get refresh token
const getRefreshToken = (): string | null => {
  return localStorage.getItem(REFRESH_TOKEN_KEY) || sessionStorage.getItem(REFRESH_TOKEN_KEY);
};

// Check if token is expired
const isTokenExpired = (): boolean => {
  const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
  if (!expiry) return true;
  return new Date(expiry) < new Date();
};

// Clear all auth data
const clearAuthToken = (): void => {
  // Clear from both storage types to be safe
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
};

// Check if user is authenticated
const isAuthenticated = (): boolean => {
  const token = getAccessToken();
  if (!token) return false;
  
  // If using localStorage, check expiry
  if (localStorage.getItem(ACCESS_TOKEN_KEY)) {
    return !isTokenExpired();
  }
  
  // For sessionStorage, just check if token exists
  return true;
};

export {
  setAuthToken,
  getAccessToken,
  getRefreshToken,
  clearAuthToken,
  isAuthenticated,
  isTokenExpired,
};
