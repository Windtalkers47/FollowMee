import crypto from 'crypto';
import { IsNull } from 'typeorm';
import dataSource from '../config/database';
import { Customer } from '../entities/Customer';
import { customerAccessService, CustomerAccessContext } from './customer-access.service';
import { ApplicationError } from '../errors/application.error';
import {
  PublicProfile,
  PublicProfileStatus,
  PublicProfileTheme,
  PublicProfileVisibility,
} from '../entities/PublicProfile';
import {
  PublicProfileEvent,
  PublicProfileEventType,
} from '../entities/PublicProfileEvent';
import { PublicProfileLink } from '../entities/PublicProfileLink';
import { profilePlatformService } from './profile-platform.service';
import { PublicProfileDomain } from '../entities/PublicProfileDomain';

export interface PublicProfileLinkInput {
  platform: string;
  label: string;
  url: string;
  sortOrder?: number;
  isVisible?: boolean;
}

export interface PublicProfileInput {
  customerId?: string | null;
  slug?: string;
  displayName?: string;
  headline?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  imageCrop?: { x: number; y: number; zoom: number; rotation: number } | null;
  templateKey?: string;
  themeConfig?: PublicProfileTheme | null;
  visibility?: PublicProfileVisibility;
  primaryCtaLabel?: string | null;
  primaryCtaUrl?: string | null;
  secondaryCtaLabel?: string | null;
  secondaryCtaUrl?: string | null;
  showEmail?: boolean;
  showPhone?: boolean;
  showAddress?: boolean;
  seoTitle?: string | null;
  seoDescription?: string | null;
  publishStartAt?: string | Date | null;
  publishEndAt?: string | Date | null;
  revisionReason?: 'autosave' | 'manual';
  links?: PublicProfileLinkInput[];
}

interface EventContext {
  ip?: string | null;
  userAgent?: string | null;
  referrer?: string | null;
  sessionId?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
}

const editableFields: Array<keyof Omit<PublicProfileInput, 'links' | 'customerId'>> = [
  'slug',
  'displayName',
  'headline',
  'bio',
  'avatarUrl',
  'imageCrop',
  'templateKey',
  'themeConfig',
  'visibility',
  'primaryCtaLabel',
  'primaryCtaUrl',
  'secondaryCtaLabel',
  'secondaryCtaUrl',
  'showEmail',
  'showPhone',
  'showAddress',
  'seoTitle',
  'seoDescription',
  'publishStartAt',
  'publishEndAt',
];

export const getPublicProfilePublishingChecklist = (profile: Pick<PublicProfile, 'displayName' | 'slug' | 'primaryCtaLabel' | 'primaryCtaUrl' | 'links'>) => {
  const isValidUrl = (value?: string | null) => Boolean(value && /^(https?:\/\/|mailto:|tel:)/i.test(value));
  const hasValidLink = Boolean(
    (profile.primaryCtaLabel?.trim() && isValidUrl(profile.primaryCtaUrl)) ||
    profile.links?.some(link => link.isVisible && isValidUrl(link.url)),
  );
  return [
    { key: 'display_name', complete: Boolean(profile.displayName?.trim()) },
    { key: 'primary_link', complete: hasValidLink },
    { key: 'slug', complete: /^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/.test(profile.slug || '') },
  ];
};

export class PublicProfileService {
  private profileRepository = dataSource.getRepository(PublicProfile);
  private linkRepository = dataSource.getRepository(PublicProfileLink);
  private eventRepository = dataSource.getRepository(PublicProfileEvent);
  private customerRepository = dataSource.getRepository(Customer);

  private capabilities(profile: PublicProfile, access: CustomerAccessContext) {
    const resource = profile.customer || {
      createdBy: profile.createdBy ?? profile.userId,
      assignedTo: null,
    };
    const customerCapabilities = customerAccessService.capabilities(resource, access);
    return {
      canEdit: customerCapabilities.canEdit,
      canPublish: customerCapabilities.canPublish,
      canUnpublish: customerCapabilities.canPublish,
      canDelete: customerCapabilities.canDelete,
      canManageLeads: customerCapabilities.canEdit,
      canMergeCustomers: access.isOwner || customerCapabilities.canDelete,
      canManageDomain: access.isOwner && process.env.PROFILE_CUSTOM_DOMAINS_ENABLED === 'true',
    };
  }

