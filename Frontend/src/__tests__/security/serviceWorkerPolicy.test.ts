import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('service worker cache policy', () => {
  it('excludes API traffic and non-GET mutations from Cache Storage', () => {
    const source = fs.readFileSync(path.resolve(process.cwd(), 'public/sw.js'), 'utf8');
    expect(source).toContain("request.method !== 'GET'");
    expect(source).toContain("url.pathname.startsWith('/api/')");
    expect(source).toContain("url.origin !== self.location.origin");
  });

  it('rejects external and protocol-relative notification destinations', () => {
    const source = fs.readFileSync(path.resolve(process.cwd(), 'public/sw.js'), 'utf8');
    expect(source).toContain("candidate.startsWith('/')");
    expect(source).toContain("!candidate.startsWith('//')");
  });
});
