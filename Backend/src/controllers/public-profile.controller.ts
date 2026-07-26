import { Request, Response } from 'express';
import {
  PublicProfileEventType,
} from '../entities/PublicProfileEvent';
import {
  PublicProfileInput,
  PublicProfileService,
} from '../services/public-profile.service';
import { uploadBase64Image } from '../config/cloudinary.config';

export class PublicProfileController {
  constructor(private readonly service = new PublicProfileService()) {}

  private userId(req: Request) {
    if (!req.user?.userId) throw new Error('Authentication required');
    return req.user.userId;
  }

  private errorStatus(error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    if (/not found/i.test(message)) return 404;
    if (/already|access|authentication|slug|link|complete|required/i.test(message)) return 400;
    return 500;
  }

  private sendError(res: Response, error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return res.status(this.errorStatus(error)).json({ success: false, message });
  }

  private eventContext(req: Request) {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = Array.isArray(forwarded)
      ? forwarded[0]
      : forwarded?.split(',')[0]?.trim() || req.ip || null;
    return {
      ip,
      userAgent: req.get('user-agent') || null,
      referrer: req.get('referer') || null,
    };
  }

  list = async (req: Request, res: Response) => {
    try {
      const data = await this.service.listOwned(this.userId(req));
      return res.json({ success: true, data });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  get = async (req: Request, res: Response) => {
    try {
      const data = await this.service.getOwned(req.params.profileId, this.userId(req));
      return res.json({ success: true, data });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  create = async (req: Request, res: Response) => {
    try {
      const data = await this.service.create(
        this.userId(req),
        req.body as PublicProfileInput
      );
      return res.status(201).json({ success: true, data });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  update = async (req: Request, res: Response) => {
    try {
      const data = await this.service.update(
        req.params.profileId,
        this.userId(req),
        req.body as PublicProfileInput
      );
      return res.json({ success: true, data });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  uploadAvatar = async (req: Request, res: Response) => {
    try {
      const image = typeof req.body?.image === 'string' ? req.body.image : '';
      if (!/^data:image\/(png|jpe?g|webp);base64,/i.test(image)) {
        return res.status(400).json({ success: false, message: 'A PNG, JPEG or WebP image is required' });
      }
      if (Buffer.byteLength(image, 'utf8') > 8 * 1024 * 1024) {
        return res.status(413).json({ success: false, message: 'Image must be smaller than 6 MB' });
      }
      await this.service.getOwned(req.params.profileId, this.userId(req));
      const avatarUrl = await uploadBase64Image(image, 'followmee/public-profiles');
      const data = await this.service.update(req.params.profileId, this.userId(req), { avatarUrl });
      return res.json({ success: true, data });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  publish = async (req: Request, res: Response) => {
    try {
      const data = await this.service.setPublishState(
        req.params.profileId,
        this.userId(req),
        'published'
      );
      return res.json({ success: true, data });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  unpublish = async (req: Request, res: Response) => {
    try {
      const data = await this.service.setPublishState(
        req.params.profileId,
        this.userId(req),
        'draft'
      );
      return res.json({ success: true, data });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  remove = async (req: Request, res: Response) => {
    try {
      await this.service.remove(req.params.profileId, this.userId(req));
      return res.json({ success: true });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  analytics = async (req: Request, res: Response) => {
    try {
      const data = await this.service.getAnalytics(
        req.params.profileId,
        this.userId(req)
      );
      return res.json({ success: true, data });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  publicBySlug = async (req: Request, res: Response) => {
    try {
      const data = await this.service.getPublic(req.params.slug);
      if (!data) {
        return res.status(404).json({ success: false, message: 'Profile not found' });
      }
      await this.service.recordEvent(data.profileId, 'view', null, this.eventContext(req));
      return res.json({ success: true, data });
    } catch (error) {
      return this.sendError(res, error);
    }
  };

  recordEvent = async (req: Request, res: Response) => {
    try {
      const data = await this.service.getPublic(req.params.slug);
      if (!data) {
        return res.status(404).json({ success: false, message: 'Profile not found' });
      }
      const eventType = req.body?.eventType as PublicProfileEventType;
      const target = typeof req.body?.target === 'string' ? req.body.target : null;
      await this.service.recordEvent(
        data.profileId,
        eventType,
        target,
        this.eventContext(req)
      );
      return res.status(202).json({ success: true });
    } catch (error) {
      return this.sendError(res, error);
    }
  };
}
