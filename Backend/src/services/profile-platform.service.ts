import crypto from 'crypto';
import dns from 'dns/promises';
import net from 'net';
import { IsNull } from 'typeorm';
import dataSource from '../config/database';
import { Customer } from '../entities/Customer';
import { PublicProfile } from '../entities/PublicProfile';
import { PublicProfileDomain } from '../entities/PublicProfileDomain';
import { PublicProfileLink } from '../entities/PublicProfileLink';
import { PublicProfileLinkCheck, ProfileLinkHealth } from '../entities/PublicProfileLinkCheck';
import { PublicProfileRevision } from '../entities/PublicProfileRevision';
import { ApplicationError } from '../errors/application.error';
import { customerAccessService } from './customer-access.service';
import customerService from './customer.service';

const normalizeSlug = (value: string) => value.trim().toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9-]+/g, '-').replace(/-{2,}/g, '-').replace(/^-|-$/g, '').slice(0, 64);
const isPrivateIp = (address: string) => {
  if (net.isIPv4(address)) {
    const [a, b] = address.split('.').map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224;
  }
  const value = address.toLowerCase();
  return value === '::1' || value === '::' || value.startsWith('fc') || value.startsWith('fd') || value.startsWith('fe80:');
};

export const validatePublicLinkTarget = async (rawUrl: string) => {
  if (/^mailto:/i.test(rawUrl)) return /^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(rawUrl.slice(7))
    ? { status: 'ok' as ProfileLinkHealth, httpStatus: null, detail: 'Format only' }
    : { status: 'invalid' as ProfileLinkHealth, httpStatus: null, detail: 'Invalid email link' };
  if (/^tel:/i.test(rawUrl)) return /^\+?[0-9][0-9 ()-]{5,24}$/.test(rawUrl.slice(4))
    ? { status: 'ok' as ProfileLinkHealth, httpStatus: null, detail: 'Format only' }
    : { status: 'invalid' as ProfileLinkHealth, httpStatus: null, detail: 'Invalid phone link' };
  let url: URL;
  try { url = new URL(rawUrl); } catch { return { status: 'invalid' as ProfileLinkHealth, httpStatus: null, detail: 'Invalid URL' }; }
  if (!['http:', 'https:'].includes(url.protocol)) return { status: 'invalid' as ProfileLinkHealth, httpStatus: null, detail: 'Unsupported protocol' };
  if (url.username || url.password || ['localhost', 'localhost.localdomain'].includes(url.hostname.toLowerCase())) return { status: 'invalid' as ProfileLinkHealth, httpStatus: null, detail: 'Unsafe destination' };
  try {
    const addresses = net.isIP(url.hostname) ? [{ address: url.hostname }] : await dns.lookup(url.hostname, { all: true });
    if (!addresses.length || addresses.some(item => isPrivateIp(item.address))) return { status: 'invalid' as ProfileLinkHealth, httpStatus: null, detail: 'Private or reserved destination' };
  } catch { return { status: 'warning' as ProfileLinkHealth, httpStatus: null, detail: 'DNS lookup failed' }; }
  const abort = new AbortController(); const timer = setTimeout(() => abort.abort(), 4_000);
  try {
    const response = await fetch(url, { method: 'HEAD', redirect: 'manual', signal: abort.signal, headers: { 'user-agent': 'FollowMee-Link-Checker/1.0' } });
    const status: ProfileLinkHealth = response.status >= 200 && response.status < 400 ? 'ok' : 'warning';
    return { status, httpStatus: response.status, detail: status === 'ok' ? 'Reachable' : `HTTP ${response.status}` };
  } catch { return { status: 'warning' as ProfileLinkHealth, httpStatus: null, detail: 'Destination unavailable' }; }
  finally { clearTimeout(timer); }
};

export class ProfilePlatformService {
  private profileRepository = dataSource.getRepository(PublicProfile);

  private async owned(profileId: string, userId: number, requireOwner = false) {
    const profile = await this.profileRepository.findOne({ where: { profileId, deletedAt: IsNull() }, relations: ['links', 'customer'] });
    if (!profile) throw new ApplicationError('Profile not found', 'PROFILE_NOT_FOUND', 404);
    const access = await customerAccessService.context(userId);
    const resource = profile.customer || { createdBy: profile.createdBy ?? profile.userId, assignedTo: profile.userId };
    if (requireOwner ? !access.isOwner : !customerAccessService.capabilities(resource, access).canEdit) throw new ApplicationError('Profile access denied', 'PROFILE_EDIT_FORBIDDEN', 403);
    return profile;
  }

