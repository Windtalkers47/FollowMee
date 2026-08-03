import { describe, expect, it } from 'vitest';
import { getSafeInternalPath } from '../../utils/safeNavigation';

describe('getSafeInternalPath', () => {
  it('keeps valid FollowMee paths', () => {
    expect(getSafeInternalPath('/tasks/abc?tab=comments#latest')).toBe('/tasks/abc?tab=comments#latest');
  });

  it.each([
    'https://example.com',
    '//example.com',
    '/\\example.com',
    '/%5cexample.com',
    '/%2fexample.com',
  ])('rejects external or ambiguous path %s', (value) => {
    expect(getSafeInternalPath(value)).toBe('/notifications');
  });
});
