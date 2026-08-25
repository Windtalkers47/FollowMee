import React from 'react';
import { ImageResponse } from '@vercel/og';

type RequestLike = { query?: Record<string, string | string[]> };
export default async function handler(request: RequestLike) {
  const slug = String(Array.isArray(request.query?.slug) ? request.query?.slug[0] : request.query?.slug || ''); const apiBase = String(process.env.VITE_API_URL || process.env.PROFILE_API_URL || '').replace(/\/$/, ''); let data: any = null;
  if (apiBase) { try { const result = await fetch(`${apiBase}/public-profiles/public/${encodeURIComponent(slug)}/meta`, { signal: AbortSignal.timeout(3500) }); if (result.ok) data = (await result.json() as any).data; } catch { data = null; } }
  const name = data?.displayName || 'FollowMee'; const headline = data?.headline || 'A profile worth sharing';
  return new ImageResponse(React.createElement('div', { style: { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '86px 96px', background: 'linear-gradient(135deg,#E6F8EC,#F9F5EC 56%,#EEF1FF)', color: '#17211A', fontFamily: 'sans-serif' } },
    React.createElement('div', { style: { display: 'flex', width: 122, height: 122, borderRadius: 61, alignItems: 'center', justifyContent: 'center', background: 'rgba(52,199,89,.18)', fontSize: 42, fontWeight: 800 } }, String(name).slice(0, 2).toUpperCase()),
    React.createElement('div', { style: { display: 'flex', marginTop: 38, fontSize: 72, lineHeight: 1.05, fontWeight: 800, letterSpacing: '-2px' } }, String(name).slice(0, 100)),
    React.createElement('div', { style: { display: 'flex', marginTop: 20, fontSize: 34, color: '#607067' } }, String(headline).slice(0, 160)),
    React.createElement('div', { style: { display: 'flex', marginTop: 'auto', fontSize: 24, letterSpacing: '3px', color: '#607067' } }, 'MADE WITH FOLLOWMEE')
  ), { width: 1200, height: 630, status: data ? 200 : 404, headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600' } });
}
