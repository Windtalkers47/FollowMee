import { Router } from 'express';
import { isAuthenticated } from '../middleware/auth.middleware';
import { checkAnyRole } from '../middleware/permission.middleware';
import { SystemCapacityController } from '../controllers/system-capacity.controller';
const router = Router();
const controller = new SystemCapacityController();
router.get('/capacity', isAuthenticated, checkAnyRole(['Owner','Admin','Moderator']), controller.get);
export default router;
