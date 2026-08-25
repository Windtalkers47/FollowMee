export const CONSENT_VERSION = '2026-08';
export type ConsentPreferences = { version: string; essential: true; preferences: boolean; analytics: boolean; decidedAt: string };
const KEY = 'followmee:consent';
export const readConsent = (): ConsentPreferences | null => {
  try { const value = JSON.parse(localStorage.getItem(KEY) || 'null') as ConsentPreferences | null; return value?.version === CONSENT_VERSION ? value : null; } catch { return null; }
};
export const saveConsent = (value: ConsentPreferences) => localStorage.setItem(KEY, JSON.stringify(value));
export const allowsAnalytics = () => readConsent()?.analytics === true;
export const consentAnonymousId = () => {
  const key = 'followmee:consent-subject'; let value = localStorage.getItem(key);
  if (!value) { value = crypto.randomUUID(); localStorage.setItem(key, value); }
  return value;
};
