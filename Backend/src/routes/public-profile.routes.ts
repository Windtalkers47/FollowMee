import { Router } from 'express';
import { PublicProfileController } from '../controllers/public-profile.controller';
import { isAuthenticated } from '../middleware/auth.middleware';

const router = Router();
const controller = new PublicProfileController();

router.get('/public/:slug', controller.publicBySlug);
router.post('/public/:slug/events', controller.recordEvent);

router.use(isAuthenticated);
router.get('/', controller.list);
router.post('/', controller.create);
router.get('/:profileId', controller.get);
router.patch('/:profileId', controller.update);
router.post('/:profileId/avatar', controller.uploadAvatar);
router.post('/:profileId/publish', controller.publish);
router.post('/:profileId/unpublish', controller.unpublish);
router.get('/:profileId/analytics', controller.analytics);
router.delete('/:profileId', controller.remove);

export default router;
