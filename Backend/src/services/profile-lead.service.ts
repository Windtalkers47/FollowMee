import crypto from 'crypto';
import { In, IsNull, MoreThan } from 'typeorm';
import dataSource from '../config/database';
import { Customer } from '../entities/Customer';
import { PublicProfile } from '../entities/PublicProfile';
import { PublicProfileEvent } from '../entities/PublicProfileEvent';
import { PublicProfileLead, PublicProfileLeadStatus } from '../entities/PublicProfileLead';
import { ApplicationError } from '../errors/application.error';
import { customerAccessService } from './customer-access.service';
import customerService from './customer.service';
import auditService from './audit.service';
import { UserRole } from '../entities/UserRole';
import { NotificationHelper } from '../utils/notification.util';
import { isOwnerRole } from '../utils/role.util';

export interface PublicLeadInput {
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
  consent?: boolean;
  consentVersion?: string;
  website?: string;
  sessionId?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

export interface LeadRequestContext { ip?: string | null; userAgent?: string | null; referrer?: string | null }

const clean = (value: unknown, max: number) => String(value || '').normalize('NFKC').trim().slice(0, max);
const normalizeEmail = (value: unknown) => clean(value, 160).toLocaleLowerCase('en-US');
const normalizePhone = (value: unknown) => clean(value, 32).replace(/[^0-9+]/g, '');

export class ProfileLeadService {
  private leadRepository = dataSource.getRepository(PublicProfileLead);
  private profileRepository = dataSource.getRepository(PublicProfile);

  private hash(value?: string | null) {
    if (!value) return null;
    const salt = process.env.PROFILE_ANALYTICS_SALT || process.env.JWT_SECRET || 'followmee-development-only';
    return crypto.createHash('sha256').update(`${salt}:${value}`).digest('hex');
  }

  private device(userAgent = '') {
    return /mobile|android|iphone/i.test(userAgent) ? 'mobile' : /ipad|tablet/i.test(userAgent) ? 'tablet' : 'desktop';
  }

  async submit(slug: string, input: PublicLeadInput, context: LeadRequestContext) {
    if (input.website) return { accepted: true, duplicate: false };
    const name = clean(input.name, 120);
    const email = normalizeEmail(input.email) || null;
    const phone = normalizePhone(input.phone) || null;
    if (!name) throw new ApplicationError('Name is required', 'PROFILE_LEAD_INVALID', 400, { field: 'name' });
    if (!email && !phone) throw new ApplicationError('Email or phone is required', 'PROFILE_LEAD_INVALID', 400, { field: 'contact' });
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApplicationError('Email is invalid', 'PROFILE_LEAD_INVALID', 400, { field: 'email' });
    if (!input.consent) throw new ApplicationError('Consent is required', 'PROFILE_LEAD_CONSENT_REQUIRED', 400);

    const profile = await this.profileRepository.findOne({ where: { slug, status: 'published', deletedAt: IsNull() }, relations: ['customer'] });
    const now = new Date();
    if (!profile || profile.visibility === 'private' || (profile.publishStartAt && profile.publishStartAt > now) || (profile.publishEndAt && profile.publishEndAt <= now)) {
      throw new ApplicationError('Profile not found', 'PROFILE_NOT_FOUND', 404);
    }

    const fingerprint = this.hash(`${context.ip || ''}|${context.userAgent || ''}|${email || phone}`);
    const duplicate = fingerprint
      ? await this.leadRepository.findOne({ where: { profileId: profile.profileId, visitorHash: fingerprint, createdAt: MoreThan(new Date(Date.now() - 10 * 60_000)) } })
      : null;
    if (duplicate) return { accepted: true, duplicate: true, leadId: duplicate.leadId };

    const userAgent = context.userAgent || '';
    const lead = await dataSource.transaction(async manager => {
      const saved = await manager.getRepository(PublicProfileLead).save(manager.getRepository(PublicProfileLead).create({
        profileId: profile.profileId, name, email, phone, message: clean(input.message, 1000) || null,
        status: 'new', consentAt: now, consentVersion: clean(input.consentVersion, 24) || '2026-08',
        assignedTo: profile.userId, convertedCustomerId: null, convertedAt: null,
        visitorHash: fingerprint, ipHash: this.hash(context.ip), userAgentHash: this.hash(userAgent),
        deviceType: this.device(userAgent), referrer: clean(context.referrer, 512) || null,
        utmSource: clean(input.utmSource, 120) || null, utmMedium: clean(input.utmMedium, 120) || null,
        utmCampaign: clean(input.utmCampaign, 120) || null, anonymizedAt: null,
      }));
      await manager.getRepository(PublicProfileEvent).save(manager.getRepository(PublicProfileEvent).create({
        profileId: profile.profileId, eventType: 'lead_submit', target: 'lead_form', deviceType: saved.deviceType,
        ipHash: saved.ipHash, userAgentHash: saved.userAgentHash, referrer: saved.referrer,
        visitorHash: saved.visitorHash, sessionId: clean(input.sessionId, 64) || null,
        utmSource: saved.utmSource, utmMedium: saved.utmMedium, utmCampaign: saved.utmCampaign,
      }));
      return saved;
    });
    const ownerRows = await dataSource.getRepository(UserRole).find({ relations: ['role'] });
    const recipients = [profile.userId, profile.createdBy, profile.customer?.assignedTo, ...ownerRows.filter(row => isOwnerRole(row.role?.roleName)).map(row => row.userId)].filter((value): value is number => Number.isInteger(value));
    await NotificationHelper.notifyPublicProfileLead(profile.displayName, lead.leadId, recipients);
    return { accepted: true, duplicate: false, leadId: lead.leadId };
  }

