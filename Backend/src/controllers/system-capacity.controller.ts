import { NextFunction, Request, Response } from 'express';
import { systemCapacityService } from '../services/system-capacity.service';
export class SystemCapacityController {
  get = async (_req: Request, res: Response, next: NextFunction) => {
    try { res.json({ success: true, data: await systemCapacityService.snapshot() }); } catch (error) { next(error); }
  };
}
