import { beforeEach, describe, expect, it } from 'vitest';
import { allowsAnalytics, CONSENT_VERSION, readConsent, saveConsent } from '../../utils/consentPreferences';
describe('consent preferences', () => {
  beforeEach(() => localStorage.clear());
  it('keeps optional analytics off until explicit consent', () => { expect(readConsent()).toBeNull(); expect(allowsAnalytics()).toBe(false); });
  it('accepts only the current version', () => { saveConsent({ version: CONSENT_VERSION, essential: true, preferences: false, analytics: true, decidedAt: new Date().toISOString() }); expect(allowsAnalytics()).toBe(true); localStorage.setItem('followmee:consent', JSON.stringify({ version: 'old', essential: true, analytics: true })); expect(readConsent()).toBeNull(); });
});
