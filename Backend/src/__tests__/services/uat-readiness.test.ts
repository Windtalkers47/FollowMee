import { resolveCapacityThreshold } from '../../services/system-capacity.service';
import { UAT_POLICY_VERSION, validateRegistrationPolicy } from '../../services/registration-request.service';

describe('UAT readiness rules', () => {
  it('does not invent thresholds for provider-only usage', () => {
    expect(resolveCapacityThreshold(99, false)).toBeNull();
    expect(resolveCapacityThreshold(null, true)).toBeNull();
  });
  it.each([[69, null], [70, 70], [86, 85], [96, 95], [105, 100]])('maps verified usage %s to threshold %s', (value, expected) => {
    expect(resolveCapacityThreshold(value, true)).toBe(expected);
  });
  it('requires current terms and privacy versions', () => {
    expect(validateRegistrationPolicy({})).toBe('required');
    expect(validateRegistrationPolicy({ termsAccepted: true, privacyAccepted: true, termsVersion: 'old', privacyVersion: 'old' })).toBe('outdated');
    expect(validateRegistrationPolicy({ termsAccepted: true, privacyAccepted: true, termsVersion: UAT_POLICY_VERSION, privacyVersion: UAT_POLICY_VERSION })).toBe('ok');
  });
});