  async quickCreate(userId: number, input: any) {
    if (input.customerId) {
      const existing = await this.profileRepository.findOne({ where: { customerId: input.customerId, deletedAt: IsNull() } });
      if (existing) throw new ApplicationError('This customer already has a profile', 'PROFILE_CUSTOMER_CONFLICT', 409, { profileId: existing.profileId, customerId: input.customerId });
      const customer = await dataSource.getRepository(Customer).findOne({ where: { customerId: input.customerId, deletedAt: IsNull() } });
      if (!customer) throw new ApplicationError('Customer not found', 'CUSTOMER_NOT_FOUND', 404);
      customerAccessService.assertEdit(customer, await customerAccessService.context(userId));
      input = { ...input, displayName: input.displayName || [customer.customerName, customer.customerLastName].filter(Boolean).join(' '), avatarUrl: input.avatarUrl || customer.customerImageUrl };
    }
    if (input.customer?.email) {
      const duplicate = await customerService.duplicateCheck({ customerName: input.customer.firstName, customerLastName: input.customer.lastName, customerEmail: input.customer.email, customerPhone1: input.customer.phone });
      if (duplicate.emailConflict || duplicate.matches?.length) throw new ApplicationError('Possible duplicate customer', 'PROFILE_QUICK_CREATE_DUPLICATE', 409, { duplicate });
    }
    const displayName = String(input.displayName || [input.customer?.firstName, input.customer?.lastName].filter(Boolean).join(' ')).trim();
    if (!displayName) throw new ApplicationError('Display name is required', 'PROFILE_DISPLAY_NAME_REQUIRED', 400);
    const slug = normalizeSlug(input.slug || displayName) || `profile-${crypto.randomBytes(6).toString('hex')}`;
    if (slug.length < 3 || await this.profileRepository.exist({ where: { slug } })) throw new ApplicationError('This profile URL is already in use', 'PROFILE_SLUG_CONFLICT', 409, { field: 'slug' });
    const profileId = await dataSource.transaction(async manager => {
      let customerId = input.customerId || null;
      if (input.customer?.email) {
        const customer = await manager.getRepository(Customer).save(manager.getRepository(Customer).create({
          customerName: String(input.customer.firstName || displayName).slice(0, 50), customerLastName: String(input.customer.lastName || '').slice(0, 50) || null,
          customerEmail: String(input.customer.email).trim().toLowerCase().slice(0, 100), customerPhone1: String(input.customer.phone || '').slice(0, 20) || null,
          customerImageUrl: input.avatarUrl || null, status: 'active', isActive: true, userId, assignedTo: userId, createdBy: userId, updatedBy: userId,
        } as any)) as unknown as Customer;
        customerId = customer.customerId;
      }
      const profile = await manager.getRepository(PublicProfile).save(manager.getRepository(PublicProfile).create({
        userId, createdBy: userId, updatedBy: userId, customerId, slug, displayName: displayName.slice(0, 100),
        headline: String(input.headline || '').slice(0, 140) || null, bio: null, avatarUrl: input.avatarUrl || null, imageCrop: null,
        templateKey: input.templateKey || 'soft-mint', themeConfig: null, status: 'draft', visibility: 'private',
        primaryCtaLabel: String(input.primaryCtaLabel || '').slice(0, 60) || null, primaryCtaUrl: input.primaryCtaUrl || null,
        secondaryCtaLabel: null, secondaryCtaUrl: null, showEmail: false, showPhone: false, showAddress: false,
        seoTitle: null, seoDescription: null, viewCount: '0', publishedAt: null, publishStartAt: null, publishEndAt: null, deletedAt: null,
      }));
      return profile.profileId;
    });
    return this.owned(profileId, userId);
  }

  private snapshot(profile: PublicProfile) {
    const { events: _events, user: _user, customer: _customer, ...record } = profile as any;
    return { ...record, links: (profile.links || []).map(({ profile: _profile, ...link }) => link) };
  }

