import { Router } from 'express';
import { isAuthenticated } from '../middleware/auth.middleware';
import { RewardController } from '../controllers/reward.controller';

const router = Router();
const controller = new RewardController();

router.use(isAuthenticated);
router.get('/summary', controller.summary);
router.get('/seasons/current', controller.summary);
router.get('/seasons', controller.seasons);
router.get('/seasons/:seasonId', controller.season);
router.get('/missions', controller.missions);
router.get('/catalog', controller.catalog);
router.post('/redemptions', controller.requestRedemption);
router.post('/redemptions/:id/cancel', controller.cancelRedemption);

export default router;
