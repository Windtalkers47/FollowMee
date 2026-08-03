import { Router } from 'express';
import { PublicProfileController } from '../controllers/public-profile.controller';
import { isAuthenticated } from '../middleware/auth.middleware';
import { checkPermission } from '../middleware/permission.middleware';

const router = Router();
const controller = new PublicProfileController();

router.get('/public/:slug', controller.publicBySlug);
router.post('/public/:slug/events', controller.recordEvent);

router.use(isAuthenticated);
router.get('/', checkPermission('VIEW_CUSTOMERS'), controller.list);
router.post('/', checkPermission('MANAGE_CUSTOMERS'), controller.create);
router.get('/:profileId', checkPermission('VIEW_CUSTOMERS'), controller.get);
router.patch('/:profileId', checkPermission('MANAGE_CUSTOMERS'), controller.update);
router.post('/:profileId/avatar', checkPermission('MANAGE_CUSTOMERS'), controller.uploadAvatar);
router.post('/:profileId/publish', checkPermission('PUBLISH_PROFILES'), controller.publish);
router.post('/:profileId/unpublish', checkPermission('PUBLISH_PROFILES'), controller.unpublish);
router.get('/:profileId/analytics', checkPermission('VIEW_CUSTOMERS'), controller.analytics);
router.delete('/:profileId', checkPermission('PUBLISH_PROFILES'), controller.remove);

export default router;
