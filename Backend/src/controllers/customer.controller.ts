import { Request, Response } from 'express';
import { CustomerService } from '../services/customer.service';
import { CreateCustomerDto } from '../dtos/create-customer.dto';
import { UpdateCustomerDto } from '../dtos/update-customer.dto';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { validateImageFile } from '../services/file-upload.service';
import { uploadToCloudinary, deleteFromCloudinary, uploadBase64Image } from '../config/cloudinary.config';
import auditService from '../services/audit.service';

export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  private sendError(res: Response, error: unknown, fallback: string) {
    const typed = error as { statusCode?: number; code?: string; message?: string };
    const status = Number(typed?.statusCode) || 500;
    return res.status(status).json({
      success: false,
      message: status >= 500 ? fallback : typed.message || fallback,
      ...(typed.code ? { code: typed.code } : {}),
      ...(status >= 500 && process.env.NODE_ENV === 'development' ? { error: typed.message } : {}),
    });
  }

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
   * 
   * iOS 2026 Design Pattern - Search & Pagination:
   * - Default limit = 100 (show all data up to 100 items)
   * - Return all results on page=1 (no pagination by default)
   * - Pagination only applied when explicitly requested (page > 1)
   * 
   * Status Filter:
   * - No status or 'all': show all customers
   * - 'active': show only active customers (isActive = true)
   * - 'inactive': show only inactive customers (isActive = false)
   * - 'canceled': show canceled customers (isActive = false)
   */
  async getCustomers(req: Request, res: Response) {
    const startedAt = Date.now();
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 25));
      const status = req.query.status as 'active' | 'inactive' | 'canceled' | undefined;
      const search = req.query.search as string | undefined;
      const assignedTo = Number(req.query.assignedTo) || undefined;
      const createdBy = Number(req.query.createdBy) || undefined;
      const missingImage = req.query.missingImage === 'true';
      
      const result = await this.customerService.findPage({ page, limit, status, search, assignedTo, createdBy, missingImage }, req.user!.userId);
      console.info(JSON.stringify({
        event: 'customer.list.completed',
        requestId: res.locals.requestId,
        status: 200,
        durationMs: Date.now() - startedAt,
        page: result.page,
        limit: result.limit,
        resultCount: result.items.length,
        total: result.total,
        filter: {
          status: status || 'all',
          missingImage,
          hasSearch: Boolean(search?.trim()),
          hasAssignee: Boolean(assignedTo),
          hasCreator: Boolean(createdBy),
        },
      }));
      
      return res.json({ 
        success: true, 
        data: result.items,
        meta: { 
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        }
      });
    } catch (error: unknown) {
      const requestId = res.locals.requestId;
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      console.error(JSON.stringify({
        event: 'customer.list.failed',
        requestId,
        status: 500,
        durationMs: Date.now() - startedAt,
        error: errorMessage,
      }));
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch customers',
        error: errorMessage,
        requestId,
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
      
      const results = await this.customerService.searchCustomers(search as string, req.user!.userId);
      
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
      const customer = await this.customerService.findOne(id, req.user!.userId);
      
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
      const customer = await this.customerService.create(createCustomerDto, req.user?.userId);
      
      // If there's a base64 image, upload it and update the customer
      if (base64Image) {
        try {
          const imageUrl = await uploadBase64Image(base64Image);
          await this.customerService.update(customer.customerId, { 
            customerImageUrl: imageUrl 
          }, req.user?.userId);
        } catch (error) {
          console.error('Error uploading customer image:', error);
          // Don't fail the entire request if image upload fails
          // The customer is already created, we can continue without the image
        }
      }
      
      const message = 'Customer created successfully' + (base64Image ? ' with image' : '');
      await auditService.logEvent({ userId: req.user?.userId || null, action: 'CUSTOMER_CREATED', status: 'SUCCESS', details: { customerId: customer.customerId } });
      
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
      let imageUrlToDelete: string | undefined;
      
      
      const updateData = plainToInstance(UpdateCustomerDto, otherData);
      
      const errors = await validate(updateData, { skipMissingProperties: true });
      
      if (errors.length > 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Validation failed',
          errors: errors.map(err => Object.values(err.constraints || {})).flat()
        });
      }

      const existingCustomer = await this.customerService.findOne(id, req.user!.userId);
      if (!existingCustomer.capabilities.canEdit) {
        return res.status(403).json({ success: false, code: 'CUSTOMER_EDIT_FORBIDDEN', message: 'Only the creator, assignee, or Owner can edit this customer' });
      }
      
      // Handle image removal if requested
      if (updateData.removeImage) {
        // Find the customer to get the current image URL
        const customer = await this.customerService.findOne(id, req.user!.userId);
        imageUrlToDelete = customer?.customerImageUrl || undefined;
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
      
      const customer = await this.customerService.update(id, updateData, req.user?.userId);
      if (imageUrlToDelete) {
        try {
          await deleteFromCloudinary(imageUrlToDelete);
        } catch (error) {
          console.error('Error deleting image after customer update:', error);
        }
      }
      
      if (!customer) {
        return res.status(404).json({ 
          success: false, 
          message: 'Customer not found' 
        });
      }
      
      await auditService.logEvent({ userId: req.user?.userId || null, action: 'CUSTOMER_UPDATED', status: 'SUCCESS', details: { customerId: id } });
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
      
      return this.sendError(res, error, 'Failed to update customer');
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
      const customer = await this.customerService.findOne(customerId, req.user!.userId);
      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found',
        });
      }
      if (!customer.capabilities.canEdit) {
        return res.status(403).json({ success: false, code: 'CUSTOMER_EDIT_FORBIDDEN', message: 'Only the creator, assignee, or Owner can edit this customer' });
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
      } as UpdateCustomerDto, req.user?.userId);

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
      return this.sendError(res, error, 'Failed to upload profile image');
    }
  }

  /**
   * Delete customer profile image
   */
  async deleteCustomerImage(req: Request, res: Response) {
    try {
      const { customerId } = req.params;

      // Find the customer
      const customer = await this.customerService.findOne(customerId, req.user!.userId);
      if (!customer || !customer.customerImageUrl) {
        return res.status(404).json({
          success: false,
          message: 'Customer or profile image not found',
        });
      }
      if (!customer.capabilities.canEdit) {
        return res.status(403).json({ success: false, code: 'CUSTOMER_EDIT_FORBIDDEN', message: 'Only the creator, assignee, or Owner can edit this customer' });
      }

      const imageUrlToDelete = customer.customerImageUrl;

      // Commit the database state before the external Cloudinary side effect.
      const updatedCustomer = await this.customerService.update(customerId, {
        customerImageUrl: null,
      } as UpdateCustomerDto, req.user?.userId);

      try {
        await deleteFromCloudinary(imageUrlToDelete);
      } catch (error) {
        console.error('Error deleting image from Cloudinary:', error);
      }

      return res.json({
        success: true,
        data: updatedCustomer,
        message: 'Profile image deleted successfully',
      });
    } catch (error: unknown) {
      console.error('Error deleting customer image:', error);
      return this.sendError(res, error, 'Failed to delete profile image');
    }
  }

  /**
   * Delete (deactivate) a customer
   */
  async deleteCustomer(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      // Find the customer first to get the image URL
      const customer = await this.customerService.findOne(id, req.user!.userId);
      if (!customer) {
        return res.status(404).json({ 
          success: false, 
          message: 'Customer not found' 
        });
      }
      if (!customer.capabilities.canDelete) {
        return res.status(403).json({ success: false, code: 'CUSTOMER_DELETE_FORBIDDEN', message: 'Only the creator or Owner can delete this customer' });
      }

      // Commit the soft delete before the external Cloudinary side effect.
      await this.customerService.delete(id, req.user?.userId);
      if (customer.customerImageUrl) {
        try {
          await deleteFromCloudinary(customer.customerImageUrl);
        } catch (error) {
          console.error('Error deleting image from Cloudinary:', error);
          // Continue even if deletion fails to ensure the customer is deleted
        }
      }

      await auditService.logEvent({ userId: req.user?.userId || null, action: 'CUSTOMER_DELETED', status: 'SUCCESS', details: { customerId: id } });
      
      return res.json({ 
        success: true, 
        message: 'Customer deactivated successfully' 
      });
    } catch (error: unknown) {
      console.error('Error deleting customer:', error);
      return this.sendError(res, error, 'Failed to deactivate customer');
    }
  }

  async reassignCustomer(req: Request, res: Response) {
    try {
      const assignedTo = Number(req.body?.assignedTo);
      if (!Number.isInteger(assignedTo) || assignedTo <= 0) {
        return res.status(400).json({ success: false, message: 'A valid assignee is required' });
      }
      const customer = await this.customerService.reassign(req.params.id, assignedTo, req.user!.userId);
      await auditService.logEvent({
        userId: req.user!.userId,
        action: 'CUSTOMER_REASSIGNED',
        status: 'SUCCESS',
        details: { customerId: req.params.id, assignedTo },
      });
      return res.json({ success: true, data: customer });
    } catch (error) {
      return this.sendError(res, error, 'Failed to reassign customer');
    }
  }

  async duplicateCheck(req: Request, res: Response) {
    try {
      const data = await this.customerService.duplicateCheck(req.body || {}, req.body?.excludeCustomerId);
      return res.json({ success: true, data });
    } catch (error) {
      return this.sendError(res, error, 'Failed to check possible duplicates');
    }
  }

  async getTimeline(req: Request, res: Response) {
    try {
      const data = await this.customerService.getTimeline(req.params.id, req.user!.userId);
      return res.json({ success: true, data });
    } catch (error) {
      return this.sendError(res, error, 'Failed to fetch customer timeline');
    }
  }

  async bulkUpdateStatus(req: Request, res: Response) {
    try {
      const customerIds = Array.isArray(req.body?.customerIds) ? req.body.customerIds : [];
      const status = req.body?.status;
      if (!['active', 'inactive'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Status must be active or inactive' });
      }
      const data = await this.customerService.bulkUpdateStatus(customerIds, status, req.user!.userId);
      await auditService.logEvent({ userId: req.user?.userId || null, action: 'CUSTOMER_BULK_STATUS_UPDATED', status: 'SUCCESS', details: { customerIds, status } });
      return res.json({ success: true, data });
    } catch (error) {
      return this.sendError(res, error, 'Bulk update failed');
    }
  }

  async bulkDelete(req: Request, res: Response) {
    try {
      const customerIds = Array.isArray(req.body?.customerIds) ? req.body.customerIds : [];
      const data = await this.customerService.bulkDelete(customerIds, req.user!.userId);
      await auditService.logEvent({ userId: req.user?.userId || null, action: 'CUSTOMER_BULK_DELETED', status: 'SUCCESS', details: { customerIds } });
      return res.json({ success: true, data });
    } catch (error) {
      return this.sendError(res, error, 'Bulk delete failed');
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
