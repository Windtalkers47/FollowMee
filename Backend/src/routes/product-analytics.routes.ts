import { Router } from 'express'; import rateLimit from 'express-rate-limit'; import { ProductFunnelController } from '../controllers/product-funnel.controller';
const router = Router(); const controller = new ProductFunnelController(); router.post('/events', rateLimit({ windowMs: 60000, limit: 30 }), controller.record); export default router;
