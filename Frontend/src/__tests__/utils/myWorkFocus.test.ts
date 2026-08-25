import { describe, expect, it } from 'vitest';
import { resolveMyWorkFocus } from '../../utils/myWorkFocus';

describe('My Work deep-link focus', () => {
  it('accepts actionable filters and rejects unknown values', () => {
    expect(resolveMyWorkFocus('blocked')).toBe('blocked');
    expect(resolveMyWorkFocus('due_today')).toBe('due_today');
    expect(resolveMyWorkFocus('not-a-filter')).toBe('all');
  });
});
