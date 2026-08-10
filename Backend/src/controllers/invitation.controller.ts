import { Request, Response, NextFunction } from 'express';
import { invitationService } from '../services/invitation.service';

export class InvitationController {
  validate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const invitation = await invitationService.validate(String(req.params.token || ''));
      res.json({ success: true, data: { email: invitation.email, roleId: invitation.roleId, roleName: invitation.roleName, expiresAt: invitation.expiresAt } });
    } catch (error) { next(error); }
  };
  list = async (_req: Request, res: Response, next: NextFunction) => {
    try { res.json({ success: true, data: await invitationService.list() }); } catch (error) { next(error); }
  };
  create = async (req: Request, res: Response, next: NextFunction) => {
    try { res.status(201).json({ success: true, data: await invitationService.create(req.body.email, req.body.roleId ? Number(req.body.roleId) : null, req.user!.userId) }); } catch (error) { next(error); }
  };
  resend = async (req: Request, res: Response, next: NextFunction) => {
    try { res.json({ success: true, data: await invitationService.resend(Number(req.params.id), req.user!.userId) }); } catch (error) { next(error); }
  };
  revoke = async (req: Request, res: Response, next: NextFunction) => {
    try { await invitationService.revoke(Number(req.params.id)); res.json({ success: true }); } catch (error) { next(error); }
  };
}
