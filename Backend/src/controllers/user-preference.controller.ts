import { NextFunction, Request, Response } from 'express';
import {
  UpdateUserPreferenceInput,
  UserPreferenceService,
} from '../services/user-preference.service';

export class UserPreferenceController {
  constructor(private readonly service = new UserPreferenceService()) {}

  private resolveLocale(req: Request): string | undefined {
    const requested = String(req.query.locale || req.headers['x-user-locale'] || '');
    return requested.toLowerCase().startsWith('th') ? 'th' : requested ? 'en' : undefined;
  }

  get = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }
      const preference = await this.service.getOrCreate(
        req.user.userId,
        this.resolveLocale(req)
      );
      res.json({ success: true, data: preference });
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ success: false, message: 'Authentication required' });
        return;
      }
      const preference = await this.service.update(
        req.user.userId,
        req.body as UpdateUserPreferenceInput,
        this.resolveLocale(req)
      );
      res.json({ success: true, data: preference });
    } catch (error) {
      if (error instanceof Error && (
        error.message.startsWith('Invalid') ||
        error.message.startsWith('Unsupported')
      )) {
        res.status(400).json({ success: false, message: error.message });
        return;
      }
      next(error);
    }
  };
}
