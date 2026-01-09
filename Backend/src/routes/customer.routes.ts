import { Router } from 'express';
import { isAuthenticated } from '../middleware/auth.middleware';
import { CustomerController } from '../controllers/customer.controller';
import { body } from 'express-validator';
import { CustomerService } from '../services/customer.service';
import { CustomerRepository } from '../repositories/customer.repository';

const router = Router();

// ✅ MANUAL DEPENDENCY INJECTION
const customerRepository = new CustomerRepository();
const customerService = new CustomerService(customerRepository);
const customerController = new CustomerController(customerService);

// Apply authentication middleware
router.use(isAuthenticated);

router.get('/', (req, res) => {
  const { search } = req.query;

  if (search) {
    return customerController.searchCustomers(req, res);
  }

  req.query.page = req.query.page || '1';
  req.query.limit = req.query.limit || '10';

  return customerController.getCustomers(req, res);
});

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

router.delete('/:id', (req, res) =>
  customerController.deleteCustomer(req, res)
);

export default router;
