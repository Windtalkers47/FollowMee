import { describe, expect, it } from 'vitest';
import { normalizeSocialUrl } from '../../utils/socialUrl';

describe('normalizeSocialUrl', () => {
  it('turns handles into platform URLs and preserves safe URLs', () => {
    expect(normalizeSocialUrl('narisamind', 'facebook')).toBe('https://facebook.com/narisamind');
    expect(normalizeSocialUrl('https://instagram.com/narisamind', 'instagram')).toBe('https://instagram.com/narisamind');
    expect(normalizeSocialUrl('javascript:alert(1)', 'x')).toBeUndefined();
  });
});
