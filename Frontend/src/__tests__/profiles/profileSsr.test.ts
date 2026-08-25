import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:fs/promises', () => ({ default: { readFile: vi.fn(async () => '<html><head><title>FollowMee</title></head><body><div id="root"></div></body></html>') } }));
import handler from '../../../api/profile';

describe('profile SSR metadata function', () => {
  beforeEach(() => {
    process.env.PROFILE_API_URL = 'https://api.example.test/api';
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL) => {
      const url = String(input);
      if (url.includes('/domain/')) return new Response('{}', { status: 404 });
      return new Response(JSON.stringify({ data: { slug: 'hello-profile', displayName: 'Hello Profile', seoTitle: 'SEO Title', seoDescription: 'SEO Description', robots: 'index,follow', cacheRevision: 'abc', canonicalUrl: null } }), { status: 200, headers: { 'content-type': 'application/json' } });
    }));
  });

  it('replaces the shell title and emits complete social metadata once', async () => {
    let status = 0; const headers = new Map<string, string>(); let body = '';
    const response = { status(code: number) { status = code; return this; }, setHeader(name: string, value: string) { headers.set(name, value); }, send(value: string) { body = value; } };
    await handler({ query: { slug: 'hello-profile' }, headers: { host: 'profiles.example.test', 'x-forwarded-proto': 'https' } }, response);
    expect(status).toBe(200); expect(headers.get('Content-Type')).toContain('text/html');
    expect(body.match(/<title>/g)).toHaveLength(1); expect(body).toContain('<title>SEO Title</title>');
    expect(body).toContain('property="og:image:width" content="1200"'); expect(body).toContain('name="twitter:card" content="summary_large_image"');
    expect(body).toContain('window.__FOLLOWMEE_PROFILE__=');
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/meta'), expect.anything());
  });

  it('returns noindex 404 when metadata is unavailable', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('{}', { status: 404 })); let status = 0; let body = '';
    const response = { status(code: number) { status = code; return this; }, setHeader() {}, send(value: string) { body = value; } };
    await handler({ query: { slug: 'missing-profile' }, headers: { host: 'profiles.example.test' } }, response);
    expect(status).toBe(404); expect(body).toContain('name="robots" content="noindex,follow"');
  });
});
