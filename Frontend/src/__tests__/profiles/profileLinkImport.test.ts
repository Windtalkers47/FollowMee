import { describe, expect, it } from 'vitest';
import { parseProfileLinksCsv } from '../../utils/profileLinkImport';

describe('profile social link CSV import', () => {
  it('parses, normalizes visibility and reorders links', () => {
    const result = parseProfileLinksCsv('platform,label,url,visible,sortOrder\ninstagram,IG,https://instagram.com/example,false,9\nwebsite,Site,https://example.com,true,1');
    expect(result.errors).toEqual([]);
    expect(result.links).toEqual([
      expect.objectContaining({ platform: 'website', isVisible: true, sortOrder: 0 }),
      expect.objectContaining({ platform: 'instagram', isVisible: false, sortOrder: 1 }),
    ]);
  });

  it('rejects unsupported platforms and duplicate destinations', () => {
    const result = parseProfileLinksCsv('platform,label,url,visible,sortOrder\nyoutube,Video,https://example.com,true,0\nwebsite,Site,https://example.com,true,1\nwebsite,Again,https://example.com,true,2');
    expect(result.links).toHaveLength(1);
    expect(result.errors.map(error => error.message)).toEqual(['invalid_row', 'duplicate_url']);
  });

  it('enforces the twelve-link total', () => {
    const rows = Array.from({ length: 13 }, (_, index) => `website,Site ${index},https://example.com/${index},true,${index}`);
    const result = parseProfileLinksCsv(`platform,label,url,visible,sortOrder\n${rows.join('\n')}`);
    expect(result.links).toHaveLength(12);
    expect(result.errors).toContainEqual({ row: 13, message: 'maximum_links' });
  });
});
