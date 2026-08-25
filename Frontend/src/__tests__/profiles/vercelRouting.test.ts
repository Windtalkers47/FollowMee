import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Vercel routing', () => {
  it('keeps API functions outside the Vite SPA fallback', () => {
    const config = JSON.parse(readFileSync(resolve(process.cwd(), 'vercel.json'), 'utf8')) as {
      rewrites: Array<{ source: string; destination: string }>;
    };

    expect(config.rewrites).toContainEqual({
      source: '/p/:slug',
      destination: '/api/profile?slug=:slug',
    });
    expect(config.rewrites).toContainEqual({
      source: '/((?!api/).*)',
      destination: '/index.html',
    });
  });
});