  private present(profile: PublicProfile, access: CustomerAccessContext) {
    const checklist = this.publishingChecklist(profile);
    return Object.assign(profile, {
      capabilities: this.capabilities(profile, access),
      publishingChecklist: checklist,
      shareStatus: profile.status === 'published' && profile.visibility !== 'private' && checklist.every(item => item.complete)
        ? 'ready_to_share'
        : profile.status === 'published' ? 'needs_attention' : 'draft',
    });
  }

  private publishingChecklist(profile: Pick<PublicProfile, 'displayName' | 'slug' | 'visibility' | 'primaryCtaLabel' | 'primaryCtaUrl' | 'links'>) {
    return getPublicProfilePublishingChecklist(profile);
  }

  private normalizeSlug(value: string) {
    return value
      .trim()
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/-{2,}/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 64);
  }

  private ensureSlug(value: string) {
    const slug = this.normalizeSlug(value);
    if (slug.length < 3) {
      throw new Error('Slug must contain at least 3 letters or numbers');
    }
    return slug;
  }

  private ensureOptionalUrl(value?: string | null, platform = 'website') {
    if (!value) return null;
    const trimmed = value.trim();
    if (/^(https?:\/\/|mailto:|tel:)/i.test(trimmed)) return trimmed.slice(0, 512);

    const handle = trimmed.replace(/^@/, '');
    const baseUrls: Record<string, string> = {
      facebook: 'https://facebook.com/',
      instagram: 'https://instagram.com/',
      tiktok: 'https://tiktok.com/@',
      line: 'https://line.me/ti/p/',
      x: 'https://x.com/',
      twitter: 'https://x.com/',
      website: 'https://',
    };
    const base = baseUrls[platform.toLowerCase()];
    if (!base) {
      throw new Error('Links must start with https://, http://, mailto: or tel:');
    }
    return `${base}${handle}`.slice(0, 512);
  }

  private normalizeLinks(links: PublicProfileLinkInput[] = []) {
    return links
      .filter((link) => link.label?.trim() && link.url?.trim())
      .slice(0, 12)
      .map((link, index) => ({
        platform: (link.platform || 'website').trim().toLowerCase().slice(0, 32),
        label: link.label.trim().slice(0, 60),
        url: this.ensureOptionalUrl(link.url, link.platform) as string,
        sortOrder: link.sortOrder ?? index,
        isVisible: link.isVisible !== false,
      }));
  }

  async listOwned(userId: number) {
    const [profiles, access] = await Promise.all([this.profileRepository.find({
      where: { deletedAt: IsNull() },
      relations: ['links', 'customer'],
      order: { updatedAt: 'DESC', links: { sortOrder: 'ASC' } },
    }), customerAccessService.context(userId)]);
    return profiles.map(profile => this.present(profile, access));
  }

  async getOwned(profileId: string, userId: number) {
    const profile = await this.profileRepository.findOne({
      where: { profileId, deletedAt: IsNull() },
      relations: ['links', 'customer'],
      order: { links: { sortOrder: 'ASC' } },
    });
    if (!profile) throw new Error('Profile not found');
    return this.present(profile, await customerAccessService.context(userId));
  }

  async create(userId: number, input: PublicProfileInput) {
    let customer: Customer | null = null;
    if (input.customerId) {
      customer = await this.customerRepository.findOne({
        where: { customerId: input.customerId, deletedAt: IsNull() },
      });
      if (!customer) throw new Error('Customer not found');
      customerAccessService.assertEdit(customer, await customerAccessService.context(userId));
      const existing = await this.profileRepository.findOne({
        where: { customerId: input.customerId, deletedAt: IsNull() },
      });
      if (existing) return this.getOwned(existing.profileId, userId);
      if (!customer.assignedTo) {
        customer.assignedTo = userId;
        customer.userId = userId;
        await this.customerRepository.save(customer);
      }
    }

    const displayName =
      input.displayName?.trim() ||
      [customer?.customerName, customer?.customerLastName].filter(Boolean).join(' ').trim();
    if (!displayName) throw new Error('Display name is required');

    const fallbackSlug = `profile-${crypto.randomBytes(6).toString('hex')}`;
    const slug = this.ensureSlug(input.slug || displayName || fallbackSlug);
    if (await this.profileRepository.exist({ where: { slug } })) {
      throw new Error('This profile URL is already in use');
    }

    const profileId = await dataSource.transaction(async (manager) => {
      const profile = manager.getRepository(PublicProfile).create({
        userId,
        createdBy: userId,
        updatedBy: userId,
        customerId: customer?.customerId || null,
        slug,
        displayName: displayName.slice(0, 100),
        headline: input.headline?.trim().slice(0, 140) || null,
        bio: input.bio?.trim().slice(0, 500) || null,
        avatarUrl: input.avatarUrl || customer?.customerImageUrl || null,
        imageCrop: input.imageCrop || customer?.imageCrop || null,
        templateKey: input.templateKey || 'soft-mint',
        themeConfig: input.themeConfig || null,
        status: 'draft',
        visibility: input.visibility || 'private',
        primaryCtaLabel: input.primaryCtaLabel?.trim().slice(0, 60) || null,
        primaryCtaUrl: this.ensureOptionalUrl(input.primaryCtaUrl),
        secondaryCtaLabel: input.secondaryCtaLabel?.trim().slice(0, 60) || null,
        secondaryCtaUrl: this.ensureOptionalUrl(input.secondaryCtaUrl),
        showEmail: Boolean(input.showEmail),
        showPhone: Boolean(input.showPhone),
        showAddress: Boolean(input.showAddress),
        seoTitle: input.seoTitle?.trim().slice(0, 70) || null,
        seoDescription: input.seoDescription?.trim().slice(0, 160) || null,
        viewCount: '0',
        publishedAt: null,
        deletedAt: null,
      });
      const saved = await manager.getRepository(PublicProfile).save(profile);
      const links = this.normalizeLinks(input.links).map((link) =>
        manager.getRepository(PublicProfileLink).create({
          ...link,
          profileId: saved.profileId,
        })
      );
      if (links.length) await manager.getRepository(PublicProfileLink).save(links);
      return saved.profileId;
    });
    return this.getOwned(profileId, userId);
  }

  async update(profileId: string, userId: number, input: PublicProfileInput) {
    const profile = await this.getOwned(profileId, userId);
    if (!(profile as PublicProfile & { capabilities: { canEdit: boolean } }).capabilities.canEdit) {
      throw new ApplicationError('Only the customer creator, assignee, or Owner can edit this profile', 'PROFILE_EDIT_FORBIDDEN', 403);
    }
    profile.updatedBy = userId;

    for (const field of editableFields) {
      if (!(field in input)) continue;
      const value = input[field];
      if (field === 'slug' && typeof value === 'string') {
        const slug = this.ensureSlug(value);
        const conflict = await this.profileRepository.findOne({ where: { slug } });
        if (conflict && conflict.profileId !== profileId) {
          throw new ApplicationError(
            'This profile URL is already in use',
            'PROFILE_SLUG_CONFLICT',
            409,
            { field: 'slug' },
            'profile.validation.slugConflict',
          );
        }
        profile.slug = slug;
      } else if (field === 'primaryCtaUrl' || field === 'secondaryCtaUrl') {
        profile[field] = this.ensureOptionalUrl(value as string | null);
      } else if (field === 'displayName' && typeof value === 'string') {
        const displayName = value.trim().slice(0, 100);
        if (!displayName) throw new Error('Display name is required');
        profile.displayName = displayName;
      } else if (field === 'publishStartAt' || field === 'publishEndAt') {
        (profile as any)[field] = value ? new Date(value as string | Date) : null;
      } else {
        (profile as unknown as Record<string, unknown>)[field] = value ?? null;
      }
    }

    if (profile.publishStartAt && Number.isNaN(profile.publishStartAt.getTime())) throw new ApplicationError('Publish start is invalid', 'PROFILE_SCHEDULE_INVALID', 400);
    if (profile.publishEndAt && Number.isNaN(profile.publishEndAt.getTime())) throw new ApplicationError('Publish end is invalid', 'PROFILE_SCHEDULE_INVALID', 400);
    if (profile.publishStartAt && profile.publishEndAt && profile.publishStartAt >= profile.publishEndAt) throw new ApplicationError('Publish end must be after publish start', 'PROFILE_SCHEDULE_INVALID', 400);
    if (profile.publishEndAt && profile.publishEndAt <= new Date()) throw new ApplicationError('Publish end must be in the future', 'PROFILE_SCHEDULE_INVALID', 400);

    await dataSource.transaction(async (manager) => {
      await manager.getRepository(PublicProfile).save(profile);
      if (input.links) {
        await manager.getRepository(PublicProfileLink).delete({ profileId });
        const links = this.normalizeLinks(input.links).map((link) =>
          manager.getRepository(PublicProfileLink).create({ ...link, profileId })
        );
        if (links.length) await manager.getRepository(PublicProfileLink).save(links);
      }
    });
    await profilePlatformService.recordRevision(profileId, userId, input.revisionReason === 'manual' ? 'manual' : 'autosave');
    return this.getOwned(profileId, userId);
  }

  async setPublishState(
    profileId: string,
    userId: number,
    status: PublicProfileStatus
  ) {
    const profile = await this.getOwned(profileId, userId);
    if (!(profile as PublicProfile & { capabilities: { canPublish: boolean } }).capabilities.canPublish) {
      throw new ApplicationError('Only the customer creator or Owner can publish this profile', 'PROFILE_PUBLISH_FORBIDDEN', 403);
    }
    profile.updatedBy = userId;
    if (status === 'published') {
      if (profile.visibility === 'private') profile.visibility = 'unlisted';
      const incomplete = this.publishingChecklist(profile).filter(item => !item.complete).map(item => item.key);
      if (incomplete.length) {
        throw new ApplicationError(
          'Complete the required profile information before publishing',
          'PROFILE_PUBLISH_CHECKLIST_INCOMPLETE',
          409,
          { missingFields: incomplete },
          'profile.validation.publishIncomplete',
        );
      }
      profile.publishedAt = profile.publishedAt || new Date();
    }
    profile.status = status;
    await this.profileRepository.save(profile);
    await profilePlatformService.recordRevision(profileId, userId, status === 'published' ? 'publish' : 'unpublish');
    return this.getOwned(profileId, userId);
  }

  async remove(profileId: string, userId: number) {
    const profile = await this.getOwned(profileId, userId);
    if (!(profile as PublicProfile & { capabilities: { canDelete: boolean } }).capabilities.canDelete) {
      throw new ApplicationError('Only the customer creator or Owner can delete this profile', 'PROFILE_DELETE_FORBIDDEN', 403);
    }
    profile.updatedBy = userId;
    profile.deletedAt = new Date();
    profile.status = 'draft';
    profile.visibility = 'private';
    await this.profileRepository.save(profile);
  }

  async getPublic(slug: string) {
    const profile = await this.profileRepository.findOne({
      where: {
        slug: this.ensureSlug(slug),
        status: 'published',
        deletedAt: IsNull(),
      },
      relations: ['links', 'customer'],
      order: { links: { sortOrder: 'ASC' } },
    });
    const now = new Date();
    if (!profile || profile.visibility === 'private' || (profile.publishStartAt && profile.publishStartAt > now) || (profile.publishEndAt && profile.publishEndAt <= now)) return null;

    const customer = profile.customer;
    return {
      profileId: profile.profileId,
      slug: profile.slug,
      displayName: profile.displayName,
      headline: profile.headline,
      bio: profile.bio,
      avatarUrl: profile.avatarUrl || customer?.customerImageUrl || null,
      imageCrop: profile.imageCrop || customer?.imageCrop || null,
      templateKey: profile.templateKey,
      themeConfig: profile.themeConfig,
      primaryCtaLabel: profile.primaryCtaLabel,
      primaryCtaUrl: profile.primaryCtaUrl,
      secondaryCtaLabel: profile.secondaryCtaLabel,
      secondaryCtaUrl: profile.secondaryCtaUrl,
      email: profile.showEmail ? customer?.customerEmail || null : null,
      phone: profile.showPhone ? customer?.customerPhone1 || null : null,
      address: profile.showAddress ? customer?.customerAddress || null : null,
      links: profile.links
        .filter((link) => link.isVisible)
        .map(({ linkId, platform, label, url, sortOrder }) => ({
          linkId,
          platform,
          label,
          url: this.ensureOptionalUrl(url, platform),
          sortOrder,
        })),
      seoTitle: profile.seoTitle || profile.displayName,
      seoDescription: profile.seoDescription || profile.headline || profile.bio,
      publishedAt: profile.publishedAt,
      publishStartAt: profile.publishStartAt,
      publishEndAt: profile.publishEndAt,
      effectiveStatus: profile.publishStartAt && profile.publishStartAt > now ? 'scheduled' : profile.publishEndAt && profile.publishEndAt <= now ? 'expired' : 'live',
    };
  }

  async getPublicMeta(slug: string) {
    const data = await this.getPublic(slug);
    if (!data) return null;
    const profile = await this.profileRepository.findOne({ where: { profileId: data.profileId } });
    const canonicalDomain = await dataSource.getRepository(PublicProfileDomain).findOne({ where: { profileId: data.profileId, status: 'active', isCanonical: true } });
    return {
      ...data,
      robots: profile?.visibility === 'public' ? 'index,follow' : 'noindex,follow',
      cacheRevision: crypto.createHash('sha1').update(`${data.profileId}:${profile?.updatedAt?.toISOString() || ''}`).digest('hex').slice(0, 12),
      canonicalUrl: canonicalDomain ? `https://${canonicalDomain.hostname}/p/${data.slug}` : null,
      redirectToCanonical: canonicalDomain?.redirectToCanonical ?? false,
    };
  }

  async getPublicMetaByHostname(hostname: string) {
    const domain = await dataSource.getRepository(PublicProfileDomain).findOne({ where: { hostname: hostname.toLowerCase(), status: 'active' }, relations: ['profile'] });
    if (!domain?.profile) return null;
    return this.getPublicMeta(domain.profile.slug);
  }

  async recordEvent(
    profileId: string,
    eventType: PublicProfileEventType,
    target: string | null,
    context: EventContext
  ) {
    const allowedEvents: PublicProfileEventType[] = [
      'view',
      'link_click',
      'cta_click',
      'share',
      'image_export',
      'qr_open',
    ];
    if (!allowedEvents.includes(eventType)) throw new Error('Unsupported event type');
    if (/bot|crawler|spider|preview|facebookexternalhit|twitterbot|linkedinbot|line-poker/i.test(context.userAgent || '')) return;

    const salt = process.env.PROFILE_ANALYTICS_SALT || process.env.JWT_SECRET || 'followmee';
    const hash = (value?: string | null) =>
      value
        ? crypto.createHash('sha256').update(`${salt}:${value}`).digest('hex')
        : null;
    const userAgent = context.userAgent || '';
    const deviceType = /mobile|android|iphone/i.test(userAgent)
      ? 'mobile'
      : /ipad|tablet/i.test(userAgent)
        ? 'tablet'
        : 'desktop';

    await this.eventRepository.save(
      this.eventRepository.create({
        profileId,
        eventType,
        target: target?.slice(0, 128) || null,
        deviceType,
        ipHash: hash(context.ip),
        userAgentHash: hash(userAgent),
        referrer: context.referrer?.slice(0, 512) || null,
        visitorHash: hash(`${context.ip || ''}|${userAgent}|${new Date().toISOString().slice(0, 10)}`),
        sessionId: context.sessionId?.slice(0, 64) || null,
        utmSource: context.utmSource?.slice(0, 120) || null,
        utmMedium: context.utmMedium?.slice(0, 120) || null,
        utmCampaign: context.utmCampaign?.slice(0, 120) || null,
      })
    );
    if (eventType === 'view') {
      await this.profileRepository.increment({ profileId }, 'viewCount', 1);
    }
  }

  async getAnalytics(profileId: string, userId: number, filters: { from?: string; to?: string; compare?: boolean } = {}) {
    const profile = await this.getOwned(profileId, userId);
    const to = filters.to && !Number.isNaN(Date.parse(filters.to)) ? new Date(filters.to) : new Date();
    const from = filters.from && !Number.isNaN(Date.parse(filters.from)) ? new Date(filters.from) : new Date(to.getTime() - 30 * 24 * 60 * 60_000);
    if (from >= to) throw new ApplicationError('Analytics start must be before end', 'PROFILE_ANALYTICS_RANGE_INVALID', 400);
    const boundedFrom = new Date(Math.max(from.getTime(), to.getTime() - 366 * 24 * 60 * 60_000));
    const duration = to.getTime() - boundedFrom.getTime(); const previousFrom = new Date(boundedFrom.getTime() - duration); const previousTo = boundedFrom;
    const eventRows = await this.eventRepository
      .createQueryBuilder('event')
      .select('event.eventType', 'eventType')
      .addSelect('COUNT(*)', 'count')
      .where('event.profileId = :profileId', { profileId })
      .andWhere('event.occurredAt >= :from AND event.occurredAt < :to', { from: boundedFrom, to })
      .groupBy('event.eventType')
      .getRawMany<{ eventType: PublicProfileEventType; count: string }>();
    const dailyViews = await this.eventRepository
      .createQueryBuilder('event')
      .select('DATE(event.occurredAt)', 'date')
      .addSelect('COUNT(*)', 'count')
      .where('event.profileId = :profileId', { profileId })
      .andWhere("event.eventType = 'view'")
      .andWhere('event.occurredAt >= :from AND event.occurredAt < :to', { from: boundedFrom, to })
      .groupBy('DATE(event.occurredAt)')
      .orderBy('DATE(event.occurredAt)', 'ASC')
      .getRawMany<{ date: string; count: string }>();
    const topTargets = await this.eventRepository
      .createQueryBuilder('event')
      .select('event.target', 'target')
      .addSelect('COUNT(*)', 'count')
      .where('event.profileId = :profileId', { profileId })
      .andWhere('event.occurredAt >= :from AND event.occurredAt < :to', { from: boundedFrom, to })
      .andWhere("event.eventType IN ('link_click', 'cta_click')")
      .andWhere('event.target IS NOT NULL')
      .groupBy('event.target')
      .orderBy('COUNT(*)', 'DESC')
      .limit(5)
      .getRawMany<{ target: string; count: string }>();
    const [uniqueRow, sessionRow, campaignRows, referrerRows, deviceRows, previousRows, timeRows] = await Promise.all([
      this.eventRepository.createQueryBuilder('event').select('COUNT(DISTINCT event.visitorHash)', 'count').where('event.profileId = :profileId', { profileId }).andWhere("event.eventType = 'view'").andWhere('event.occurredAt >= :from AND event.occurredAt < :to', { from: boundedFrom, to }).getRawOne<{ count: string }>(),
      this.eventRepository.createQueryBuilder('event').select('COUNT(DISTINCT event.sessionId)', 'count').where('event.profileId = :profileId', { profileId }).andWhere('event.sessionId IS NOT NULL').andWhere('event.occurredAt >= :from AND event.occurredAt < :to', { from: boundedFrom, to }).getRawOne<{ count: string }>(),
      this.eventRepository.createQueryBuilder('event').select("COALESCE(event.utmSource, '(direct)')", 'source').addSelect('event.utmMedium', 'medium').addSelect('event.utmCampaign', 'campaign').addSelect('COUNT(*)', 'count').where('event.profileId = :profileId', { profileId }).andWhere('event.occurredAt >= :from AND event.occurredAt < :to', { from: boundedFrom, to }).groupBy('event.utmSource').addGroupBy('event.utmMedium').addGroupBy('event.utmCampaign').orderBy('COUNT(*)', 'DESC').limit(10).getRawMany<{ source: string; medium: string | null; campaign: string | null; count: string }>(),
      this.eventRepository.createQueryBuilder('event').select('event.referrer', 'referrer').addSelect('COUNT(*)', 'count').where('event.profileId = :profileId', { profileId }).andWhere('event.referrer IS NOT NULL').andWhere('event.occurredAt >= :from AND event.occurredAt < :to', { from: boundedFrom, to }).groupBy('event.referrer').orderBy('COUNT(*)', 'DESC').limit(10).getRawMany<{ referrer: string; count: string }>(),
      this.eventRepository.createQueryBuilder('event').select("COALESCE(event.deviceType, 'unknown')", 'device').addSelect('COUNT(*)', 'count').where('event.profileId = :profileId', { profileId }).andWhere('event.occurredAt >= :from AND event.occurredAt < :to', { from: boundedFrom, to }).groupBy('event.deviceType').getRawMany<{ device: string; count: string }>(),
      filters.compare ? this.eventRepository.createQueryBuilder('event').select('event.eventType', 'eventType').addSelect('COUNT(*)', 'count').where('event.profileId = :profileId', { profileId }).andWhere('event.occurredAt >= :from AND event.occurredAt < :to', { from: previousFrom, to: previousTo }).groupBy('event.eventType').getRawMany<{ eventType: PublicProfileEventType; count: string }>() : Promise.resolve([]),
      dataSource.query("SELECT AVG(TIMESTAMPDIFF(SECOND, submitted.occurredAt, converted.occurredAt)) AS avgSeconds FROM public_profile_events submitted JOIN public_profile_events converted ON converted.profileId = submitted.profileId AND converted.target = submitted.target AND converted.eventType = 'lead_converted' WHERE submitted.profileId = ? AND submitted.eventType = 'lead_submit' AND submitted.occurredAt >= ? AND submitted.occurredAt < ?", [profileId, boundedFrom, to]) as Promise<Array<{ avgSeconds: string | null }>>,
    ]);

    const totals = eventRows.reduce<Record<string, number>>((result, row) => {
      result[row.eventType] = Number(row.count);
      return result;
    }, {});

    const previous = previousRows.reduce<Record<string, number>>((result, row) => { result[row.eventType] = Number(row.count); return result; }, {});
    const views = totals.view || 0; const leads = totals.lead_submit || 0; const converted = totals.lead_converted || 0;
    const clicks = (totals.link_click || 0) + (totals.cta_click || 0);
    return {
      profileId: profile.profileId,
      viewCount: Number(profile.viewCount || 0),
      totals,
      dailyViews: dailyViews.map((row) => ({ date: row.date, count: Number(row.count) })),
      topTargets: topTargets.map((row) => ({ target: row.target, count: Number(row.count) })),
      uniqueVisitors: Number(uniqueRow?.count || 0),
      sessions: Number(sessionRow?.count || 0),
      period: { from: boundedFrom.toISOString(), to: to.toISOString() },
      conversionRate: leads ? converted / leads : 0,
      viewToLeadRate: views ? leads / views : 0,
      clickThroughRate: views ? clicks / views : 0,
      funnel: { views, clicks, leads, qualified: totals.lead_qualified || 0, converted },
      previous: filters.compare ? { totals: previous, funnel: { views: previous.view || 0, clicks: (previous.link_click || 0) + (previous.cta_click || 0), leads: previous.lead_submit || 0, qualified: previous.lead_qualified || 0, converted: previous.lead_converted || 0 } } : null,
      targetCtr: topTargets.map(row => ({ target: row.target, clicks: Number(row.count), rate: views ? Number(row.count) / views : 0 })),
      devices: deviceRows.map(row => ({ device: row.device, count: Number(row.count) })),
      timeToConversionSeconds: timeRows[0]?.avgSeconds == null ? null : Number(timeRows[0].avgSeconds),
      campaigns: campaignRows.map(row => ({ source: row.source, medium: row.medium, campaign: row.campaign, count: Number(row.count) })),
      referrers: referrerRows.map(row => ({ referrer: row.referrer, count: Number(row.count) })),
    };
  }
}
