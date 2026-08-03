import { NextFunction, Request, Response } from 'express';
import { OwnerService } from '../services/owner.service';

export class OwnerController {
  constructor(private readonly service = new OwnerService()) {}

  getCurrent = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      return res.json({ success: true, data: await this.service.getCurrentOwner() });
    } catch (error) {
      return next(error);
    }
  };

  transfer = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await this.service.transferOwner(
        Number(req.user?.userId),
        Number(req.body?.targetUserId),
        String(req.body?.currentPassword || ''),
      );
      return res.json({ success: true, data });
    } catch (error) {
      return next(error);
    }
  };
}

