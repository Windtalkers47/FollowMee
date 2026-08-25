import canonicalClient, {
  API_BASE_URL as canonicalBaseUrl,
  apiClient as canonicalApiClient,
} from '../../lib/api/client';
import compatibilityConfig, {
  API_BASE_URL as compatibilityBaseUrl,
  apiClient as compatibilityApiClient,
} from '../../api/config';
import compatibilityClient from '../../services/api';

describe('HTTP client compatibility boundary', () => {
  it('keeps legacy entrypoints wired to the canonical client', () => {
    expect(compatibilityBaseUrl).toBe(canonicalBaseUrl);
    expect(compatibilityApiClient).toBe(canonicalApiClient);
    expect(compatibilityClient).toBe(canonicalApiClient);
    expect(compatibilityConfig).toBe(canonicalClient);
  });
});
