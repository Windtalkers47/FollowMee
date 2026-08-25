import { validatePublicLinkTarget } from '../../services/profile-platform.service';

describe('public profile link safety', () => {
  it.each([
    ['http://127.0.0.1/admin', 'invalid'],
    ['http://10.0.0.1/private', 'invalid'],
    ['javascript:alert(1)', 'invalid'],
    ['file:///etc/passwd', 'invalid'],
    ['mailto:not-an-email', 'invalid'],
    ['tel:12', 'invalid'],
  ])('blocks unsafe or malformed target %s', async (target, expected) => {
    await expect(validatePublicLinkTarget(target)).resolves.toMatchObject({ status: expected });
  });

  it.each(['mailto:hello@example.com', 'tel:+66 81 234 5678'])('accepts a valid non-network target %s', async target => {
    await expect(validatePublicLinkTarget(target)).resolves.toMatchObject({ status: 'ok', httpStatus: null });
  });
});