  async recordRevision(profileId: string, userId: number, reason: PublicProfileRevision['reason']) {
    const profile = await this.owned(profileId, userId);
    const repo = dataSource.getRepository(PublicProfileRevision);
    const last = await repo.findOne({ where: { profileId }, order: { version: 'DESC' } });
    if (reason === 'autosave' && last?.reason === 'autosave' && Date.now() - new Date(last.createdAt).getTime() < 5 * 60_000) {
      last.snapshot = this.snapshot(profile); last.actorUserId = userId; return repo.save(last);
    }
    return repo.save(repo.create({ profileId, version: (last?.version || 0) + 1, snapshot: this.snapshot(profile), actorUserId: userId, reason }));
  }

  async revisions(profileId: string, userId: number) {
    await this.owned(profileId, userId);
    return dataSource.getRepository(PublicProfileRevision).find({ where: { profileId }, order: { version: 'DESC' }, take: 100 });
  }

  async restore(profileId: string, revisionId: string, userId: number, replacementSlug?: string) {
    const profile = await this.owned(profileId, userId); const repo = dataSource.getRepository(PublicProfileRevision);
    const revision = await repo.findOne({ where: { revisionId, profileId } });
    if (!revision) throw new ApplicationError('Revision not found', 'PROFILE_REVISION_NOT_FOUND', 404);
    await this.recordRevision(profileId, userId, 'restore');
    const snapshot = revision.snapshot as any; const slug = normalizeSlug(replacementSlug || snapshot.slug || profile.slug);
    const conflict = await this.profileRepository.findOne({ where: { slug } });
    if (conflict && conflict.profileId !== profileId) throw new ApplicationError('Profile URL is already in use', 'PROFILE_SLUG_CONFLICT', 409, { field: 'slug' });
    const editable = ['displayName','headline','bio','avatarUrl','imageCrop','templateKey','themeConfig','visibility','primaryCtaLabel','primaryCtaUrl','secondaryCtaLabel','secondaryCtaUrl','showEmail','showPhone','showAddress','seoTitle','seoDescription','publishStartAt','publishEndAt'];
    editable.forEach(key => { (profile as any)[key] = snapshot[key] ?? null; }); profile.slug = slug; profile.status = 'draft'; profile.updatedBy = userId;
    await dataSource.transaction(async manager => { await manager.getRepository(PublicProfile).save(profile); await manager.getRepository(PublicProfileLink).delete({ profileId }); if (snapshot.links?.length) await manager.getRepository(PublicProfileLink).save(snapshot.links.map((link: any, index: number) => manager.getRepository(PublicProfileLink).create({ profileId, platform: link.platform, label: link.label, url: link.url, isVisible: link.isVisible !== false, sortOrder: index }))); });
    return this.owned(profileId, userId);
  }

  async checkLinks(profileId: string, userId: number) {
    const profile = await this.owned(profileId, userId);
    const targets = [
      ...(profile.primaryCtaUrl ? [{ key: 'primary_cta', url: profile.primaryCtaUrl }] : []),
      ...(profile.secondaryCtaUrl ? [{ key: 'secondary_cta', url: profile.secondaryCtaUrl }] : []),
      ...(profile.links || []).filter(link => link.isVisible).map(link => ({ key: `link:${link.linkId}`, url: link.url })),
    ].slice(0, 14);
    return Promise.all(targets.map(async target => {
      const result = await validatePublicLinkTarget(target.url);
      return dataSource.getRepository(PublicProfileLinkCheck).save({ profileId, targetKey: target.key, url: target.url, ...result });
    }));
  }

  async domains(profileId: string, userId: number) { await this.owned(profileId, userId, true); return dataSource.getRepository(PublicProfileDomain).find({ where: { profileId }, order: { createdAt: 'DESC' } }); }
  private ensureDomainsEnabled() { if (process.env.PROFILE_CUSTOM_DOMAINS_ENABLED !== 'true') throw new ApplicationError('Custom domains are not enabled', 'PROFILE_DOMAINS_DISABLED', 503); }
  private domainConfig() { const token = process.env.VERCEL_ACCESS_TOKEN; const project = process.env.VERCEL_PROJECT_ID; if (!token || !project) throw new ApplicationError('Custom domain integration is not configured', 'PROFILE_DOMAINS_NOT_CONFIGURED', 503); return { token, project, team: process.env.VERCEL_TEAM_ID }; }

