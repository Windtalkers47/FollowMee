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
  links?: PublicProfileLinkInput[];
}

interface EventContext {
  ip?: string | null;
  userAgent?: string | null;
  referrer?: string | null;
}

const editableFields: Array<keyof Omit<PublicProfileInput, 'links' | 'customerId'>> = [
  'slug',
  'displayName',
  'headline',
  'bio',
  'avatarUrl',
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
];

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
    };
  }

  private present(profile: PublicProfile, access: CustomerAccessContext) {
    return Object.assign(profile, { capabilities: this.capabilities(profile, access) });
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
          throw new Error('This profile URL is already in use');
        }
        profile.slug = slug;
      } else if (field === 'primaryCtaUrl' || field === 'secondaryCtaUrl') {
        profile[field] = this.ensureOptionalUrl(value as string | null);
      } else if (field === 'displayName' && typeof value === 'string') {
        const displayName = value.trim().slice(0, 100);
        if (!displayName) throw new Error('Display name is required');
        profile.displayName = displayName;
      } else {
        (profile as unknown as Record<string, unknown>)[field] = value ?? null;
      }
    }

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
      if (!profile.displayName || !profile.slug) {
        throw new Error('Complete the profile name and URL before publishing');
      }
      if (profile.visibility === 'private') profile.visibility = 'unlisted';
      profile.publishedAt = profile.publishedAt || new Date();
    }
    profile.status = status;
    await this.profileRepository.save(profile);
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
    if (!profile || profile.visibility === 'private') return null;

    const customer = profile.customer;
    return {
      profileId: profile.profileId,
      slug: profile.slug,
      displayName: profile.displayName,
      headline: profile.headline,
      bio: profile.bio,
      avatarUrl: profile.avatarUrl || customer?.customerImageUrl || null,
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
    };
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
      })
    );
    if (eventType === 'view') {
      await this.profileRepository.increment({ profileId }, 'viewCount', 1);
    }
  }

  async getAnalytics(profileId: string, userId: number) {
    const profile = await this.getOwned(profileId, userId);
    const eventRows = await this.eventRepository
      .createQueryBuilder('event')
      .select('event.eventType', 'eventType')
      .addSelect('COUNT(*)', 'count')
      .where('event.profileId = :profileId', { profileId })
      .groupBy('event.eventType')
      .getRawMany<{ eventType: PublicProfileEventType; count: string }>();
    const dailyViews = await this.eventRepository
      .createQueryBuilder('event')
      .select('DATE(event.occurredAt)', 'date')
      .addSelect('COUNT(*)', 'count')
      .where('event.profileId = :profileId', { profileId })
      .andWhere("event.eventType = 'view'")
      .andWhere('event.occurredAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)')
      .groupBy('DATE(event.occurredAt)')
      .orderBy('DATE(event.occurredAt)', 'ASC')
      .getRawMany<{ date: string; count: string }>();
    const topTargets = await this.eventRepository
      .createQueryBuilder('event')
      .select('event.target', 'target')
      .addSelect('COUNT(*)', 'count')
      .where('event.profileId = :profileId', { profileId })
      .andWhere("event.eventType IN ('link_click', 'cta_click')")
      .andWhere('event.target IS NOT NULL')
      .groupBy('event.target')
      .orderBy('COUNT(*)', 'DESC')
      .limit(5)
      .getRawMany<{ target: string; count: string }>();

    const totals = eventRows.reduce<Record<string, number>>((result, row) => {
      result[row.eventType] = Number(row.count);
      return result;
    }, {});

    return {
      profileId: profile.profileId,
      viewCount: Number(profile.viewCount || 0),
      totals,
      dailyViews: dailyViews.map((row) => ({ date: row.date, count: Number(row.count) })),
      topTargets: topTargets.map((row) => ({ target: row.target, count: Number(row.count) })),
    };
  }
}
