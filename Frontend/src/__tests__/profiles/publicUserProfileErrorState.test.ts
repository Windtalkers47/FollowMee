import { describe, expect, it } from 'vitest';
import { publicProfileErrorState } from '../../utils/publicProfileErrorState';

describe('public user profile error privacy', () => {
  it('keeps all 404 responses in one non-enumerating state', () => {
    expect(publicProfileErrorState(404)).toBe('unavailable');
  });

  it('separates permission and retryable network states', () => {
    expect(publicProfileErrorState(401)).toBe('permission');
    expect(publicProfileErrorState(403)).toBe('permission');
    expect(publicProfileErrorState(500)).toBe('network');
    expect(publicProfileErrorState()).toBe('network');
  });
});
