import { NextFunction, Request, Response } from 'express';
import { productFunnelService } from '../services/product-funnel.service';
export class ProductFunnelController {
  record = async (req: Request, res: Response, next: NextFunction) => { try { if (req.body?.consentVersion !== (process.env.PRIVACY_POLICY_VERSION || '2026-08')) return res.status(204).end(); await productFunnelService.record(String(req.body?.eventType || ''), String(req.body?.sessionId || ''), null, req.body?.metadata); res.status(202).json({ success: true }); } catch (error) { next(error); } };
  report = async (req: Request, res: Response, next: NextFunction) => { try { res.json({ success: true, data: await productFunnelService.report(req.query.from as string | undefined, req.query.to as string | undefined) }); } catch (error) { next(error); } };
}
