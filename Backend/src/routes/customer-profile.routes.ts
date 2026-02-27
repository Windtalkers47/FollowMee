import { Router } from 'express';
import { isAuthenticated } from '../middleware/auth.middleware';
import { ProfileCustomerController } from '../controllers/profile-customer.controller';
import { ProfileCustomerService } from '../services/profile-customer.service';
import { ProfileCustomerRepository } from '../repositories/profile-customer.repository';

const router = Router();

// Profile customer dependencies (always returns active customers)
const profileCustomerRepository = new ProfileCustomerRepository();
const profileCustomerService = new ProfileCustomerService(profileCustomerRepository);
const profileCustomerController = new ProfileCustomerController(profileCustomerService);

// Protected routes (require authentication)
router.use(isAuthenticated);

// Profile customers routes (always returns active customers)
router.get('/', (req, res) => {
  const { search } = req.query;

  if (search) {
    return profileCustomerController.searchProfileCustomers(req, res);
  }

  req.query.page = req.query.page || '1';
  req.query.limit = req.query.limit || '100';

  return profileCustomerController.getProfileCustomers(req, res);
});

export default router;
