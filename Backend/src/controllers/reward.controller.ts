import { NextFunction, Request, Response } from 'express';
import { rewardService } from '../services/reward.service';

export class RewardController {
  private userId(req: Request) {
    const userId = Number(req.user?.userId);
    if (!userId) throw new Error('Authentication required');
    return userId;
  }

  summary = async (req: Request, res: Response, next: NextFunction) => {
    try { return res.json({ success: true, data: await rewardService.getSummary(this.userId(req)) }); }
    catch (error) { return next(error); }
  };
  missions = async (req: Request, res: Response, next: NextFunction) => {
    try { return res.json({ success: true, data: await rewardService.getMissions(this.userId(req)) }); }
    catch (error) { return next(error); }
  };
  catalog = async (_req: Request, res: Response, next: NextFunction) => {
    try { return res.json({ success: true, data: await rewardService.getCatalog() }); }
    catch (error) { return next(error); }
  };
  requestRedemption = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await rewardService.requestRedemption(this.userId(req), Number(req.body?.itemId), Number(req.body?.quantity || 1), String(req.body?.requestKey || ''));
      return res.status(201).json({ success: true, data });
    } catch (error) { return next(error); }
  };
  cancelRedemption = async (req: Request, res: Response, next: NextFunction) => {
    try { return res.json({ success: true, data: await rewardService.cancelRedemption(this.userId(req), Number(req.params.id)) }); }
    catch (error) { return next(error); }
  };
  seasons = async (_req: Request, res: Response, next: NextFunction) => {
    try { return res.json({ success: true, data: await rewardService.listSeasons() }); }
    catch (error) { return next(error); }
  };
  season = async (req: Request, res: Response, next: NextFunction) => {
    try { return res.json({ success: true, data: await rewardService.getSeason(Number(req.params.seasonId)) }); }
    catch (error) { return next(error); }
  };
  closeSeason = async (req: Request, res: Response, next: NextFunction) => {
    try { return res.json({ success: true, data: await rewardService.closeSeason(Number(req.params.seasonId)) }); }
    catch (error) { return next(error); }
  };
  settings = async (req: Request, res: Response, next: NextFunction) => {
    try { return res.json({ success: true, data: await rewardService.updateSettings(this.userId(req), req.body || {}) }); }
    catch (error) { return next(error); }
  };
  redemptions = async (_req: Request, res: Response, next: NextFunction) => {
    try { return res.json({ success: true, data: await rewardService.listPendingRedemptions() }); }
    catch (error) { return next(error); }
  };
  approve = async (req: Request, res: Response, next: NextFunction) => {
    try { return res.json({ success: true, data: await rewardService.decideRedemption(this.userId(req), Number(req.params.id), 'approved', req.body?.reason) }); }
    catch (error) { return next(error); }
  };
  reject = async (req: Request, res: Response, next: NextFunction) => {
    try { return res.json({ success: true, data: await rewardService.decideRedemption(this.userId(req), Number(req.params.id), 'rejected', req.body?.reason) }); }
    catch (error) { return next(error); }
  };
  fulfill = async (req: Request, res: Response, next: NextFunction) => {
    try { return res.json({ success: true, data: await rewardService.decideRedemption(this.userId(req), Number(req.params.id), 'fulfilled') }); }
    catch (error) { return next(error); }
  };
  createCatalogItem = async (req: Request, res: Response, next: NextFunction) => {
    try { return res.status(201).json({ success: true, data: await rewardService.upsertCatalogItem(this.userId(req), null, req.body) }); }
    catch (error) { return next(error); }
  };
  updateCatalogItem = async (req: Request, res: Response, next: NextFunction) => {
    try { return res.json({ success: true, data: await rewardService.upsertCatalogItem(this.userId(req), Number(req.params.id), req.body) }); }
    catch (error) { return next(error); }
  };
  deactivateCatalogItem = async (req: Request, res: Response, next: NextFunction) => {
    try { return res.json({ success: true, data: await rewardService.deactivateCatalogItem(this.userId(req), Number(req.params.id)) }); }
    catch (error) { return next(error); }
  };
  adminCatalogItems = async (_req: Request, res: Response, next: NextFunction) => {
    try { return res.json({ success: true, data: await rewardService.listCatalogItemsAdmin() }); }
    catch (error) { return next(error); }
  };
  missionTemplates = async (_req: Request, res: Response, next: NextFunction) => {
    try { return res.json({ success: true, data: await rewardService.listMissionTemplates() }); }
    catch (error) { return next(error); }
  };
  updateMissionTemplate = async (req: Request, res: Response, next: NextFunction) => {
    try { return res.json({ success: true, data: await rewardService.updateMissionTemplate(this.userId(req), Number(req.params.id), req.body || {}) }); }
    catch (error) { return next(error); }
  };
}
