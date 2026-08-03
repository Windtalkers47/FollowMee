import type { CustomerData } from './customer.types';

export type ProfileStatus = 'draft' | 'published';
export type ProfileVisibility = 'public' | 'unlisted' | 'private';
export type ProfileEventType =
  | 'view'
  | 'link_click'
  | 'cta_click'
  | 'share'
  | 'image_export'
  | 'qr_open';

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
  createdAt: string;
  updatedAt: string;
  createdBy?: number | null;
  updatedBy?: number | null;
  capabilities?: {
    canEdit: boolean;
    canPublish: boolean;
    canUnpublish: boolean;
    canDelete: boolean;
  };
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
}

export type ProfileDraft = Pick<
  PublicProfileRecord,
  | 'slug'
  | 'displayName'
  | 'headline'
  | 'bio'
  | 'avatarUrl'
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
  | 'links'
>;

export interface ProfileAnalytics {
  profileId: string;
  viewCount: number;
  totals: Partial<Record<ProfileEventType, number>>;
  dailyViews: Array<{ date: string; count: number }>;
  topTargets: Array<{ target: string; count: number }>;
}
