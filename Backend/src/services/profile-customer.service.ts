import { ProfileCustomerRepository } from '../repositories/profile-customer.repository';
import { CustomerResponseDto } from '../dtos/customer-response.dto';

export class ProfileCustomerService {
  constructor(private profileCustomerRepository: ProfileCustomerRepository) {}

  /**
   * Find active customers with pagination
   * @param page Page number (1-based)
   * @param limit Number of items per page
   * @returns [customers, totalCount]
   */
  async findWithPagination(
    page: number = 1,
    limit: number = 10
  ): Promise<[CustomerResponseDto[], number]> {
    const [customers, total] = await this.profileCustomerRepository.findWithPagination(page, limit);
    const customerDtos = customers.map(c => new CustomerResponseDto({
      ...c,
      userId: c.userId ?? undefined
    }));
    return [customerDtos, total];
  }

  /**
   * Search active customers
   * @param query Search query
   * @returns Array of matching active customers
   */
  async search(query: string): Promise<CustomerResponseDto[]> {
    const customers = await this.profileCustomerRepository.search(query);
    return customers.map(c => new CustomerResponseDto({
      ...c,
      userId: c.userId ?? undefined
    }));
  }
}
