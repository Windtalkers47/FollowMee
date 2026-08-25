import { canUsePublicRegistration } from '../../utils/registrationPolicy';

describe('registration policy', () => {
  it('allows production requests only behind the registration feature flag', () => {
    expect(canUsePublicRegistration(false, true)).toBe(true);
    expect(canUsePublicRegistration(false, false)).toBe(false);
  });

  it('allows local public registration only behind the feature flag', () => {
    expect(canUsePublicRegistration(true, true)).toBe(true);
    expect(canUsePublicRegistration(true, false)).toBe(false);
  });
});
