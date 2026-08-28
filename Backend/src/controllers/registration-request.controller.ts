import { NextFunction, Request, Response } from 'express';
import { registrationRequestService } from '../services/registration-request.service';

export class RegistrationRequestController {
  policy = async (_req: Request, res: Response, next: NextFunction) => {
    try { res.json({ success: true, data: await registrationRequestService.getPolicy() }); } catch (error) { next(error); }
  };
  verify = async (req: Request, res: Response, next: NextFunction) => {
    try { res.json({ success: true, data: await registrationRequestService.verify(String(req.query.token || '')) }); } catch (error) { next(error); }
  };
  resend = async (req: Request, res: Response, next: NextFunction) => {
    try { await registrationRequestService.resend(String(req.body?.email || '')); res.json({ success: true }); } catch (error) { next(error); }
  };
  list = async (req: Request, res: Response, next: NextFunction) => {
    try { res.json({ success: true, data: await registrationRequestService.list(req.query.status ? String(req.query.status) : undefined) }); } catch (error) { next(error); }
  };
  approve = async (req: Request, res: Response, next: NextFunction) => {
    try { res.json({ success: true, data: await registrationRequestService.approve(String(req.params.id), req.user!.userId) }); } catch (error) { next(error); }
  };
  reject = async (req: Request, res: Response, next: NextFunction) => {
    try { await registrationRequestService.reject(String(req.params.id), req.user!.userId, req.body?.reason); res.json({ success: true }); } catch (error) { next(error); }
  };
}
