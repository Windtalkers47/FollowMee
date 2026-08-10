import { NextFunction, Request, Response } from 'express';
import { analyticsService } from '../services/analytics.service';
export class AnalyticsController {
  overview = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await analyticsService.overview(req.user!.userId, req.user!.roles || [], req.query.scope === 'organization' ? 'organization' : 'personal', req.query.startDate as string, req.query.endDate as string);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  };
}
