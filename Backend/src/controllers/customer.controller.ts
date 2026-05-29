import { Request, Response } from 'express';
import { CustomerService } from '../services/customer.service';
import { CreateCustomerDto } from '../dtos/create-customer.dto';
import { UpdateCustomerDto } from '../dtos/update-customer.dto';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { validateImageFile } from '../services/file-upload.service';
import { uploadToCloudinary, deleteFromCloudinary, uploadBase64Image } from '../config/cloudinary.config';

export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  /**
   * Get public customer profile by ID (no authentication required)
   */
  async getPublicCustomerProfile(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'Customer ID is required',
        });
      }

      const customer = await this.customerService.getPublicProfile(id);
      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found',
        });
      }

      return res.json({
        success: true,
        data: customer,
      });
    } catch (error) {
      console.error('Error getting public customer profile:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch customer profile',
        error: errorMessage,
      });
    }
  }

  /**
   * Get all customers (paginated)
   */
  async getCustomers(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const includeInactive = req.query.status === 'inactive';
      
      // Get customers
      const customers = await this.customerService.findAll(includeInactive);
      
      // Apply pagination on client side since service doesn't support it yet
      const total = customers.length;
      const start = (page - 1) * limit;
      const paginatedCustomers = customers.slice(start, start + limit);
      
      return res.json({ 
        success: true, 
        data: paginatedCustomers,
        meta: { 
          total: total, 
          page: page, 
          limit: limit,
          totalPages: Math.ceil(total / limit)
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
      
      const results = await this.customerService.searchCustomers(search as string);
      
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
      // Extract base64Image from the request body and remove it to prevent validation issues
      const { base64Image, ...customerData } = req.body;
      
      const createCustomerDto = plainToInstance(CreateCustomerDto, customerData);
      const errors = await validate(createCustomerDto);
      
      if (errors.length > 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Validation failed',
          errors: errors.map(err => Object.values(err.constraints || {})).flat()
        });
      }
      
      // Create the customer
      const customer = await this.customerService.create(createCustomerDto);
      
      // If there's a base64 image, upload it and update the customer
      if (base64Image) {
        try {
          const imageUrl = await uploadBase64Image(base64Image);
          await this.customerService.update(customer.customerId, { 
            customerImageUrl: imageUrl 
          });
        } catch (error) {
          console.error('Error uploading customer image:', error);
          // Don't fail the entire request if image upload fails
          // The customer is already created, we can continue without the image
        }
      }
      
      const message = 'Customer created successfully' + (base64Image ? ' with image' : '');
      
      return res.status(201).json({ 
        success: true, 
        data: customer,
        message
      });
    } catch (error: unknown) {
      console.error('Error creating customer:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      
      // Handle duplicate email or name error specifically
      if (errorMessage.includes('email already exists') || errorMessage.includes('duplicate') || errorMessage.includes('name already exists')) {
        return res.status(400).json({ 
          success: false, 
          message: 'Failed to create customer',
          error: errorMessage
        });
      }
      
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
      const { base64Image, ...otherData } = req.body;
      
      
      const updateData = plainToInstance(UpdateCustomerDto, otherData);
      
      const errors = await validate(updateData, { skipMissingProperties: true });
      
      if (errors.length > 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Validation failed',
          errors: errors.map(err => Object.values(err.constraints || {})).flat()
        });
      }
      
      // Handle image removal if requested
      if (updateData.removeImage) {
        // Find the customer to get the current image URL
        const customer = await this.customerService.findOne(id);
        if (customer && customer.customerImageUrl) {
          try {
            await deleteFromCloudinary(customer.customerImageUrl);
          } catch (error) {
            console.error('Error deleting image from Cloudinary:', error);
            // Continue even if deletion fails
          }
        }
        // Set customerImageUrl to null to remove it (service handles null values)
        updateData.customerImageUrl = null;
      }
      
      // Handle new image upload if provided
      if (base64Image && !updateData.removeImage) {
        try {
          const imageUrl = await uploadBase64Image(base64Image);
          updateData.customerImageUrl = imageUrl;
        } catch (error) {
          console.error('Error uploading customer image:', error);
          // Don't fail the entire request if image upload fails
          // The customer data will still be updated without the image
        }
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
        message: updateData.removeImage ? 'Customer updated and image removed successfully' : 
                  base64Image ? 'Customer updated with new image successfully' : 'Customer updated successfully'
      });
    } catch (error: unknown) {
      console.error('Error updating customer:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      
      // Handle duplicate email or name error specifically
      if (errorMessage.includes('email already exists') || errorMessage.includes('duplicate') || errorMessage.includes('name already exists') || errorMessage.includes('Email is already in use')) {
        return res.status(400).json({ 
          success: false, 
          message: 'Failed to update customer',
          error: errorMessage
        });
      }
      
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to update customer',
        error: errorMessage
      });
    }
  }

  /**
   * Upload customer profile image
   */
  async uploadCustomerImage(req: Request, res: Response) {
    try {
      const { customerId } = req.params;
      const file = req.file as Express.Multer.File | undefined;

      if (!file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded',
        });
      }

      // Validate the uploaded file
      const validation = validateImageFile(file);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: validation.error,
        });
      }

      // Find the customer
      const customer = await this.customerService.findOne(customerId);
      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found',
        });
      }

      // Upload to Cloudinary
      const imageUrl = await uploadToCloudinary(file, `customers/${customerId}`);

      // Delete old image if exists
      if (customer.customerImageUrl) {
        try {
          await deleteFromCloudinary(customer.customerImageUrl);
        } catch (error) {
          console.error('Error deleting old image from Cloudinary:', error);
          // Continue even if deletion fails
        }
      }

      // Update customer with new image URL
      const updatedCustomer = await this.customerService.update(customerId, {
        customerImageUrl: imageUrl,
      } as UpdateCustomerDto);

      return res.json({
        success: true,
        data: {
          imageUrl,
          customer: updatedCustomer,
        },
        message: 'Profile image uploaded successfully',
      });
    } catch (error: unknown) {
      console.error('Error uploading customer image to Cloudinary:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      return res.status(500).json({
        success: false,
        message: 'Failed to upload profile image',
        error: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      });
    }
  }

  /**
   * Delete customer profile image
   */
  async deleteCustomerImage(req: Request, res: Response) {
    try {
      const { customerId } = req.params;

      // Find the customer
      const customer = await this.customerService.findOne(customerId);
      if (!customer || !customer.customerImageUrl) {
        return res.status(404).json({
          success: false,
          message: 'Customer or profile image not found',
        });
      }

      // Delete the image from Cloudinary
      try {
        await deleteFromCloudinary(customer.customerImageUrl);
      } catch (error) {
        console.error('Error deleting image from Cloudinary:', error);
        // Continue even if deletion fails to ensure the database is updated
      }

      // Update customer to remove the image URL
      const updatedCustomer = await this.customerService.update(customerId, {
        customerImageUrl: undefined,
      } as UpdateCustomerDto);

      return res.json({
        success: true,
        data: updatedCustomer,
        message: 'Profile image deleted successfully',
      });
    } catch (error: unknown) {
      console.error('Error deleting customer image:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      return res.status(500).json({
        success: false,
        message: 'Failed to delete profile image',
        error: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      });
    }
  }

  /**
   * Delete (deactivate) a customer
   */
  async deleteCustomer(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      // Find the customer first to get the image URL
      const customer = await this.customerService.findOne(id);
      if (!customer) {
        return res.status(404).json({ 
          success: false, 
          message: 'Customer not found' 
        });
      }

      // Delete the image from Cloudinary if it exists
      if (customer.customerImageUrl) {
        try {
          await deleteFromCloudinary(customer.customerImageUrl);
        } catch (error) {
          console.error('Error deleting image from Cloudinary:', error);
          // Continue even if deletion fails to ensure the customer is deleted
        }
      }

      // Delete the customer
      await this.customerService.delete(id);
      
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

  /**
   * Get customer status statistics
   * @returns {
   *   success: boolean,
   *   data: {
   *     statuses: Array<{ status: string; count: number }>,
   *     totalStatus: number
   *   }
   */
  async getCustomerStatusStats(_req: Request, res: Response) {
    try {
      const { statuses, total } = await this.customerService.getStatusCounts();
      return res.json({
        success: true,
        data: { statuses, totalStatus: total }
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      console.error('Error getting customer status stats:', errorMessage);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch customer status statistics',
        error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      });
    }
  }
}