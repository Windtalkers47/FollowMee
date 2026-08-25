import fs from 'node:fs/promises';
import path from 'node:path';

type RequestLike = { query?: Record<string, string | string[]>; headers: Record<string, string | string[] | undefined> };
type ResponseLike = { status(code: number): ResponseLike; setHeader(name: string, value: string): void; send(body: string): void };
const html = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]!));
const json = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c');
const safeHost = (value: unknown) => String(value || '').split(',')[0].trim().replace(/:\d+$/, '').toLowerCase().match(/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/)?.[0] || 'localhost';
const timedFetch = async (url: string) => {
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 3_500);
  try { return await fetch(url, { headers: { accept: 'application/json' }, signal: controller.signal }); }
  finally { clearTimeout(timer); }
};
const loadBuiltShell = async (protocol: string, host: string) => {
  try {
    return await fs.readFile(path.join(process.cwd(), 'dist', 'index.html'), 'utf8');
  } catch {
    const result = await timedFetch(`${protocol}://${host}/index.html`);
    if (!result.ok) throw new Error(`Unable to load built application shell (${result.status})`);
    return result.text();
  }
};

export default async function handler(request: RequestLike, response: ResponseLike) {
  const slug = String(Array.isArray(request.query?.slug) ? request.query?.slug[0] : request.query?.slug || '');
  const apiBase = String(process.env.VITE_API_URL || process.env.PROFILE_API_URL || '').replace(/\/$/, '');
  const host = safeHost(request.headers['x-forwarded-host'] || request.headers.host);
  const protocol = String(request.headers['x-forwarded-proto'] || 'https').split(',')[0].trim() === 'http' ? 'http' : 'https';
  const requestCanonical = `${protocol}://${host}/p/${encodeURIComponent(slug)}`;
  let data: any = null;
  if (apiBase && /^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/.test(slug)) {
    try {
      let result = await timedFetch(`${apiBase}/public-profiles/public/domain/${encodeURIComponent(host)}/meta`);
      if (!result.ok) result = await timedFetch(`${apiBase}/public-profiles/public/${encodeURIComponent(slug)}/meta`);
      if (result.ok) data = (await result.json() as any).data;
    } catch { data = null; }
  }
  const shell = await loadBuiltShell(protocol, host);
  const canonical = data?.canonicalUrl || requestCanonical;
  if (data?.canonicalUrl && data.redirectToCanonical && data.canonicalUrl !== requestCanonical) {
    response.status(308); response.setHeader('Location', data.canonicalUrl); response.setHeader('Cache-Control', 'public, s-maxage=60'); response.send(''); return;
  }
  const title = data?.seoTitle || data?.displayName || 'FollowMee';
  const description = data?.seoDescription || data?.headline || 'FollowMee profile';
  const robots = data?.robots || 'noindex,follow';
  const image = `${protocol}://${host}/api/profile-og?slug=${encodeURIComponent(slug)}&v=${encodeURIComponent(data?.cacheRevision || 'fallback')}`;
  const locale = /[\u0E00-\u0E7F]/.test(`${title}${description}`) ? 'th_TH' : 'en_US';
  const meta = `<meta name="description" content="${html(description)}"><link rel="canonical" href="${html(canonical)}"><meta name="robots" content="${html(robots)}"><meta property="og:type" content="profile"><meta property="og:site_name" content="FollowMee"><meta property="og:locale" content="${locale}"><meta property="og:title" content="${html(title)}"><meta property="og:description" content="${html(description)}"><meta property="og:url" content="${html(canonical)}"><meta property="og:image" content="${html(image)}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="${html(`${title} — FollowMee profile`)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${html(title)}"><meta name="twitter:description" content="${html(description)}"><meta name="twitter:image" content="${html(image)}"><meta name="twitter:image:alt" content="${html(`${title} — FollowMee profile`)}"><script>window.__FOLLOWMEE_PROFILE__=${json(data)}</script>`;
  const titledShell = shell.replace(/<title>[\s\S]*?<\/title>/i, `<title>${html(title)}</title>`);
  response.status(data ? 200 : 404); response.setHeader('Content-Type', 'text/html; charset=utf-8'); response.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300'); response.send(titledShell.replace('</head>', `${meta}</head>`));
}