  private async manageableProfiles(userId: number) {
    const [profiles, access] = await Promise.all([
      this.profileRepository.find({ where: { deletedAt: IsNull() }, relations: ['customer'] }),
      customerAccessService.context(userId),
    ]);
    return profiles.filter(profile => customerAccessService.capabilities(profile.customer || { createdBy: profile.createdBy ?? profile.userId, assignedTo: profile.userId }, access).canEdit);
  }

  async list(userId: number, filters: { status?: PublicProfileLeadStatus; profileId?: string; page?: number; limit?: number }) {
    const profileIds = (await this.manageableProfiles(userId)).map(profile => profile.profileId);
    if (!profileIds.length) return { items: [], total: 0, unread: 0, page: 1, limit: filters.limit || 25 };
    const page = Math.max(1, filters.page || 1); const limit = Math.min(100, Math.max(1, filters.limit || 25));
    const where = { profileId: filters.profileId && profileIds.includes(filters.profileId) ? filters.profileId : In(profileIds), ...(filters.status ? { status: filters.status } : {}) } as any;
    const [items, total, unread] = await Promise.all([
      this.leadRepository.find({ where, order: { createdAt: 'DESC' }, skip: (page - 1) * limit, take: limit, relations: ['profile'] }),
      this.leadRepository.count({ where }),
      this.leadRepository.count({ where: { profileId: In(profileIds), status: 'new' } }),
    ]);
    return { items, total, unread, page, limit };
  }

  async get(leadId: string, userId: number) {
    const lead = await this.leadRepository.findOne({ where: { leadId }, relations: ['profile', 'profile.customer'] });
    if (!lead) throw new ApplicationError('Lead not found', 'PROFILE_LEAD_NOT_FOUND', 404);
    if (!(await this.manageableProfiles(userId)).some(profile => profile.profileId === lead.profileId)) throw new ApplicationError('Lead access denied', 'PROFILE_LEAD_FORBIDDEN', 403);
    return lead;
  }

