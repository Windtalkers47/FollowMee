import { CustomerRepository } from './customer.repository';
import { Customer } from '../entities/Customer';
import { CustomerResponseDto } from '../dtos/customer-response.dto';

export class ProfileCustomerRepository extends CustomerRepository {
  /**
   * Find active customers with pagination (always filtered to active)
   * @param page Page number (1-based)
   * @param limit Number of items per page
   * @returns [customers, totalCount]
   */
  async findWithPagination(
    page: number,
    limit: number
  ): Promise<[Customer[], number]> {
    const query = this.repository
      .createQueryBuilder('customer')
      .orderBy('customer.createdAt', 'DESC')
      .andWhere('customer.status = :status', { status: 'active' });

    const [customers, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return [customers, total];
  }

  /**
   * Search active customers across multiple fields
   * @param query Search query
   * @returns Array of matching active customers
   */
  async search(query: string): Promise<Customer[]> {
    return this.repository
      .createQueryBuilder('customer')
      .where('customer.status = :status', { status: 'active' })
      .andWhere(
        '(customer.customerName LIKE :query OR ' +
        'customer.customerLastName LIKE :query OR ' +
        'customer.customerEmail LIKE :query OR ' +
        'customer.customerPhone1 LIKE :query OR ' +
        'customer.customerPhone2 LIKE :query OR ' +
        'customer.customerFacebook LIKE :query OR ' +
        'customer.customerInstagram LIKE :query OR ' +
        'customer.customerTikTok LIKE :query OR ' +
        'customer.customerLine LIKE :query OR ' +
        'customer.customerX LIKE :query)'
      )
      .setParameters({ query: `%${query}%` })
      .orderBy('customer.createdAt', 'DESC')
      .getMany();
  }
}
