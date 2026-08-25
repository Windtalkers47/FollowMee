import { NextFunction, Request, Response } from 'express';
import { privacyService } from '../services/privacy.service';
export class PrivacyController {
  create = async (req: Request, res: Response, next: NextFunction) => { try { res.status(202).json({ success: true, data: await privacyService.createRequest(req.body) }); } catch (error) { next(error); } };
  verify = async (req: Request, res: Response, next: NextFunction) => { try { res.json({ success: true, data: await privacyService.verify(String(req.query.token || '')) }); } catch (error) { next(error); } };
  consent = async (req: Request, res: Response, next: NextFunction) => { try { res.status(201).json({ success: true, data: await privacyService.recordConsent(req.body, req.user?.userId) }); } catch (error) { next(error); } };
  list = async (req: Request, res: Response, next: NextFunction) => { try { res.json({ success: true, data: await privacyService.list(req.query.status ? String(req.query.status) : undefined) }); } catch (error) { next(error); } };
  update = async (req: Request, res: Response, next: NextFunction) => { try { res.json({ success: true, data: await privacyService.update(String(req.params.id), req.user!.userId, req.body) }); } catch (error) { next(error); } };
}
