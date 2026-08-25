import { Router } from 'express';
import { PublicProfileController } from '../controllers/public-profile.controller';
import { isAuthenticated } from '../middleware/auth.middleware';
import rateLimit from 'express-rate-limit';
import { ProfileLeadController } from '../controllers/profile-lead.controller';

const router = Router();
const controller = new PublicProfileController();
const leadController = new ProfileLeadController();
const leadLimiter = rateLimit({ windowMs: 10 * 60_000, limit: Number(process.env.PROFILE_LEAD_RATE_LIMIT || 8), standardHeaders: true, legacyHeaders: false });

router.get('/public/domain/:hostname/meta', controller.publicDomainMeta);
router.get('/public/:slug', controller.publicBySlug);
router.get('/public/:slug/meta', controller.publicMeta);
router.post('/public/:slug/events', controller.recordEvent);
router.post('/public/:slug/leads', leadLimiter, leadController.submit);

router.use(isAuthenticated);
router.get('/', controller.list);
router.post('/', controller.create);
router.post('/quick-create', controller.quickCreate);
router.get('/leads/inbox', leadController.list);
router.get('/leads/:leadId', leadController.get);
router.patch('/leads/:leadId/status', leadController.status);
router.patch('/leads/:leadId/assignee', leadController.assign);
router.get('/leads/:leadId/duplicates', leadController.duplicatePreview);
router.post('/leads/:leadId/convert', leadController.convert);
router.get('/:profileId', controller.get);
router.patch('/:profileId', controller.update);
router.post('/:profileId/avatar', controller.uploadAvatar);
router.post('/:profileId/publish', controller.publish);
router.post('/:profileId/unpublish', controller.unpublish);
router.get('/:profileId/analytics', controller.analytics);
router.get('/:profileId/revisions', controller.revisions);
router.get('/:profileId/revisions/:revisionId/diff', controller.revisionDiff);
router.post('/:profileId/revisions/:revisionId/restore', controller.restoreRevision);
router.post('/:profileId/link-checks', controller.checkLinks);
router.post('/:profileId/links/import-preview', controller.previewLinkImport);
router.post('/:profileId/links/import', controller.applyLinkImport);
router.get('/:profileId/domains', controller.domains);
router.post('/:profileId/domains', controller.addDomain);
router.post('/:profileId/domains/:domainId/verify', controller.verifyDomain);
router.patch('/:profileId/domains/:domainId/canonical', controller.setCanonicalDomain);
router.delete('/:profileId/domains/:domainId', controller.removeDomain);
router.delete('/:profileId', controller.remove);

export default router;
