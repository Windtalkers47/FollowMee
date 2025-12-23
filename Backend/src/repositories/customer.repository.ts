import { FindOneOptions } from 'typeorm';
import { Customer } from '../entities/Customer';
import { BaseRepository } from './base.repository';

export class CustomerRepository extends BaseRepository<Customer> {
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
   * Search customers by name or email
   * @param query Search query
   * @returns Array of matching customers
   */
  async search(query: string): Promise<Customer[]> {
    return this.repository
      .createQueryBuilder('customer')
      .where('customer.customerName LIKE :query', { query: `%${query}%` })
      .orWhere('customer.customerEmail LIKE :query', { query: `%${query}%` })
      .getMany();
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
}