  async updateStatus(leadId: string, userId: number, status: PublicProfileLeadStatus) {
    const allowed: PublicProfileLeadStatus[] = ['new', 'contacted', 'qualified', 'converted', 'spam', 'archived'];
    if (!allowed.includes(status)) throw new ApplicationError('Invalid lead status', 'PROFILE_LEAD_INVALID_STATUS', 400);
    const lead = await this.get(leadId, userId);
    if (lead.status === 'converted' && status !== 'converted') throw new ApplicationError('Converted leads cannot be reopened', 'PROFILE_LEAD_ALREADY_CONVERTED', 409);
    lead.status = status;
    await this.leadRepository.save(lead);
    if (status === 'qualified') await dataSource.getRepository(PublicProfileEvent).save({ profileId: lead.profileId, eventType: 'lead_qualified', target: lead.leadId, deviceType: lead.deviceType });
    return lead;
  }

  async duplicatePreview(leadId: string, userId: number) {
    const lead = await this.get(leadId, userId);
    return customerService.duplicateCheck({ customerName: lead.name, customerEmail: lead.email, customerPhone1: lead.phone });
  }

  async convert(leadId: string, userId: number, input: { existingCustomerId?: string; customerEmail?: string }) {
    const lead = await this.get(leadId, userId);
    if (lead.convertedCustomerId) return { lead, customerId: lead.convertedCustomerId, idempotent: true };
    const profile = lead.profile;
    const requestedCustomerId = input.existingCustomerId;
    if (requestedCustomerId) await customerService.findOne(requestedCustomerId, userId);
    const email = requestedCustomerId ? null : normalizeEmail(input.customerEmail || lead.email);
    if (!requestedCustomerId && !email) throw new ApplicationError('Email is required to create a customer', 'PROFILE_LEAD_EMAIL_REQUIRED', 400);
    if (email) {
      const duplicate = await customerService.duplicateCheck({ customerName: lead.name, customerEmail: email, customerPhone1: lead.phone });
      if (duplicate.emailConflict) throw new ApplicationError('A customer already uses this email', 'PROFILE_LEAD_CUSTOMER_CONFLICT', 409, { duplicate });
    }
    const result = await dataSource.transaction(async manager => {
      const locked = await manager.getRepository(PublicProfileLead).createQueryBuilder('lead').setLock('pessimistic_write').where('lead.leadId = :leadId', { leadId }).getOneOrFail();
      if (locked.convertedCustomerId) return { lead: locked, customerId: locked.convertedCustomerId, idempotent: true };
      let customerId = requestedCustomerId;
      if (!customerId) {
        const parts = locked.name.split(/\s+/); const firstName = parts.shift() || locked.name; const lastName = parts.join(' ') || undefined;
        const created = await manager.getRepository(Customer).save(manager.getRepository(Customer).create({ customerName: firstName.slice(0, 50), customerLastName: lastName?.slice(0, 50), customerEmail: email!, customerPhone1: locked.phone || undefined, status: 'active', isActive: true, userId, assignedTo: userId, createdBy: userId, updatedBy: userId }));
        customerId = created.customerId;
      }
      locked.convertedCustomerId = customerId; locked.convertedAt = new Date(); locked.status = 'converted';
      await manager.getRepository(PublicProfileLead).save(locked);
      await manager.getRepository(PublicProfileEvent).save(manager.getRepository(PublicProfileEvent).create({ profileId: locked.profileId, eventType: 'lead_converted', target: locked.leadId, deviceType: locked.deviceType }));
      return { lead: locked, customerId, idempotent: false };
    });
    const { customerId } = result;
    await auditService.logEvent({ userId, action: 'PUBLIC_PROFILE_LEAD_CONVERTED', status: 'SUCCESS', details: { leadId, customerId, profileId: profile.profileId } });
    return result;
  }

  async anonymizeExpired() {
    const cutoff = new Date(Date.now() - 365 * 24 * 60 * 60_000);
    const leads = await this.leadRepository.createQueryBuilder('lead').where('lead.createdAt < :cutoff', { cutoff }).andWhere('lead.convertedCustomerId IS NULL').andWhere('lead.anonymizedAt IS NULL').getMany();
    leads.forEach(lead => { lead.name = 'Anonymized lead'; lead.email = null; lead.phone = null; lead.message = null; lead.referrer = null; lead.anonymizedAt = new Date(); });
    if (leads.length) await this.leadRepository.save(leads);
    return leads.length;
  }
}

export const profileLeadService = new ProfileLeadService();
