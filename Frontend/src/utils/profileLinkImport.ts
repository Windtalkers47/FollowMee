import type { ProfileLink } from '../types/publicProfile.types';

const allowed = new Set(['website','facebook','instagram','tiktok','line','x']);
export function parseProfileLinksCsv(text: string): { links: ProfileLink[]; errors: Array<{ row: number; message: string }> } {
  const rows = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean); const errors: Array<{ row: number; message: string }> = []; const links: ProfileLink[] = [];
  const start = rows[0]?.toLowerCase().includes('platform') ? 1 : 0; const seen = new Set<string>();
  for (let index = start; index < rows.length && links.length < 12; index += 1) {
    const cells = rows[index].split(',').map(cell => cell.trim().replace(/^"|"$/g, '')); const [rawPlatform, label, url, visible = 'true', sortOrder] = cells; const platform = rawPlatform.toLowerCase();
    if (!allowed.has(platform) || !label || !url) { errors.push({ row: index + 1, message: 'invalid_row' }); continue; }
    const key = url.toLowerCase(); if (seen.has(key)) { errors.push({ row: index + 1, message: 'duplicate_url' }); continue; } seen.add(key);
    links.push({ platform, label: label.slice(0, 60), url: url.slice(0, 512), isVisible: !/^(false|0|no)$/i.test(visible), sortOrder: Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : links.length });
  }
  if (rows.length - start > 12) errors.push({ row: 13, message: 'maximum_links' });
  return { links: links.sort((a, b) => a.sortOrder - b.sortOrder).map((link, index) => ({ ...link, sortOrder: index })), errors };
}
