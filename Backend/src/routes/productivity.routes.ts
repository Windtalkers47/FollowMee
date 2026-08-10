import { Router } from 'express';
import { isAuthenticated } from '../middleware/auth.middleware';
import { ProductivityController } from '../controllers/productivity.controller';

const router = Router();
const controller = new ProductivityController();
router.use(isAuthenticated);
router.get('/saved-views', controller.savedViews);
router.post('/saved-views', controller.saveView);
router.delete('/saved-views/:id', controller.deleteView);
router.get('/task-templates', controller.templates);
router.post('/task-templates', controller.createTemplate);
router.post('/task-recurrences', controller.createRecurrence);
export default router;
