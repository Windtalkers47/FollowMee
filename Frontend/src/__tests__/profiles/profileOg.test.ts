import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@vercel/og', () => ({
  ImageResponse: class MockImageResponse {
    element: unknown;
    options: Record<string, unknown>;
    constructor(element: unknown, options: Record<string, unknown>) {
      this.element = element;
      this.options = options;
    }
  },
}));

import handler, { config } from '../../../api/profile-og';

describe('profile OG image function', () => {
  beforeEach(() => {
    process.env.VITE_API_URL = 'https://api.example.test/api';
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 404 })));
  });

  it('runs on the edge runtime and reads slug from the request URL', async () => {
    const response = await handler({ url: 'https://profiles.example.test/api/profile-og?slug=hello-profile' });

    expect(config.runtime).toBe('edge');
    expect(fetch).toHaveBeenCalledWith(
      'https://api.example.test/api/public-profiles/public/hello-profile/meta',
      expect.anything(),
    );
    expect(response.options).toMatchObject({ width: 1200, height: 630, status: 404 });
  });
});
