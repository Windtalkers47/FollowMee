import { ProfileCustomerRepository } from '../repositories/profile-customer.repository';
import { CustomerResponseDto } from '../dtos/customer-response.dto';
import { customerAccessService } from './customer-access.service';

export class ProfileCustomerService {
  constructor(private profileCustomerRepository: ProfileCustomerRepository) {}

  /**
   * Find active customers with pagination
   * @param page Page number (1-based)
   * @param limit Number of items per page
   * @returns [customers, totalCount]
   */
  async findWithPagination(
    page: number,
    limit: number,
    viewerUserId: number,
  ): Promise<[CustomerResponseDto[], number]> {
    const [customers, total] = await this.profileCustomerRepository.findWithPagination(page, limit);
    const access = await customerAccessService.context(viewerUserId);
    const customerDtos = customers.map(c => new CustomerResponseDto({
      ...c,
      userId: c.assignedTo ?? c.userId ?? undefined,
      assignedTo: c.assignedTo ?? c.userId ?? undefined,
      createdBy: c.createdBy ?? undefined,
      assignedToUser: undefined,
      createdByUser: undefined,
      capabilities: customerAccessService.capabilities(c, access),
    }));
    return [customerDtos, total];
  }

  /**
   * Search active customers
   * @param query Search query
   * @returns Array of matching active customers
   */
  async search(query: string, viewerUserId: number): Promise<CustomerResponseDto[]> {
    const customers = await this.profileCustomerRepository.search(query);
    const access = await customerAccessService.context(viewerUserId);
    return customers.map(c => new CustomerResponseDto({
      ...c,
      userId: c.assignedTo ?? c.userId ?? undefined,
      assignedTo: c.assignedTo ?? c.userId ?? undefined,
      createdBy: c.createdBy ?? undefined,
      assignedToUser: undefined,
      createdByUser: undefined,
      capabilities: customerAccessService.capabilities(c, access),
    }));
  }
}
