import { Request, Response } from 'express';
import {
  PublicProfileEventType,
} from '../entities/PublicProfileEvent';
import {
  PublicProfileInput,
  PublicProfileService,
} from '../services/public-profile.service';
import { uploadBase64Image } from '../config/cloudinary.config';
import auditService from '../services/audit.service';
import { profilePlatformService } from '../services/profile-platform.service';
import { ApplicationError } from '../errors/application.error';
import { productFunnelService } from '../services/product-funnel.service';

export class PublicProfileController {
  constructor(private readonly service = new PublicProfileService()) {}

  private userId(req: Request) {
    if (!req.user?.userId) throw new Error('Authentication required');
    return req.user.userId;
  }

  private presentForUser<T>(data: T, req: Request): T & { capabilities: Record<string, boolean> } {
    const capabilities = (data as T & { capabilities?: Record<string, boolean> }).capabilities;
    return {
      ...(data as T),
      capabilities: capabilities || { canEdit: false, canPublish: false, canUnpublish: false, canDelete: false },
    };
  }

  private errorStatus(error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    if (/not found/i.test(message)) return 404;
    const statusCode = Number((error as { statusCode?: number })?.statusCode);
    if (statusCode) return statusCode;
    if (/already|access|authentication|slug|link|complete|required/i.test(message)) return 400;
    return 500;
  }

  private sendError(res: Response, error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    const item = error as { code?: string; details?: unknown; messageKey?: string };
    return res.status(this.errorStatus(error)).json({ success: false, message, code: item.code, details: item.details, messageKey: item.messageKey });
  }

  private eventContext(req: Request) {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = Array.isArray(forwarded)
      ? forwarded[0]
      : forwarded?.split(',')[0]?.trim() || req.ip || null;
    return {
      ip,
      userAgent: req.get('user-agent') || null,
      referrer: req.get('referer') || null,
      sessionId: typeof req.body?.sessionId === 'string' ? req.body.sessionId : null,
      utmSource: typeof req.body?.utmSource === 'string' ? req.body.utmSource : null,
      utmMedium: typeof req.body?.utmMedium === 'string' ? req.body.utmMedium : null,
      utmCampaign: typeof req.body?.utmCampaign === 'string' ? req.body.utmCampaign : null,
    };
  }