  async addDomain(profileId: string, userId: number, hostnameInput: string) {
    this.ensureDomainsEnabled(); await this.owned(profileId, userId, true); const config = this.domainConfig();
    const hostname = hostnameInput.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0];
    if (!/^(?=.{3,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(hostname)) throw new ApplicationError('Invalid hostname', 'PROFILE_DOMAIN_INVALID', 400);
    const query = config.team ? `?teamId=${encodeURIComponent(config.team)}` : '';
    const response = await fetch(`https://api.vercel.com/v10/projects/${encodeURIComponent(config.project)}/domains${query}`, { method: 'POST', headers: { authorization: `Bearer ${config.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ name: hostname }) });
    const payload = await response.json() as any;
    if (!response.ok) throw new ApplicationError('Unable to add custom domain', 'PROFILE_DOMAIN_PROVIDER_ERROR', 502, { providerCode: payload?.error?.code });
    return dataSource.getRepository(PublicProfileDomain).save({ profileId, hostname, status: payload.verified ? 'active' : 'pending', verification: payload.verification || null, isCanonical: false, verifiedAt: payload.verified ? new Date() : null, lastCheckedAt: new Date(), lastError: null });
  }

  async verifyDomain(profileId: string, domainId: string, userId: number) {
    this.ensureDomainsEnabled(); await this.owned(profileId, userId, true); const config = this.domainConfig(); const repo = dataSource.getRepository(PublicProfileDomain);
    const domain = await repo.findOne({ where: { domainId, profileId } }); if (!domain) throw new ApplicationError('Domain not found', 'PROFILE_DOMAIN_NOT_FOUND', 404);
    const query = config.team ? `?teamId=${encodeURIComponent(config.team)}` : '';
    const response = await fetch(`https://api.vercel.com/v9/projects/${encodeURIComponent(config.project)}/domains/${encodeURIComponent(domain.hostname)}/verify${query}`, { method: 'POST', headers: { authorization: `Bearer ${config.token}` } });
    const payload = await response.json() as any; domain.lastCheckedAt = new Date(); domain.verification = payload.verification || domain.verification;
    domain.status = response.ok && payload.verified ? 'active' : 'verifying'; domain.verifiedAt = domain.status === 'active' ? new Date() : null; domain.lastError = response.ok ? null : String(payload?.error?.message || 'Verification pending').slice(0, 500); return repo.save(domain);
  }

  async setCanonicalDomain(profileId: string, domainId: string, userId: number) {
    this.ensureDomainsEnabled(); await this.owned(profileId, userId, true); const repo = dataSource.getRepository(PublicProfileDomain);
    const domain = await repo.findOne({ where: { domainId, profileId } });
    if (!domain || domain.status !== 'active') throw new ApplicationError('Only a verified domain can be canonical', 'PROFILE_DOMAIN_NOT_ACTIVE', 409);
    await dataSource.transaction(async manager => {
      await manager.getRepository(PublicProfileDomain).update({ profileId }, { isCanonical: false });
      await manager.getRepository(PublicProfileDomain).update({ domainId, profileId }, { isCanonical: true });
    });
    return repo.findOneByOrFail({ domainId, profileId });
  }

  async removeDomain(profileId: string, domainId: string, userId: number) {
    this.ensureDomainsEnabled(); await this.owned(profileId, userId, true); const config = this.domainConfig(); const repo = dataSource.getRepository(PublicProfileDomain); const domain = await repo.findOne({ where: { domainId, profileId } }); if (!domain) return;
    const query = config.team ? `?teamId=${encodeURIComponent(config.team)}` : '';
    const response = await fetch(`https://api.vercel.com/v9/projects/${encodeURIComponent(config.project)}/domains/${encodeURIComponent(domain.hostname)}${query}`, { method: 'DELETE', headers: { authorization: `Bearer ${config.token}` } });
    if (!response.ok && response.status !== 404) throw new ApplicationError('Unable to remove custom domain', 'PROFILE_DOMAIN_PROVIDER_ERROR', 502);
    await repo.remove(domain);
  }
}

export const profilePlatformService = new ProfilePlatformService();
