import fs from 'node:fs/promises';
import path from 'node:path';

type RequestLike = { query?: Record<string, string | string[]>; headers: Record<string, string | string[] | undefined> };
type ResponseLike = { status(code: number): ResponseLike; setHeader(name: string, value: string): void; send(body: string): void };
const html = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]!));
const json = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c');

export default async function handler(request: RequestLike, response: ResponseLike) {
  const slug = String(Array.isArray(request.query?.slug) ? request.query?.slug[0] : request.query?.slug || '');
  const apiBase = String(process.env.VITE_API_URL || process.env.PROFILE_API_URL || '').replace(/\/$/, '');
  const host = String(request.headers['x-forwarded-host'] || request.headers.host || '').split(',')[0].trim().replace(/:\d+$/, '');
  const protocol = String(request.headers['x-forwarded-proto'] || 'https');
  const requestCanonical = `${protocol}://${host}/p/${encodeURIComponent(slug)}`;
  let data: any = null;
  if (apiBase && /^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/.test(slug)) {
    let result = await fetch(`${apiBase}/public-profiles/public/domain/${encodeURIComponent(host)}/meta`, { headers: { accept: 'application/json' } });
    if (!result.ok) result = await fetch(`${apiBase}/public-profiles/public/${encodeURIComponent(slug)}/meta`, { headers: { accept: 'application/json' } });
    if (result.ok) data = (await result.json() as any).data;
  }
  const shell = await fs.readFile(path.join(process.cwd(), 'dist', 'index.html'), 'utf8');
  const canonical = data?.canonicalUrl || requestCanonical;
  if (data?.canonicalUrl && data.canonicalUrl !== requestCanonical) {
    response.status(308); response.setHeader('Location', data.canonicalUrl); response.setHeader('Cache-Control', 'public, s-maxage=60'); response.send(''); return;
  }
  const title = data?.seoTitle || data?.displayName || 'FollowMee';
  const description = data?.seoDescription || data?.headline || 'FollowMee profile';
  const robots = data?.robots || 'noindex,follow';
  const image = `${protocol}://${host}/api/profile-og?slug=${encodeURIComponent(slug)}&v=${encodeURIComponent(data?.cacheRevision || 'fallback')}`;
  const meta = `<title>${html(title)}</title><meta name="description" content="${html(description)}"><link rel="canonical" href="${html(canonical)}"><meta name="robots" content="${html(robots)}"><meta property="og:type" content="profile"><meta property="og:title" content="${html(title)}"><meta property="og:description" content="${html(description)}"><meta property="og:url" content="${html(canonical)}"><meta property="og:image" content="${html(image)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${html(title)}"><meta name="twitter:description" content="${html(description)}"><meta name="twitter:image" content="${html(image)}"><script>window.__FOLLOWMEE_PROFILE__=${json(data)}</script>`;
  response.status(data ? 200 : 404); response.setHeader('Content-Type', 'text/html; charset=utf-8'); response.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300'); response.send(shell.replace('</head>', `${meta}</head>`));
}
