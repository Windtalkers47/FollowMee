import { apiConfig } from '../api/config';
import { allowsAnalytics, CONSENT_VERSION } from './consentPreferences';
const KEY = 'followmee:product-funnel-session';
export const productFunnelSessionId = () => { let value = sessionStorage.getItem(KEY); if (!value) { value = crypto.randomUUID(); sessionStorage.setItem(KEY, value); } return value; };
export const recordProductFunnel = (eventType: string, metadata?: Record<string, unknown>) => {
  if (!allowsAnalytics()) return;
  void fetch(`${apiConfig.baseURL}/product-analytics/events`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ eventType, sessionId: productFunnelSessionId(), consentVersion: CONSENT_VERSION, metadata }), keepalive: true }).catch(() => undefined);
};
