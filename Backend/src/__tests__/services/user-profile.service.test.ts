import { normalizeUserProfileHandle, validateUserProfileHandle } from '../../services/user-profile.service';

describe('user profile handles', () => {
  it('normalizes a display-name suggestion to the public URL format', () => {
    expect(normalizeUserProfileHandle('  Coca Test  ')).toBe('coca-test');
    expect(normalizeUserProfileHandle('A--B___C')).toBe('a-b-c');
  });

  it.each(['ab', 'admin', 'followmee', 'a'.repeat(33)])('rejects invalid or reserved handle %s', value => {
    expect(() => validateUserProfileHandle(value)).toThrow();
  });

  it('accepts a canonical 3-32 character handle', () => {
    expect(validateUserProfileHandle('coca-123')).toBe('coca-123');
  });
});
