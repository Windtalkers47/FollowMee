import { Request, Response } from 'express';
import authService from '../services/auth.service';
import { validationResult } from 'express-validator';

export class AuthController {
  async login(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;
      const { user, token } = await authService.login(email, password);
      
      res.json({ user, token });
    } catch (error: any) {
      res.status(401).json({ message: error.message || 'Authentication failed' });
    }
  }

  async getCurrentUser(req: Request, res: Response) {
    try {
      // @ts-ignore - user is attached by the auth middleware
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const user = await authService.getCurrentUser(userId);
      res.json({ user });
    } catch (error: any) {
      res.status(404).json({ message: error.message || 'User not found' });
    }
  }
}

export default new AuthController();

export class AuthController {
  private customerRepository = AppDataSource.getRepository(Customer);

  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      // Find customer by email
      const customer = await this.customerRepository.findOne({ 
        where: { customerEmail: email } 
      });
      
      if (!customer) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Verify password
      // Note: The Customer entity doesn't have a password field yet.
      // You'll need to add password hashing and verification logic here.
      // For now, we'll assume the password is stored in a field called 'passwordHash'

      // Generate JWT token
      const token = jwt.sign(
        { 
          customerId: customer.customerId, 
          email: customer.customerEmail 
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '1h' }
      );

      res.json({ 
        token,
        customer: {
          customerId: customer.customerId,
          email: customer.customerEmail,
          name: customer.customerName,
          lastName: customer.customerLastName
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  async logout(_req: Request, res: Response) {
    // Clear the token cookie
    res.clearCookie('token');
    res.json({ message: 'Logged out successfully' });
  }

  async getCurrentUser(req: Request, res: Response) {
    try {
      // The user should be attached to the request by the auth middleware
      if (!req.user) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      const customer = await this.customerRepository.findOne({
        where: { customerId: req.user.customerId } 
      });
      if (!customer) {
        return res.status(404).json({ message: 'Customer not found' });
      }

      // Return customer data without sensitive information
      const { customerEmail, customerName, customerLastName } = customer;
      res.json({ customerEmail, customerName, customerLastName });
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
}

export default new AuthController();
