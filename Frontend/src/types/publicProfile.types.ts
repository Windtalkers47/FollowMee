import type { CustomerData } from './customer.types';

export type ProfileStatus = 'draft' | 'published';
export type ProfileVisibility = 'public' | 'unlisted' | 'private';
export type ProfileEventType =
  | 'view'
  | 'link_click'
  | 'cta_click'
  | 'share'
  | 'image_export'
  | 'qr_open'
  | 'lead_submit'
  | 'lead_qualified'
  | 'lead_converted';

export interface ProfileTheme {
  accentColor?: string;
  backgroundColor?: string;
  surfaceColor?: string;
  textColor?: string;
  fontStyle?: 'modern' | 'friendly' | 'editorial';
}

export interface ProfileLink {
  linkId?: number;
  platform: string;
  label: string;
  url: string;
  sortOrder: number;
  isVisible: boolean;
}

export interface PublicProfileRecord {
  profileId: string;
  userId: number;
  customerId: string | null;
  slug: string;
  displayName: string;
  headline: string | null;
  bio: string | null;
  avatarUrl: string | null;
  imageCrop?: { x: number; y: number; zoom: number; rotation: number } | null;
  templateKey: string;
  themeConfig: ProfileTheme | null;
  status: ProfileStatus;
  visibility: ProfileVisibility;
  primaryCtaLabel: string | null;
  primaryCtaUrl: string | null;
  secondaryCtaLabel: string | null;
  secondaryCtaUrl: string | null;
  showEmail: boolean;
  showPhone: boolean;
  showAddress: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  viewCount: string | number;
  publishedAt: string | null;
  publishStartAt?: string | null;
  publishEndAt?: string | null;
  effectiveStatus?: 'scheduled' | 'live' | 'expired';
  createdAt: string;
  updatedAt: string;
  createdBy?: number | null;
  updatedBy?: number | null;
  capabilities?: {
    canEdit: boolean;
    canPublish: boolean;
    canUnpublish: boolean;
    canDelete: boolean;
    canManageLeads?: boolean;
    canMergeCustomers?: boolean;
    canManageDomain?: boolean;
  };
  publishingChecklist?: Array<{ key: string; complete: boolean }>;
  shareStatus?: 'draft' | 'needs_attention' | 'ready_to_share';
  links: ProfileLink[];
  customer?: CustomerData | null;
}

export interface PublicProfileLanding {
  profileId: string;
  slug: string;
  displayName: string;
  headline: string | null;
  bio: string | null;
  avatarUrl: string | null;
  imageCrop?: { x: number; y: number; zoom: number; rotation: number } | null;
  templateKey: string;
  themeConfig: ProfileTheme | null;
  primaryCtaLabel: string | null;
  primaryCtaUrl: string | null;
  secondaryCtaLabel: string | null;
  secondaryCtaUrl: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  links: ProfileLink[];
  seoTitle: string;
  seoDescription: string | null;
  publishedAt: string | null;
  publishStartAt?: string | null;
  publishEndAt?: string | null;
  effectiveStatus?: 'scheduled' | 'live' | 'expired';
}

export type ProfileDraft = Pick<
  PublicProfileRecord,
  | 'slug'
  | 'displayName'
  | 'headline'
  | 'bio'
  | 'avatarUrl'
  | 'imageCrop'
  | 'templateKey'
  | 'themeConfig'
  | 'visibility'
  | 'primaryCtaLabel'
  | 'primaryCtaUrl'
  | 'secondaryCtaLabel'
  | 'secondaryCtaUrl'
  | 'showEmail'
  | 'showPhone'
  | 'showAddress'
  | 'seoTitle'
  | 'seoDescription'
  | 'publishStartAt'
  | 'publishEndAt'
  | 'links'
>;

export type ProfileDraftUpdate = ProfileDraft & { revisionReason?: 'autosave' | 'manual' };

export interface ProfileAnalytics {
  profileId: string;
  viewCount: number;
  totals: Partial<Record<ProfileEventType, number>>;
  dailyViews: Array<{ date: string; count: number }>;
  topTargets: Array<{ target: string; count: number }>;
  uniqueVisitors?: number;
  sessions?: number;
  conversionRate?: number;
  viewToLeadRate?: number;
  clickThroughRate?: number;
  period?: { from: string; to: string };
  funnel?: { views: number; clicks: number; leads: number; qualified: number; converted: number };
  previous?: { totals: Partial<Record<ProfileEventType, number>>; funnel: { views: number; clicks: number; leads: number; qualified: number; converted: number } } | null;
  targetCtr?: Array<{ target: string; clicks: number; rate: number }>;
  devices?: Array<{ device: string; count: number }>;
  timeToConversionSeconds?: number | null;
  campaigns?: Array<{ source: string; medium?: string | null; campaign?: string | null; count: number }>;
  referrers?: Array<{ referrer: string; count: number }>;
}

export type ProfileLeadStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'spam' | 'archived';
export interface ProfileLead {
  leadId: string; profileId: string; name: string; email: string | null; phone: string | null;
  message: string | null; status: ProfileLeadStatus; createdAt: string; convertedCustomerId: string | null; assignedTo?: number | null;
  profile?: Pick<PublicProfileRecord, 'profileId' | 'displayName' | 'slug'>;
}
export interface ProfileRevision { revisionId: string; profileId: string; version: number; reason: string; createdAt: string; snapshot: Partial<PublicProfileRecord>; }
export interface ProfileLinkCheck { checkId: string; targetKey: string; url: string; status: 'ok' | 'warning' | 'invalid' | 'unchecked'; httpStatus: number | null; detail: string | null; checkedAt: string; }
export interface ProfileDomain { domainId: string; hostname: string; status: 'pending' | 'verifying' | 'active' | 'failed' | 'disabled'; verification: Record<string, unknown> | null; isCanonical: boolean; redirectToCanonical: boolean; verifiedAt: string | null; lastCheckedAt?: string | null; lastError?: string | null; }
