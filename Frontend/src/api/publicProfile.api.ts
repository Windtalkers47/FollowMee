import { apiConfig } from './config';
import type {
  ProfileAnalytics,
  ProfileDraft,
  ProfileEventType,
  PublicProfileLanding,
  PublicProfileRecord,
} from '../types/publicProfile.types';

export class PublicProfileApiError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly messageKey?: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'PublicProfileApiError';
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${apiConfig.baseURL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Application-Name': apiConfig.headers['X-Application-Name'],
      ...options.headers,
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new PublicProfileApiError(
      payload?.message || response.statusText || 'Request failed',
      payload?.code,
      payload?.messageKey,
      payload?.details,
    );
  }
  return payload.data as T;
}

export const publicProfileApi = {
  list: () => request<PublicProfileRecord[]>('/public-profiles'),

  get: (profileId: string) =>
    request<PublicProfileRecord>(`/public-profiles/${profileId}`),

  create: (input: { customerId?: string; displayName?: string; slug?: string }) =>
    request<PublicProfileRecord>('/public-profiles', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  update: (profileId: string, input: Partial<ProfileDraft>) =>
    request<PublicProfileRecord>(`/public-profiles/${profileId}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),

  uploadAvatar: (profileId: string, image: string) =>
    request<PublicProfileRecord>(`/public-profiles/${profileId}/avatar`, {
      method: 'POST',
      body: JSON.stringify({ image }),
    }),

  publish: (profileId: string) =>
    request<PublicProfileRecord>(`/public-profiles/${profileId}/publish`, {
      method: 'POST',
    }),

  unpublish: (profileId: string) =>
    request<PublicProfileRecord>(`/public-profiles/${profileId}/unpublish`, {
      method: 'POST',
    }),

  remove: (profileId: string) =>
    request<void>(`/public-profiles/${profileId}`, { method: 'DELETE' }),

  analytics: (profileId: string) =>
    request<ProfileAnalytics>(`/public-profiles/${profileId}/analytics`),

  getPublic: (slug: string) =>
    request<PublicProfileLanding>(`/public-profiles/public/${slug}`),

  recordEvent: async (
    slug: string,
    eventType: ProfileEventType,
    target?: string
  ) => {
    await fetch(`${apiConfig.baseURL}/public-profiles/public/${slug}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventType, target }),
      keepalive: true,
    }).catch(() => undefined);
  },
};
