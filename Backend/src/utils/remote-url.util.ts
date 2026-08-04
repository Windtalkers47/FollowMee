import dns from 'dns/promises';
import net from 'net';

const isPrivateAddress = (address: string): boolean => {
  if (net.isIPv4(address)) {
    const [a, b] = address.split('.').map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
  }
  const normalized = address.toLowerCase();
  return normalized === '::1' || normalized === '::' || normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe80:');
};

export const assertSafeRemoteHttpUrl = async (raw: string): Promise<URL> => {
  let url: URL;
  try { url = new URL(raw); } catch { throw Object.assign(new Error('Invalid URL'), { statusCode: 400 }); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw Object.assign(new Error('Only public HTTP(S) image URLs are allowed'), { statusCode: 400 });
  if (url.hostname.toLowerCase() === 'localhost') throw Object.assign(new Error('Private network URLs are not allowed'), { statusCode: 400 });
  const addresses = await dns.lookup(url.hostname, { all: true });
  if (!addresses.length || addresses.some(item => isPrivateAddress(item.address))) throw Object.assign(new Error('Private network URLs are not allowed'), { statusCode: 400 });
  return url;
};
