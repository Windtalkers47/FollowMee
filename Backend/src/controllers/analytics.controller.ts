import { NextFunction, Request, Response } from 'express';
import { analyticsService } from '../services/analytics.service';
export class AnalyticsController {
  overview = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await analyticsService.overview(req.user!.userId, req.user!.roles || [], req.query.scope === 'organization' ? 'organization' : 'personal', req.query.startDate as string, req.query.endDate as string);
      console.info(JSON.stringify({
        event: 'analytics.customer-metrics.completed',
        requestId: res.locals.requestId,
        scope: data.range.scope,
        startDate: data.range.startDate,
        endDate: data.range.endDate,
        portfolioTotal: data.customers.portfolioTotal,
        missingImage: data.customers.missingImage,
      }));
      res.json({ success: true, data });
    } catch (error) { next(error); }
  };
}
