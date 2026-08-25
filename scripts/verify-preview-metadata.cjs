void (async () => {
const baseUrl = String(process.argv[2] || '').replace(/\/$/, '');
const slug = String(process.argv[3] || '');
const expected = process.argv[4] || 'index';
if (!/^https:\/\//.test(baseUrl) || !slug) throw new Error('Usage: npm run verify:preview -- https://preview.example profile-slug [index|noindex]');
const htmlResponse = await fetch(`${baseUrl}/p/${encodeURIComponent(slug)}`, { headers: { 'user-agent': 'FollowMee-UAT-Metadata-Check/1.0' } });
const html = await htmlResponse.text();
const checks = {
  status: htmlResponse.status,
  oneTitle: (html.match(/<title[>\s]/gi) || []).length === 1,
  canonical: /<link[^>]+rel=["']canonical["']/i.test(html),
  robots: new RegExp(`content=["'][^"']*${expected}`, 'i').test(html),
  openGraph: ['og:title','og:description','og:image','og:site_name'].every(key => html.includes(key)),
  twitter: ['twitter:card','twitter:title','twitter:description','twitter:image'].every(key => html.includes(key)),
};
const imageMatch = html.match(/<meta[^>]+(?:property|name)=["']og:image["'][^>]+content=["']([^"']+)/i) || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']og:image["']/i);
if (imageMatch) { const image = await fetch(imageMatch[1], { method: 'GET' }); checks.ogPng = image.ok && (image.headers.get('content-type') || '').startsWith('image/png'); }
console.log(JSON.stringify(checks, null, 2));
if (htmlResponse.status >= 500 || Object.values(checks).some(value => value === false)) process.exitCode = 1;
})().catch(error => { console.error(error.message); process.exitCode = 1; });
