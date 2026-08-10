import { Router } from 'express';
import { isAuthenticated } from '../middleware/auth.middleware';
import { checkRole } from '../middleware/permission.middleware';
import { RewardController } from '../controllers/reward.controller';

const router = Router();
const controller = new RewardController();

router.use(isAuthenticated, checkRole('Owner'));
router.post('/seasons/:seasonId/close', controller.closeSeason);
router.get('/redemptions', controller.redemptions);
router.post('/redemptions/:id/approve', controller.approve);
router.post('/redemptions/:id/reject', controller.reject);
router.post('/redemptions/:id/fulfill', controller.fulfill);
router.put('/settings', controller.settings);
router.get('/catalog', controller.adminCatalogItems);
router.post('/catalog', controller.createCatalogItem);
router.put('/catalog/:id', controller.updateCatalogItem);
router.delete('/catalog/:id', controller.deactivateCatalogItem);
router.get('/missions', controller.missionTemplates);
router.put('/missions/:id', controller.updateMissionTemplate);

export default router;
