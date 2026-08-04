import { Router } from 'express';
import { isAuthenticated } from '../middleware/auth.middleware';
import { CustomerController } from '../controllers/customer.controller';
import { body } from 'express-validator';
import { CustomerService } from '../services/customer.service';
import { CustomerRepository } from '../repositories/customer.repository';
import { upload } from '../services/file-upload.service';

const router = Router();

// ✅ MANUAL DEPENDENCY INJECTION - Fixed for new constructor
const customerService = new CustomerService();
const customerController = new CustomerController(customerService);

// Protected routes (require authentication)
router.use(isAuthenticated);

// Legacy path retained for compatibility, but CRM customer records are not public.
router.get('/public/:id', (req, res) => customerController.getPublicCustomerProfile(req, res));

router.get('/', (req, res) => {
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
router.get('/status-stats', (req, res) =>
  customerController.getCustomerStatusStats(req, res)
);

router.patch('/bulk/status', (req, res) => customerController.bulkUpdateStatus(req, res));
router.post('/bulk/delete', (req, res) => customerController.bulkDelete(req, res));

router.get('/:id', (req, res) =>
  customerController.getCustomerById(req, res)
);

router.post(
  '/',
  [
    body('customerName').notEmpty().withMessage('Customer name is required'),
    body('customerEmail').isEmail().withMessage('Valid email is required'),
  ],
  (req, res) => customerController.createCustomer(req, res)
);

router.put('/:id', (req, res) =>
  customerController.updateCustomer(req, res)
);

router.put('/:id/assignee', (req, res) => customerController.reassignCustomer(req, res));

// Upload customer profile image
router.post(
  '/:customerId/upload-image',
  upload.single('image'),
  (req, res) => customerController.uploadCustomerImage(req, res)
);

// Delete customer profile image
router.delete(
  '/:customerId/image',
  (req, res) => customerController.deleteCustomerImage(req, res)
);

router.delete('/:id', (req, res) =>
  customerController.deleteCustomer(req, res)
);

export default router;
