import { Request, Response } from 'express';
import { profileLeadService } from '../services/profile-lead.service';
import { PublicProfileLeadStatus } from '../entities/PublicProfileLead';

export class ProfileLeadController {
  private userId(req: Request) { if (!req.user?.userId) throw new Error('Authentication required'); return req.user.userId; }
  private sendError(res: Response, error: unknown) { const item = error as { statusCode?: number; code?: string; message?: string; details?: unknown }; return res.status(item.statusCode || 500).json({ success: false, message: item.message || 'Unexpected error', code: item.code, details: item.details }); }
  private context(req: Request) { const forwarded = req.headers['x-forwarded-for']; return { ip: Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0]?.trim() || req.ip, userAgent: req.get('user-agent'), referrer: req.get('referer') }; }

  submit = async (req: Request, res: Response) => { try { return res.status(202).json({ success: true, data: await profileLeadService.submit(req.params.slug, req.body || {}, this.context(req)) }); } catch (e) { return this.sendError(res, e); } };
  list = async (req: Request, res: Response) => { try { return res.json({ success: true, data: await profileLeadService.list(this.userId(req), { status: req.query.status as PublicProfileLeadStatus, profileId: req.query.profileId as string, page: Number(req.query.page), limit: Number(req.query.limit) }) }); } catch (e) { return this.sendError(res, e); } };
  get = async (req: Request, res: Response) => { try { return res.json({ success: true, data: await profileLeadService.get(req.params.leadId, this.userId(req)) }); } catch (e) { return this.sendError(res, e); } };
  status = async (req: Request, res: Response) => { try { return res.json({ success: true, data: await profileLeadService.updateStatus(req.params.leadId, this.userId(req), req.body?.status) }); } catch (e) { return this.sendError(res, e); } };
  duplicatePreview = async (req: Request, res: Response) => { try { return res.json({ success: true, data: await profileLeadService.duplicatePreview(req.params.leadId, this.userId(req)) }); } catch (e) { return this.sendError(res, e); } };
  convert = async (req: Request, res: Response) => { try { return res.json({ success: true, data: await profileLeadService.convert(req.params.leadId, this.userId(req), req.body || {}) }); } catch (e) { return this.sendError(res, e); } };
}
