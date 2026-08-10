import { Brackets, FindOneOptions, getRepository } from 'typeorm';
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
   * @param activeOnly If true, only return active customers
   * @returns Customer if found, null otherwise
   */
  async findByEmail(email: string, activeOnly: boolean = false): Promise<Customer | null> {
    const where: any = { customerEmail: email };
    if (activeOnly) {
      where.isActive = true;
    }
    return this.repository.findOne({ 
      where 
    } as FindOneOptions<Customer>);
  }

  /**
   * Find customer by name (first name + last name combination)
   * @param firstName Customer's first name
   * @param lastName Customer's last name (optional)
   * @param activeOnly If true, only return active customers
   * @returns Customer if found, null otherwise
   */
  async findByName(firstName: string, lastName?: string, activeOnly: boolean = false): Promise<Customer | null> {
    const where: any = { customerName: firstName };
    if (lastName) {
      where.customerLastName = lastName;
    }
    if (activeOnly) {
      where.isActive = true;
    }
    return this.repository.findOne({ 
      where 
    } as FindOneOptions<Customer>);
  }

  /**
   * Find customer by ID
   * @param id Customer's ID
   * @param options Optional query options including select fields
   * @returns Customer if found, null otherwise
   */
  async findById(id: string, options: FindOneOptions<Customer> = {}): Promise<Customer | null> {
    return this.repository.findOne({
      where: { customerId: id },
      ...options,
    } as FindOneOptions<Customer>);
  }

  /**
   * Find active customers
   * @returns Array of active customers
   */
  async findActive(): Promise<Customer[]> {
    return this.repository.find({ 
      where: { isActive: true, deletedAt: null as any }
    });
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
      .orWhere('customer.userId LIKE :query', { query: `%${query}%` })
      .getMany();
  }

  /**
   * Find customers with pagination
   * @param page Page number (1-based)
   * @param limit Number of items per page
   * @returns [customers, totalCount]
   */
  async findWithPagination(
    page: number, 
    limit: number, 
    status?: 'active' | 'inactive' | 'canceled'
  ): Promise<[Customer[], number]> {
    console.log('=== findWithPagination called ===', { page, limit, status });
    
    const query = this.repository
      .createQueryBuilder('customer')
      .orderBy('customer.createdAt', 'DESC');

    // Filter by status and isActive
    // Note: We do NOT filter by deletedAt because:
    // - A soft-deleted customer (deletedAt set) can still be active/inactive/canceled
    // - deletedAt is just metadata, status and isActive determine the actual state
    // - Customers can be reactivated after being soft-deleted
    if (status === 'active') {
      console.log('Filtering by active status');
      query.andWhere('customer.status = :status', { status: 'active' })
           .andWhere('customer.isActive = :isActive', { isActive: true });
    } else if (status === 'inactive') {
      console.log('Filtering by inactive status');
      query.andWhere('customer.status = :status', { status: 'inactive' })
           .andWhere('customer.isActive = :isActive', { isActive: true });
    } else if (status === 'canceled') {
      console.log('Filtering by canceled status');
      query.andWhere('customer.status = :status', { status: 'canceled' })
           .andWhere('customer.isActive = :isActive', { isActive: true });
    } else {
      console.log('No status filter - returning ALL customers (including soft-deleted)');
    }
    // When status is undefined or 'all', return all customers without filtering

    const [customers, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    
    return [customers, total];
  }

  async findPage(options: {
    page: number;
    limit: number;
    status?: 'active' | 'inactive' | 'canceled' | 'all';
    search?: string;
    assignedTo?: number;
    createdBy?: number;
  }): Promise<[Customer[], number]> {
    const page = Math.max(1, options.page);
    const limit = Math.min(100, Math.max(1, options.limit));
    const query = this.repository.createQueryBuilder('customer');

    if (options.status && options.status !== 'all') {
      query.andWhere('customer.status = :status', { status: options.status });
    }
    if (options.assignedTo) query.andWhere('customer.assignedTo = :assignedTo', { assignedTo: options.assignedTo });
    if (options.createdBy) query.andWhere('customer.createdBy = :createdBy', { createdBy: options.createdBy });
    const search = options.search?.trim();
    if (search) {
      query.andWhere(new Brackets(scope => {
        const fields = [
          'customer.customerName', 'customer.customerLastName', 'customer.customerEmail',
          'customer.customerPhone1', 'customer.customerPhone2', 'customer.customerAddress',
          'customer.customerFacebook', 'customer.customerInstagram', 'customer.customerTikTok',
          'customer.customerLine', 'customer.customerX',
        ];
        fields.forEach((field, index) => {
          const clause = `${field} LIKE :search`;
          if (index === 0) scope.where(clause, { search: `%${search}%` });
          else scope.orWhere(clause, { search: `%${search}%` });
        });
      }));
    }

    return query
      .orderBy('customer.createdAt', 'DESC')
      .addOrderBy('customer.customerId', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
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
