import { canUsePublicRegistration } from '../../utils/registrationPolicy';

describe('registration policy', () => {
  it('always keeps production invite-only', () => {
    expect(canUsePublicRegistration(false, true)).toBe(false);
    expect(canUsePublicRegistration(false, false)).toBe(false);
  });

  it('allows local public registration only behind the feature flag', () => {
    expect(canUsePublicRegistration(true, true)).toBe(true);
    expect(canUsePublicRegistration(true, false)).toBe(false);
  });
});
