import { Router } from 'express';
import { isAuthenticated } from '../middleware/auth.middleware';
import { UserProfileController } from '../controllers/user-profile.controller';
const router=Router(); const controller=new UserProfileController();
router.get('/public/:handle',controller.public);
router.use(isAuthenticated);
router.get('/me',controller.mine); router.put('/me',controller.save); router.post('/me/publish',controller.publish); router.post('/me/unpublish',controller.unpublish);
export default router;
