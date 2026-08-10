import { Request, Response, NextFunction } from 'express';
import { productivityService } from '../services/productivity.service';

export class ProductivityController {
  duplicate = async (req: Request, res: Response, next: NextFunction) => {
    try { res.status(201).json({ success: true, data: await productivityService.duplicateTask(req.params.taskId, req.user!.userId, Boolean(req.body.includeAttachments)) }); } catch (error) { next(error); }
  };
  checklist = async (req: Request, res: Response, next: NextFunction) => {
    try { res.json({ success: true, data: await productivityService.checklist(req.params.taskId, req.user!.userId) }); } catch (error) { next(error); }
  };
  replaceChecklist = async (req: Request, res: Response, next: NextFunction) => {
    try { res.json({ success: true, data: await productivityService.replaceChecklist(req.params.taskId, req.user!.userId, Array.isArray(req.body.items) ? req.body.items : []) }); } catch (error) { next(error); }
  };
  toggleChecklist = async (req: Request, res: Response, next: NextFunction) => {
    try { res.json({ success: true, data: await productivityService.toggleChecklist(req.params.taskId, Number(req.params.itemId), req.user!.userId, Boolean(req.body.completed)) }); } catch (error) { next(error); }
  };
  block = async (req: Request, res: Response, next: NextFunction) => {
    try { await productivityService.setBlocked(req.params.taskId, req.user!.userId, true, String(req.body.reason || ''), req.body.expectedVersion); res.json({ success: true }); } catch (error) { next(error); }
  };
  unblock = async (req: Request, res: Response, next: NextFunction) => {
    try { await productivityService.setBlocked(req.params.taskId, req.user!.userId, false, '', req.body.expectedVersion); res.json({ success: true }); } catch (error) { next(error); }
  };
  savedViews = async (req: Request, res: Response, next: NextFunction) => {
    try { res.json({ success: true, data: await productivityService.savedViews(req.user!.userId, typeof req.query.pageKey === 'string' ? req.query.pageKey : undefined) }); } catch (error) { next(error); }
  };
  saveView = async (req: Request, res: Response, next: NextFunction) => {
    try { res.status(201).json({ success: true, data: await productivityService.saveView(req.user!.userId, req.body) }); } catch (error) { next(error); }
  };
  deleteView = async (req: Request, res: Response, next: NextFunction) => {
    try { await productivityService.deleteView(req.user!.userId, Number(req.params.id)); res.json({ success: true }); } catch (error) { next(error); }
  };
  templates = async (req: Request, res: Response, next: NextFunction) => {
    try { res.json({ success: true, data: await productivityService.templates(req.user!.userId) }); } catch (error) { next(error); }
  };
  createTemplate = async (req: Request, res: Response, next: NextFunction) => {
    try { res.status(201).json({ success: true, data: await productivityService.createTemplate(req.user!.userId, req.body) }); } catch (error) { next(error); }
  };
  createRecurrence = async (req: Request, res: Response, next: NextFunction) => {
    try { res.status(201).json({ success: true, data: await productivityService.createRecurrence(req.user!.userId, req.body) }); } catch (error) { next(error); }
  };
}
