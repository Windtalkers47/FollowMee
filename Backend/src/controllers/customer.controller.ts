import { Request, Response } from 'express';
import { CustomerService } from '../services/customer.service';
import { CreateCustomerDto } from '../dtos/create-customer.dto';
import { UpdateCustomerDto } from '../dtos/update-customer.dto';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  /**
   * Get all customers (paginated)
   */
  async getCustomers(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      
      const [customers, total] = await this.customerService.findAll(true);
      
      return res.json({ 
        success: true, 
        data: customers,
        meta: { 
          total: +total, 
          page: +page, 
          limit: +limit,
          totalPages: Math.ceil(Number(total) / +limit)
        }
      });
    } catch (error: unknown) {
      console.error('Error getting customers:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch customers',
        error: errorMessage
      });
    }
  }

  /**
   * Search customers
   */
  async searchCustomers(req: Request, res: Response) {
    try {
      const { search } = req.query;
      if (!search) {
        return res.status(400).json({ 
          success: false, 
          message: 'Search query is required' 
        });
      }
      
      const results = await this.customerService.search(search as string);
      
      return res.json({ 
        success: true, 
        data: results,
        meta: { 
          total: results.length, 
          page: 1, 
          limit: results.length 
        }
      });
    } catch (error: unknown) {
      console.error('Error searching customers:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to search customers',
        error: errorMessage
      });
    }
  }

  /**
   * Get a single customer by ID
   */
  async getCustomerById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const customer = await this.customerService.findOne(id);
      
      if (!customer) {
        return res.status(404).json({ 
          success: false, 
          message: 'Customer not found' 
        });
      }
      
      return res.json({ 
        success: true, 
        data: customer 
      });
    } catch (error: unknown) {
      console.error('Error getting customer:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch customer',
        error: errorMessage
      });
    }
  }

  /**
   * Create a new customer
   */
  async createCustomer(req: Request, res: Response) {
    try {
      const createCustomerDto = plainToInstance(CreateCustomerDto, req.body);
      const errors = await validate(createCustomerDto);
      
      if (errors.length > 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Validation failed',
          errors: errors.map(err => Object.values(err.constraints || {})).flat()
        });
      }
      
      const customer = await this.customerService.create(createCustomerDto);
      
      return res.status(201).json({ 
        success: true, 
        data: customer,
        message: 'Customer created successfully' 
      });
    } catch (error: unknown) {
      console.error('Error creating customer:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to create customer',
        error: errorMessage
      });
    }
  }

  /**
   * Update a customer
   */
  async updateCustomer(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updateData = plainToInstance(UpdateCustomerDto, req.body);
      const errors = await validate(updateData, { skipMissingProperties: true });
      
      if (errors.length > 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Validation failed',
          errors: errors.map(err => Object.values(err.constraints || {})).flat()
        });
      }
      
      const customer = await this.customerService.update(id, updateData);
      
      if (!customer) {
        return res.status(404).json({ 
          success: false, 
          message: 'Customer not found' 
        });
      }
      
      return res.json({ 
        success: true, 
        data: customer,
        message: 'Customer updated successfully' 
      });
    } catch (error: unknown) {
      console.error('Error updating customer:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to update customer',
        error: errorMessage
      });
    }
  }

  /**
   * Delete (deactivate) a customer
   */
  async deleteCustomer(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await this.customerService.remove(id);
      
      if (!result) {
        return res.status(404).json({ 
          success: false, 
          message: 'Customer not found' 
        });
      }
      
      return res.json({ 
        success: true, 
        message: 'Customer deactivated successfully' 
      });
    } catch (error: unknown) {
      console.error('Error deleting customer:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to deactivate customer',
        error: errorMessage
      });
    }
  }
}
