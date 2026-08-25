import { apiConfig } from './config';
import type {
  ProfileAnalytics,
  ProfileLink,
  ProfileDraft,
  ProfileEventType,
  PublicProfileLanding,
  PublicProfileRecord,
  ProfileLead,
  ProfileLeadStatus,
  ProfileRevision,
  ProfileLinkCheck,
  ProfileDomain,
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

  quickCreate: (input: Record<string, unknown>) => request<PublicProfileRecord>('/public-profiles/quick-create', { method: 'POST', body: JSON.stringify(input) }),

  update: (profileId: string, input: Partial<ProfileDraft> & { revisionReason?: 'autosave' | 'manual' }) =>
    request<PublicProfileRecord>(`/public-profiles/${profileId}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),

  uploadAvatar: (profileId: string, image: string) =>
    request<PublicProfileRecord>(`/public-profiles/${profileId}/avatar`, {
      method: 'POST',
      body: JSON.stringify({ image }),
    }),

  publish: (profileId: string, acknowledgeLinkWarnings = false) =>
    request<PublicProfileRecord>(`/public-profiles/${profileId}/publish`, {
      method: 'POST',
      body: JSON.stringify({ acknowledgeLinkWarnings }),
    }),

  unpublish: (profileId: string) =>
    request<PublicProfileRecord>(`/public-profiles/${profileId}/unpublish`, {
      method: 'POST',
    }),

  remove: (profileId: string) =>
    request<void>(`/public-profiles/${profileId}`, { method: 'DELETE' }),

  analytics: (profileId: string, filters: { from?: string; to?: string; compare?: boolean } = { compare: true }) => {
    const query = new URLSearchParams(); if (filters.from) query.set('from', filters.from); if (filters.to) query.set('to', filters.to); if (filters.compare) query.set('compare', 'previous');
    return request<ProfileAnalytics>(`/public-profiles/${profileId}/analytics${query.size ? `?${query}` : ''}`);
  },

  getPublic: (slug: string) =>
    request<PublicProfileLanding>(`/public-profiles/public/${slug}`),

  submitLead: (slug: string, input: Record<string, unknown>) => request<{ accepted: boolean; duplicate: boolean; leadId?: string }>(`/public-profiles/public/${slug}/leads`, { method: 'POST', body: JSON.stringify(input) }),
  leads: (query = '') => request<{ items: ProfileLead[]; total: number; unread: number; page: number; limit: number }>(`/public-profiles/leads/inbox${query ? `?${query}` : ''}`),
  updateLeadStatus: (leadId: string, status: ProfileLeadStatus) => request<ProfileLead>(`/public-profiles/leads/${leadId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  assignLead: (leadId: string, assignedTo: number) => request<ProfileLead>(`/public-profiles/leads/${leadId}/assignee`, { method: 'PATCH', body: JSON.stringify({ assignedTo }) }),
  leadDuplicates: (leadId: string) => request<Record<string, unknown>>(`/public-profiles/leads/${leadId}/duplicates`),
  convertLead: (leadId: string, input: { existingCustomerId?: string; customerEmail?: string }) => request<{ lead: ProfileLead; customerId: string; idempotent: boolean }>(`/public-profiles/leads/${leadId}/convert`, { method: 'POST', body: JSON.stringify(input) }),
  revisions: (profileId: string) => request<ProfileRevision[]>(`/public-profiles/${profileId}/revisions`),
  revisionDiff: (profileId: string, revisionId: string, againstRevisionId?: string) => request<{ revisionId: string; againstRevisionId: string | null; fields: Array<{ field: string; before: unknown; after: unknown }> }>(`/public-profiles/${profileId}/revisions/${revisionId}/diff${againstRevisionId ? `?againstRevisionId=${encodeURIComponent(againstRevisionId)}` : ''}`),
  restoreRevision: (profileId: string, revisionId: string, slug?: string) => request<PublicProfileRecord>(`/public-profiles/${profileId}/revisions/${revisionId}/restore`, { method: 'POST', body: JSON.stringify({ slug }) }),
  checkLinks: (profileId: string) => request<ProfileLinkCheck[]>(`/public-profiles/${profileId}/link-checks`, { method: 'POST' }),
  previewLinkImport: (profileId: string, input: { mode: 'append' | 'replace'; rows: Array<Record<string, unknown>> }) => request<{ mode: string; links: ProfileLink[]; errors: Array<{ row: number; code: string }>; canApply: boolean }>(`/public-profiles/${profileId}/links/import-preview`, { method: 'POST', body: JSON.stringify(input) }),
  applyLinkImport: (profileId: string, input: { mode: 'append' | 'replace'; rows: Array<Record<string, unknown>> }) => request<PublicProfileRecord>(`/public-profiles/${profileId}/links/import`, { method: 'POST', body: JSON.stringify(input) }),
  domains: (profileId: string) => request<ProfileDomain[]>(`/public-profiles/${profileId}/domains`),
  addDomain: (profileId: string, hostname: string) => request<ProfileDomain>(`/public-profiles/${profileId}/domains`, { method: 'POST', body: JSON.stringify({ hostname }) }),
  verifyDomain: (profileId: string, domainId: string) => request<ProfileDomain>(`/public-profiles/${profileId}/domains/${domainId}/verify`, { method: 'POST' }),
  setCanonicalDomain: (profileId: string, domainId: string, redirectToCanonical = true) => request<ProfileDomain>(`/public-profiles/${profileId}/domains/${domainId}/canonical`, { method: 'PATCH', body: JSON.stringify({ redirectToCanonical }) }),
  removeDomain: (profileId: string, domainId: string) => request<void>(`/public-profiles/${profileId}/domains/${domainId}`, { method: 'DELETE' }),

  recordEvent: async (
    slug: string,
    eventType: ProfileEventType,
    target?: string
  ) => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = sessionStorage.getItem('followmee:profile-session') || crypto.randomUUID();
    sessionStorage.setItem('followmee:profile-session', sessionId);
    await fetch(`${apiConfig.baseURL}/public-profiles/public/${slug}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventType, target, sessionId, utmSource: params.get('utm_source'), utmMedium: params.get('utm_medium'), utmCampaign: params.get('utm_campaign') }),
      keepalive: true,
    }).catch(() => undefined);
  },
};
