import { Router } from 'express';
import { isAuthenticated } from '../middleware/auth.middleware';
import { AnalyticsController } from '../controllers/analytics.controller';
const router = Router();
const controller = new AnalyticsController();
router.use(isAuthenticated);
router.get('/overview', controller.overview);
export default router;
