import { Request, Response } from 'express';
import { ProfileCustomerService } from '../services/profile-customer.service';

export class ProfileCustomerController {
  constructor(private readonly profileCustomerService: ProfileCustomerService) {}

  /**
   * Get active customers for profile page (paginated)
   */
  async getProfileCustomers(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      // Get active customers with pagination
      const [customers, total] = await this.profileCustomerService.findWithPagination(
        page,
        limit
      );

      return res.json({
        success: true,
        data: customers,
        meta: {
          total: total,
          page: page,
          limit: limit,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error: unknown) {
      console.error('Error getting profile customers:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch profile customers',
        error: errorMessage
      });
    }
  }

  /**
   * Search active customers for profile page
   */
  async searchProfileCustomers(req: Request, res: Response) {
    try {
      const { search } = req.query;
      if (!search) {
        return res.status(400).json({
          success: false,
          message: 'Search query is required'
        });
      }

      const results = await this.profileCustomerService.search(search as string);

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
      console.error('Error searching profile customers:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      return res.status(500).json({
        success: false,
        message: 'Failed to search profile customers',
        error: errorMessage
      });
    }
  }
}
