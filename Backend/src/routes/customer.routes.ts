import { Router } from 'express';
import { isAuthenticated } from '../middleware/auth.middleware';
import { CustomerController } from '../controllers/customer.controller';
import { body } from 'express-validator';
import { CustomerService } from '../services/customer.service';
import { CustomerRepository } from '../repositories/customer.repository';
import { upload } from '../services/file-upload.service';
import { checkPermission } from '../middleware/permission.middleware';

const router = Router();

// ✅ MANUAL DEPENDENCY INJECTION - Fixed for new constructor
const customerService = new CustomerService();
const customerController = new CustomerController(customerService);

// Protected routes (require authentication)
router.use(isAuthenticated);

// Legacy path retained for compatibility, but CRM customer records are not public.
router.get('/public/:id', checkPermission('VIEW_CUSTOMERS'), (req, res) => customerController.getPublicCustomerProfile(req, res));

router.get('/', checkPermission('VIEW_CUSTOMERS'), (req, res) => {
  const { search } = req.query;

  if (search) {
    return customerController.searchCustomers(req, res);
  }

  req.query.page = req.query.page || '1';
  req.query.limit = req.query.limit || '10';

  return customerController.getCustomers(req, res);
});

// Get customer status statistics
// Returns: { success: boolean, data: { statuses: { status: string, count: number }[], totalStatus: number } }
router.get('/status-stats', checkPermission('VIEW_CUSTOMERS'), (req, res) =>
  customerController.getCustomerStatusStats(req, res)
);

router.patch('/bulk/status', checkPermission('MANAGE_CUSTOMERS'), (req, res) => customerController.bulkUpdateStatus(req, res));
router.post('/bulk/delete', checkPermission('PUBLISH_PROFILES'), (req, res) => customerController.bulkDelete(req, res));

router.get('/:id', checkPermission('VIEW_CUSTOMERS'), (req, res) =>
  customerController.getCustomerById(req, res)
);

router.post(
  '/',
  checkPermission('MANAGE_CUSTOMERS'),
  [
    body('customerName').notEmpty().withMessage('Customer name is required'),
    body('customerEmail').isEmail().withMessage('Valid email is required'),
  ],
  (req, res) => customerController.createCustomer(req, res)
);

router.put('/:id', checkPermission('MANAGE_CUSTOMERS'), (req, res) =>
  customerController.updateCustomer(req, res)
);

// Upload customer profile image
router.post(
  '/:customerId/upload-image',
  checkPermission('MANAGE_CUSTOMERS'),
  upload.single('image'),
  (req, res) => customerController.uploadCustomerImage(req, res)
);

// Delete customer profile image
router.delete(
  '/:customerId/image',
  checkPermission('MANAGE_CUSTOMERS'),
  (req, res) => customerController.deleteCustomerImage(req, res)
);

router.delete('/:id', checkPermission('PUBLISH_PROFILES'), (req, res) =>
  customerController.deleteCustomer(req, res)
);

export default router;
