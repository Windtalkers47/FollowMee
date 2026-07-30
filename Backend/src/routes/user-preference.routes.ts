import { Router } from 'express';
import { UserPreferenceController } from '../controllers/user-preference.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();
const controller = new UserPreferenceController();

router.use(authenticateToken);
router.get('/', controller.get);
router.patch('/', controller.update);

export default router;
