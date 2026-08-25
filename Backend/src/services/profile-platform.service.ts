import crypto from 'crypto';
import dns from 'dns/promises';
import net from 'net';
import { IsNull, MoreThan } from 'typeorm';
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
import auditService from './audit.service';

const normalizeSlug = (value: string) => value.trim().toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9-]+/g, '-').replace(/-{2,}/g, '-').replace(/^-|-$/g, '').slice(0, 64);
const isPrivateIp = (address: string) => {
  if (net.isIPv4(address)) {
    const [a, b] = address.split('.').map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224;
  }
  const value = address.toLowerCase();
  if (value.startsWith('::ffff:')) return isPrivateIp(value.slice(7));
  return value === '::1' || value === '::' || value.startsWith('fc') || value.startsWith('fd') || value.startsWith('fe80:') || value.startsWith('2001:db8:');
};

export const validatePublicLinkTarget = async (rawUrl: string, redirectCount = 0): Promise<{ status: ProfileLinkHealth; httpStatus: number | null; detail: string }> => {
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
    const hostname = url.hostname.replace(/^\[|\]$/g, '');
    const addresses = net.isIP(hostname) ? [{ address: hostname }] : await dns.lookup(hostname, { all: true });
    if (!addresses.length || addresses.some(item => isPrivateIp(item.address))) return { status: 'invalid' as ProfileLinkHealth, httpStatus: null, detail: 'Private or reserved destination' };
  } catch { return { status: 'warning' as ProfileLinkHealth, httpStatus: null, detail: 'DNS lookup failed' }; }
  const abort = new AbortController(); const timer = setTimeout(() => abort.abort(), 4_000);
  try {
    let response = await fetch(url, { method: 'HEAD', redirect: 'manual', signal: abort.signal, headers: { 'user-agent': 'FollowMee-Link-Checker/1.0' } });
    if ([405, 501].includes(response.status)) response = await fetch(url, { method: 'GET', redirect: 'manual', signal: abort.signal, headers: { 'user-agent': 'FollowMee-Link-Checker/1.0', range: 'bytes=0-1023' } });
    if (response.status >= 300 && response.status < 400 && response.headers.get('location')) {
      if (redirectCount >= 3) return { status: 'warning', httpStatus: response.status, detail: 'Too many redirects' };
      return validatePublicLinkTarget(new URL(response.headers.get('location')!, url).toString(), redirectCount + 1);
    }
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

  async revisionDiff(profileId: string, revisionId: string, userId: number, againstRevisionId?: string) {
    const profile = await this.owned(profileId, userId); const repo = dataSource.getRepository(PublicProfileRevision);
    const revision = await repo.findOne({ where: { revisionId, profileId } });
    if (!revision) throw new ApplicationError('Revision not found', 'PROFILE_REVISION_NOT_FOUND', 404);
    const against = againstRevisionId ? await repo.findOne({ where: { revisionId: againstRevisionId, profileId } }) : null;
    if (againstRevisionId && !against) throw new ApplicationError('Comparison revision not found', 'PROFILE_REVISION_NOT_FOUND', 404);
    const before = revision.snapshot as Record<string, unknown>; const after = against ? against.snapshot as Record<string, unknown> : this.snapshot(profile);
    const ignored = new Set(['events','user','customer','updatedAt','createdAt']);
    const fields = [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(field => !ignored.has(field) && JSON.stringify(before[field]) !== JSON.stringify(after[field])).map(field => ({ field, before: before[field] ?? null, after: after[field] ?? null }));
    return { revisionId, againstRevisionId: againstRevisionId || null, fields };
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
    const repo = dataSource.getRepository(PublicProfileLinkCheck); const freshSince = new Date(Date.now() - 24 * 60 * 60_000); const results: PublicProfileLinkCheck[] = [];
    for (let index = 0; index < targets.length; index += 3) {
      const batch = targets.slice(index, index + 3);
      results.push(...await Promise.all(batch.map(async target => {
        const cached = await repo.findOne({ where: { profileId, targetKey: target.key, url: target.url, checkedAt: MoreThan(freshSince) }, order: { checkedAt: 'DESC' } });
        if (cached) return cached;
        const result = await validatePublicLinkTarget(target.url); return repo.save({ profileId, targetKey: target.key, url: target.url, ...result });
      })));
    }
    return results;
  }

  async previewLinkImport(profileId: string, userId: number, input: { mode?: string; rows?: any[] }) {
    const profile = await this.owned(profileId, userId); const mode = input.mode === 'replace' ? 'replace' : 'append'; const rows = Array.isArray(input.rows) ? input.rows : [];
    const allowed = new Set(['website','facebook','instagram','tiktok','line','x']); const errors: Array<{ row: number; code: string }> = []; const seen = new Set<string>();
    const normalized = rows.slice(0, 24).flatMap((row, index) => {
      const platform = String(row?.platform || '').trim().toLowerCase(); const label = String(row?.label || '').trim().slice(0, 60); const url = String(row?.url || '').trim().slice(0, 512);
      if (!allowed.has(platform) || !label || !url) { errors.push({ row: index + 1, code: 'invalid_row' }); return []; }
      try { const parsed = new URL(url); if (!['http:','https:','mailto:','tel:'].includes(parsed.protocol)) throw new Error(); } catch { errors.push({ row: index + 1, code: 'invalid_url' }); return []; }
      const key = url.toLowerCase(); if (seen.has(key)) { errors.push({ row: index + 1, code: 'duplicate_url' }); return []; } seen.add(key);
      return [{ platform, label, url, isVisible: row?.isVisible !== false && !/^(false|0|no)$/i.test(String(row?.visible || '')), sortOrder: Number.isFinite(Number(row?.sortOrder)) ? Number(row.sortOrder) : index }];
    });
    const existing = mode === 'append' ? (profile.links || []).map(link => ({ platform: link.platform, label: link.label, url: link.url, isVisible: link.isVisible, sortOrder: link.sortOrder })) : [];
    const existingUrls = new Set(existing.map(link => link.url.toLowerCase())); const unique = normalized.filter((link, index) => { if (existingUrls.has(link.url.toLowerCase())) { errors.push({ row: index + 1, code: 'duplicate_existing_url' }); return false; } return true; });
    const links = [...existing, ...unique].slice(0, 12).map((link, index) => ({ ...link, sortOrder: index }));
    if (existing.length + unique.length > 12 || rows.length > 12) errors.push({ row: 13, code: 'maximum_links' });
    return { mode, links, errors, canApply: errors.length === 0 };
  }

  async applyLinkImport(profileId: string, userId: number, input: { mode?: string; rows?: any[] }) {
    const preview = await this.previewLinkImport(profileId, userId, input);
    if (!preview.canApply) throw new ApplicationError('Fix import errors before applying', 'PROFILE_LINK_IMPORT_INVALID', 400, preview);
    await dataSource.transaction(async manager => { await manager.getRepository(PublicProfileLink).delete({ profileId }); if (preview.links.length) await manager.getRepository(PublicProfileLink).save(preview.links.map(link => manager.getRepository(PublicProfileLink).create({ ...link, profileId }))); });
    await this.recordRevision(profileId, userId, 'manual'); return this.owned(profileId, userId);
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
    const domain = await dataSource.getRepository(PublicProfileDomain).save({ profileId, hostname, status: payload.verified ? 'active' : 'pending', verification: payload.verification || null, isCanonical: false, redirectToCanonical: true, verifiedAt: payload.verified ? new Date() : null, lastCheckedAt: new Date(), lastError: null });
    await auditService.logEvent({ userId, action: 'PUBLIC_PROFILE_DOMAIN_ADDED', status: 'SUCCESS', details: { profileId, domainId: domain.domainId, hostname } }); return domain;
  }

  async verifyDomain(profileId: string, domainId: string, userId: number) {
    this.ensureDomainsEnabled(); await this.owned(profileId, userId, true); const config = this.domainConfig(); const repo = dataSource.getRepository(PublicProfileDomain);
    const domain = await repo.findOne({ where: { domainId, profileId } }); if (!domain) throw new ApplicationError('Domain not found', 'PROFILE_DOMAIN_NOT_FOUND', 404);
    const query = config.team ? `?teamId=${encodeURIComponent(config.team)}` : '';
    const response = await fetch(`https://api.vercel.com/v9/projects/${encodeURIComponent(config.project)}/domains/${encodeURIComponent(domain.hostname)}/verify${query}`, { method: 'POST', headers: { authorization: `Bearer ${config.token}` } });
    const payload = await response.json() as any; domain.lastCheckedAt = new Date(); domain.verification = payload.verification || domain.verification;
    domain.status = response.ok && payload.verified ? 'active' : 'verifying'; domain.verifiedAt = domain.status === 'active' ? new Date() : null; domain.lastError = response.ok ? null : String(payload?.error?.message || 'Verification pending').slice(0, 500); const saved = await repo.save(domain); await auditService.logEvent({ userId, action: 'PUBLIC_PROFILE_DOMAIN_VERIFIED', status: response.ok ? 'SUCCESS' : 'FAILURE', details: { profileId, domainId, hostname: domain.hostname, domainStatus: domain.status } }); return saved;
  }

  async setCanonicalDomain(profileId: string, domainId: string, userId: number, redirectToCanonical = true) {
    this.ensureDomainsEnabled(); await this.owned(profileId, userId, true); const repo = dataSource.getRepository(PublicProfileDomain);
    const domain = await repo.findOne({ where: { domainId, profileId } });
    if (!domain || domain.status !== 'active') throw new ApplicationError('Only a verified domain can be canonical', 'PROFILE_DOMAIN_NOT_ACTIVE', 409);
    await dataSource.transaction(async manager => {
      await manager.getRepository(PublicProfileDomain).update({ profileId }, { isCanonical: false });
      await manager.getRepository(PublicProfileDomain).update({ domainId, profileId }, { isCanonical: true, redirectToCanonical });
    });
    await auditService.logEvent({ userId, action: 'PUBLIC_PROFILE_DOMAIN_CANONICAL_SET', status: 'SUCCESS', details: { profileId, domainId, redirectToCanonical } });
    return repo.findOneByOrFail({ domainId, profileId });
  }

  async removeDomain(profileId: string, domainId: string, userId: number) {
    this.ensureDomainsEnabled(); await this.owned(profileId, userId, true); const config = this.domainConfig(); const repo = dataSource.getRepository(PublicProfileDomain); const domain = await repo.findOne({ where: { domainId, profileId } }); if (!domain) return;
    const query = config.team ? `?teamId=${encodeURIComponent(config.team)}` : '';
    const response = await fetch(`https://api.vercel.com/v9/projects/${encodeURIComponent(config.project)}/domains/${encodeURIComponent(domain.hostname)}${query}`, { method: 'DELETE', headers: { authorization: `Bearer ${config.token}` } });
    if (!response.ok && response.status !== 404) throw new ApplicationError('Unable to remove custom domain', 'PROFILE_DOMAIN_PROVIDER_ERROR', 502);
    await repo.remove(domain);
    await auditService.logEvent({ userId, action: 'PUBLIC_PROFILE_DOMAIN_REMOVED', status: 'SUCCESS', details: { profileId, domainId, hostname: domain.hostname } });
  }
}

export const profilePlatformService = new ProfilePlatformService();
