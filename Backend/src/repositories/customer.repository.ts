import { FindOneOptions, getRepository } from 'typeorm';
import { Customer } from '../entities/Customer';
import { BaseRepository } from './base.repository';
import { StatusCountsResponse } from '../types/status.types';
import dataSource from '../config/database';

export class CustomerRepository extends BaseRepository<Customer> {
  get metadata() {
    return dataSource.getMetadata(Customer);
  }
  constructor() {
    super(Customer);
  }

  /**
   * Find customer by email
   * @param email Customer's email
   * @returns Customer if found, null otherwise
   */
  async findByEmail(email: string): Promise<Customer | null> {
    return this.repository.findOne({ 
      where: { customerEmail: email } 
    } as FindOneOptions<Customer>);
  }

  /**
   * Find active customers
   * @returns Array of active customers
   */
  async findActive(): Promise<Customer[]> {
    return this.find({ isActive: true });
  }

  /**
   * Search customers across multiple fields
   * @param query Search query
   * @returns Array of matching customers
   */
  async search(query: string): Promise<Customer[]> {
    return this.repository
      .createQueryBuilder('customer')
      .where('customer.customerName LIKE :query', { query: `%${query}%` })
      .orWhere('customer.customerLastName LIKE :query', { query: `%${query}%` })
      .orWhere('customer.customerEmail LIKE :query', { query: `%${query}%` })
      .orWhere('customer.customerPhone1 LIKE :query', { query: `%${query}%` })
      .orWhere('customer.customerPhone2 LIKE :query', { query: `%${query}%` })
      .orWhere('customer.customerFacebook LIKE :query', { query: `%${query}%` })
      .orWhere('customer.customerInstagram LIKE :query', { query: `%${query}%` })
      .orWhere('customer.customerTikTok LIKE :query', { query: `%${query}%` })
      .orWhere('customer.customerLine LIKE :query', { query: `%${query}%` })
      .orWhere('customer.customerX LIKE :query', { query: `%${query}%` })
      .getMany();
  }

  /**
   * Find customers with pagination
   * @param page Page number (1-based)
   * @param limit Number of items per page
   * @returns [customers, totalCount]
   */
  async findWithPagination(page: number, limit: number): Promise<[Customer[], number]> {
    const [customers, total] = await this.repository
      .createQueryBuilder('customer')
      .orderBy('customer.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    
    return [customers, total];
  }

  /**
   * Mark customer as inactive (soft delete)
   * @param id Customer ID
   * @returns true if successful, false otherwise
   */
  async deactivate(id: string): Promise<boolean> {
    const result = await this.update(id, { isActive: false } as any);
    return !!result;
  }

  /**
   * Get count of customers by status
   */
  /**
   * Get count of customers by status with total
   * Optimized to use a single query for better performance
   */
  async getStatusCounts(): Promise<StatusCountsResponse> {
    try {
      if (!dataSource.isInitialized) {
        await dataSource.initialize();
      }
      
      // Get all status values from the enum
      const statusColumn = this.metadata.findColumnWithPropertyName('status');
      if (!statusColumn?.enum?.length) {
        return { statuses: [], total: 0 };
      }
      
      const statusValues = statusColumn.enum.map(String);
      
      // Get counts for all statuses in a single query
      const statusCounts = await this.repository
        .createQueryBuilder('customer')
        .select('customer.status', 'status')
        .addSelect('COUNT(customer.customerId)', 'count')
        .where('customer.status IN (:...statuses)', { statuses: statusValues })
        .groupBy('customer.status')
        .getRawMany();

      // Map status counts with zero for missing statuses
      const statuses = statusValues.map(status => {
        const found = statusCounts.find(sc => sc.status === status);
        return {
          status,
          count: found ? parseInt(found.count, 10) : 0
        };
      });

      // Calculate total in a single reduce operation
      const total = statuses.reduce((sum, { count }) => sum + count, 0);

      return { statuses, total };
    } catch (error) {
      console.error('Database error in getStatusCounts:', error);
      throw new Error('Failed to fetch status counts');
    }
  }
}
