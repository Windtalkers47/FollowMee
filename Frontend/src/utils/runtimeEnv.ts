export const runtimeUrl = (name: 'VITE_API_URL' | 'VITE_WS_URL', developmentFallback: string): string => {
  const configured = import.meta.env[name]?.trim();
  if (configured) return configured.replace(/\/$/, '');
  if (import.meta.env.PROD) {
    throw new Error(`${name} is required for a production build.`);
  }
  return developmentFallback;
};

export const API_URL = runtimeUrl('VITE_API_URL', 'http://localhost:5000/api');
export const WS_URL = runtimeUrl('VITE_WS_URL', 'http://localhost:5000');