  list = async (req: Request, res: Response) => {
    try {
      const data = await this.service.listOwned(this.userId(req));
      return res.json({ success: true, data: data.map(item => this.presentForUser(item, req)) });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  get = async (req: Request, res: Response) => {
    try {
      const data = await this.service.getOwned(req.params.profileId, this.userId(req));
      return res.json({ success: true, data: this.presentForUser(data, req) });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  create = async (req: Request, res: Response) => {
    try {
      const data = await this.service.create(
        this.userId(req),
        req.body as PublicProfileInput
      );
      await auditService.logEvent({ userId: this.userId(req), action: 'PUBLIC_PROFILE_CREATED', status: 'SUCCESS', details: { profileId: data.profileId } });
      return res.status(201).json({ success: true, data: this.presentForUser(data, req) });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  quickCreate = async (req: Request, res: Response) => {
    try {
      const data = await profilePlatformService.quickCreate(this.userId(req), req.body || {});
      await auditService.logEvent({ userId: this.userId(req), action: 'PUBLIC_PROFILE_QUICK_CREATED', status: 'SUCCESS', details: { profileId: data.profileId } });
      if (req.body?.funnelSessionId) await productFunnelService.record('draft_created', String(req.body.funnelSessionId), this.userId(req));
      return res.status(201).json({ success: true, data: this.presentForUser(data, req) });
    } catch (error) { return this.sendError(res, error); }
  };

  update = async (req: Request, res: Response) => {
    try {
      const data = await this.service.update(
        req.params.profileId,
        this.userId(req),
        req.body as PublicProfileInput
      );
      await auditService.logEvent({ userId: this.userId(req), action: 'PUBLIC_PROFILE_UPDATED', status: 'SUCCESS', details: { profileId: data.profileId } });
      return res.json({ success: true, data: this.presentForUser(data, req) });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  uploadAvatar = async (req: Request, res: Response) => {
    try {
      const image = typeof req.body?.image === 'string' ? req.body.image : '';
      if (!/^data:image\/(png|jpe?g|webp);base64,/i.test(image)) {
        return res.status(400).json({ success: false, message: 'A PNG, JPEG or WebP image is required' });
      }
      if (Buffer.byteLength(image, 'utf8') > 8 * 1024 * 1024) {
        return res.status(413).json({ success: false, message: 'Image must be smaller than 6 MB' });
      }
      const existing = await this.service.getOwned(req.params.profileId, this.userId(req)) as unknown as { capabilities?: { canEdit?: boolean } };
      if (!existing.capabilities?.canEdit) {
        return res.status(403).json({ success: false, code: 'PROFILE_EDIT_FORBIDDEN', message: 'Only the customer creator, assignee, or Owner can edit this profile' });
      }
      const avatarUrl = await uploadBase64Image(image, 'followmee/public-profiles');
      const data = await this.service.update(req.params.profileId, this.userId(req), { avatarUrl });
      return res.json({ success: true, data: this.presentForUser(data, req) });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  publish = async (req: Request, res: Response) => {
    try {
      const linkChecks = await profilePlatformService.checkLinks(req.params.profileId, this.userId(req));
      const unsafe = linkChecks.filter(check => check.status === 'invalid');
      if (unsafe.length) throw new ApplicationError('One or more links are malformed or unsafe', 'PROFILE_PUBLISH_LINKS_INVALID', 409, { linkChecks: unsafe });
      const warnings = linkChecks.filter(check => check.status === 'warning');
      if (warnings.length && req.body?.acknowledgeLinkWarnings !== true) throw new ApplicationError('Some links could not be verified', 'PROFILE_PUBLISH_LINK_WARNINGS', 409, { linkChecks: warnings });
      const data = await this.service.setPublishState(
        req.params.profileId,
        this.userId(req),
        'published'
      );
      await auditService.logEvent({ userId: this.userId(req), action: 'PUBLIC_PROFILE_PUBLISHED', status: 'SUCCESS', details: { profileId: data.profileId } });
      if (req.body?.funnelSessionId) await productFunnelService.record('published', String(req.body.funnelSessionId), this.userId(req));
      return res.json({ success: true, data: this.presentForUser(data, req) });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  unpublish = async (req: Request, res: Response) => {
    try {
      const data = await this.service.setPublishState(
        req.params.profileId,
        this.userId(req),
        'draft'
      );
      await auditService.logEvent({ userId: this.userId(req), action: 'PUBLIC_PROFILE_UNPUBLISHED', status: 'SUCCESS', details: { profileId: data.profileId } });
      return res.json({ success: true, data: this.presentForUser(data, req) });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  remove = async (req: Request, res: Response) => {
    try {
      await this.service.remove(req.params.profileId, this.userId(req));
      await auditService.logEvent({ userId: this.userId(req), action: 'PUBLIC_PROFILE_DELETED', status: 'SUCCESS', details: { profileId: req.params.profileId } });
      return res.json({ success: true });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  analytics = async (req: Request, res: Response) => {
    try {
      const data = await this.service.getAnalytics(
        req.params.profileId,
        this.userId(req),
        { from: req.query.from as string | undefined, to: req.query.to as string | undefined, compare: req.query.compare === 'previous' }
      );
      return res.json({ success: true, data });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  revisions = async (req: Request, res: Response) => { try { return res.json({ success: true, data: await profilePlatformService.revisions(req.params.profileId, this.userId(req)) }); } catch (error) { return this.sendError(res, error); } };
  revisionDiff = async (req: Request, res: Response) => { try { return res.json({ success: true, data: await profilePlatformService.revisionDiff(req.params.profileId, req.params.revisionId, this.userId(req), req.query.againstRevisionId as string | undefined) }); } catch (error) { return this.sendError(res, error); } };
  restoreRevision = async (req: Request, res: Response) => { try { return res.json({ success: true, data: await profilePlatformService.restore(req.params.profileId, req.params.revisionId, this.userId(req), req.body?.slug) }); } catch (error) { return this.sendError(res, error); } };
  checkLinks = async (req: Request, res: Response) => { try { return res.json({ success: true, data: await profilePlatformService.checkLinks(req.params.profileId, this.userId(req)) }); } catch (error) { return this.sendError(res, error); } };
  previewLinkImport = async (req: Request, res: Response) => { try { return res.json({ success: true, data: await profilePlatformService.previewLinkImport(req.params.profileId, this.userId(req), req.body || {}) }); } catch (error) { return this.sendError(res, error); } };
  applyLinkImport = async (req: Request, res: Response) => { try { return res.json({ success: true, data: await profilePlatformService.applyLinkImport(req.params.profileId, this.userId(req), req.body || {}) }); } catch (error) { return this.sendError(res, error); } };
  domains = async (req: Request, res: Response) => { try { return res.json({ success: true, data: await profilePlatformService.domains(req.params.profileId, this.userId(req)) }); } catch (error) { return this.sendError(res, error); } };
  addDomain = async (req: Request, res: Response) => { try { return res.status(201).json({ success: true, data: await profilePlatformService.addDomain(req.params.profileId, this.userId(req), String(req.body?.hostname || '')) }); } catch (error) { return this.sendError(res, error); } };
  verifyDomain = async (req: Request, res: Response) => { try { return res.json({ success: true, data: await profilePlatformService.verifyDomain(req.params.profileId, req.params.domainId, this.userId(req)) }); } catch (error) { return this.sendError(res, error); } };
  setCanonicalDomain = async (req: Request, res: Response) => { try { return res.json({ success: true, data: await profilePlatformService.setCanonicalDomain(req.params.profileId, req.params.domainId, this.userId(req), req.body?.redirectToCanonical !== false) }); } catch (error) { return this.sendError(res, error); } };
  removeDomain = async (req: Request, res: Response) => { try { await profilePlatformService.removeDomain(req.params.profileId, req.params.domainId, this.userId(req)); return res.json({ success: true }); } catch (error) { return this.sendError(res, error); } };

  publicBySlug = async (req: Request, res: Response) => {
    try {
      const data = await this.service.getPublic(req.params.slug);
      if (!data) {
        return res.status(404).json({ success: false, message: 'Profile not found' });
      }
      await this.service.recordEvent(data.profileId, 'view', null, this.eventContext(req));
      return res.json({ success: true, data });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  publicMeta = async (req: Request, res: Response) => {
    try {
      const data = await this.service.getPublicMeta(req.params.slug);
      if (!data) return res.status(404).set('Cache-Control', 'public, s-maxage=30').json({ success: false, message: 'Profile not found' });
      return res.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300').json({ success: true, data });
    } catch (error) { return this.sendError(res, error); }
  };

  publicDomainMeta = async (req: Request, res: Response) => {
    try { const data = await this.service.getPublicMetaByHostname(req.params.hostname); if (!data) return res.status(404).json({ success: false, message: 'Profile not found' }); return res.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300').json({ success: true, data }); }
    catch (error) { return this.sendError(res, error); }
  };

  recordEvent = async (req: Request, res: Response) => {
    try {
      const data = await this.service.getPublic(req.params.slug);
      if (!data) {
        return res.status(404).json({ success: false, message: 'Profile not found' });
      }
      const eventType = req.body?.eventType as PublicProfileEventType;
      const target = typeof req.body?.target === 'string' ? req.body.target : null;
      await this.service.recordEvent(
        data.profileId,
        eventType,
        target,
        this.eventContext(req)
      );
      return res.status(202).json({ success: true });
    } catch (error) {
      return this.sendError(res, error);
    }
  };
}
