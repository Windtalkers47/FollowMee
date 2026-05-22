import { Customer } from '../entities/Customer';
import { CreateCustomerDto } from '../dtos/create-customer.dto';
import { UpdateCustomerDto } from '../dtos/update-customer.dto';
import { CustomerRepository } from '../repositories/customer.repository';
import { CustomerResponseDto } from '../dtos/customer-response.dto';
import { StatusCountsResponse } from '../types/status.types';
import { CloudinaryUtil } from '../utils/cloudinary.util';

export class CustomerService {
  constructor(private customerRepository: CustomerRepository) {}

  async findAll(includeInactive = false): Promise<CustomerResponseDto[]> {
    const customers = includeInactive
      ? await this.customerRepository.find(undefined, { order: { createdAt: 'DESC' } })
      : await this.customerRepository.findActive();

    return customers.map(c => new CustomerResponseDto({
      ...c,
      userId: c.userId ?? undefined
    }));
  }

  async findOne(id: string): Promise<CustomerResponseDto> {
    const customer = await this.customerRepository.findById(id);
    if (!customer) {
      throw new Error(`Customer with ID ${id} not found`);
    }
    return new CustomerResponseDto({
      ...customer,
      userId: customer.userId ?? undefined
    });
  }

  /**
   * Get public customer profile by ID (no authentication required)
   * Only returns non-sensitive customer information
   */
  async getPublicProfile(id: string): Promise<Partial<CustomerResponseDto> | null> {
    const customer = await this.customerRepository.findById(id, {
      select: [
        'customerId',
        'customerName',
        'customerLastName',
        'customerEmail',
        'customerPhone1',
        'customerPhone2',
        'customerFacebook',
        'customerInstagram',
        'customerTikTok',
        'customerLine',
        'customerX',
        'customerAddress',
        'createdAt',
        'updatedAt',
      ],
    });

    if (!customer) {
      return null;
    }

    // Return a subset of customer data that's safe for public viewing
    return {
      customerId: customer.customerId,
      customerName: customer.customerName,
      customerLastName: customer.customerLastName,
      customerEmail: customer.customerEmail,
      customerPhone1: customer.customerPhone1,
      customerPhone2: customer.customerPhone2,
      customerFacebook: customer.customerFacebook,
      customerInstagram: customer.customerInstagram,
      customerTikTok: customer.customerTikTok,
      customerLine: customer.customerLine,
      customerX: customer.customerX,
      customerAddress: customer.customerAddress,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
    };
  }

  async search(query: string): Promise<CustomerResponseDto[]> {
    const customers = await this.customerRepository.search(query);
    return customers.map(c => new CustomerResponseDto({
      ...c,
      userId: c.userId ?? undefined
    }));
  }

  /**
   * Find customers with pagination
   * @param page Page number (1-based)
   * @param limit Number of items per page
   * @returns [customers, totalCount]
   */
  async findWithPagination(
    page: number = 1,
    limit: number = 10,
    status?: 'active' | 'inactive' | 'canceled'
  ): Promise<[CustomerResponseDto[], number]> {
    const [customers, total] = await this.customerRepository.findWithPagination(page, limit, status);
    const customerDtos = customers.map(c => new CustomerResponseDto({
      ...c,
      userId: c.userId ?? undefined
    }));
    return [customerDtos, total];
  }

  async create(dto: CreateCustomerDto): Promise<{ customer: CustomerResponseDto; reactivated: boolean }> {
    // Check for active customer with same email
    const activeByEmail = await this.customerRepository.findByEmail(dto.customerEmail, true);
    if (activeByEmail) {
      throw new Error('A customer with this email already exists');
    }

    // Check for active customer with same name
    const activeByName = await this.customerRepository.findByName(dto.customerName, dto.customerLastName, true);
    if (activeByName) {
      throw new Error('A customer with this name already exists');
    }

    // Check for inactive customer with same email - reactivate if found
    const inactiveByEmail = await this.customerRepository.findByEmail(dto.customerEmail, false);
    if (inactiveByEmail && !inactiveByEmail.isActive) {
      const customer = await this.reactivateCustomer(inactiveByEmail.customerId, dto);
      return { customer, reactivated: true };
    }

    // Check for inactive customer with same name - reactivate if found
    const inactiveByName = await this.customerRepository.findByName(dto.customerName, dto.customerLastName, false);
    if (inactiveByName && !inactiveByName.isActive) {
      const customer = await this.reactivateCustomer(inactiveByName.customerId, dto);
      return { customer, reactivated: true };
    }

    // No existing customer, create new
    const customer = new Customer();
    Object.assign(customer, dto);
    
    // Ensure isActive is set (default to true if not provided)
    if (customer.isActive === undefined) {
      customer.isActive = true;
    }

    const created = await this.customerRepository.create(customer);
    const customerDto = new CustomerResponseDto({
      ...created,
      userId: created.userId ?? undefined
    });
    return { customer: customerDto, reactivated: false };
  }

  /**
   * Reactivate an inactive customer with new data
   */
  private async reactivateCustomer(id: string, dto: CreateCustomerDto): Promise<CustomerResponseDto> {
    const customer = await this.customerRepository.findOne({ customerId: id });
    if (!customer) {
      throw new Error(`Customer with ID ${id} not found`);
    }

    // Update customer with new data
    Object.assign(customer, dto);
    customer.isActive = true;
    customer.deletedAt = undefined;
    customer.updatedAt = new Date();

    const updated = await this.customerRepository.update(id, customer);
    if (!updated) {
      throw new Error(`Failed to reactivate customer with ID ${id}`);
    }
    return new CustomerResponseDto({
      ...updated,
      userId: updated.userId ?? undefined
    });
  }

  async update(
    id: string,
    updateData: Partial<UpdateCustomerDto>
  ): Promise<CustomerResponseDto> {
    const customer = await this.customerRepository.findOne({ customerId: id });
    if (!customer) {
      throw new Error(`Customer with ID ${id} not found`);
    }

    // Check if email is being updated and if it's already in use by an active customer
    if (
      updateData.customerEmail &&
      updateData.customerEmail !== customer.customerEmail
    ) {
      const activeByEmail = await this.customerRepository.findByEmail(
        updateData.customerEmail,
        true
      );
      if (activeByEmail) {
        throw new Error('Email is already in use');
      }
    }

    // Check if name is being updated and if it's already in use by an active customer
    if (
      updateData.customerName &&
      (updateData.customerName !== customer.customerName ||
       (updateData.customerLastName !== undefined && updateData.customerLastName !== customer.customerLastName))
    ) {
      const activeByName = await this.customerRepository.findByName(
        updateData.customerName,
        updateData.customerLastName,
        true
      );
      if (activeByName && activeByName.customerId !== id) {
        throw new Error('A customer with this name already exists');
      }
    }

    // Handle image removal if customerImageUrl is explicitly set to null or empty
    if (updateData.customerImageUrl === null || updateData.customerImageUrl === '') {
      // Delete old image from Cloudinary if it exists
      if (customer.customerImageUrl) {
        try {
          await CloudinaryUtil.deleteImage(customer.customerImageUrl);
        } catch (error) {
          console.error('Failed to delete old image from Cloudinary:', error);
        }
      }
      // Set to null in database
      updateData.customerImageUrl = null;
    }

    // Exclude read-only properties and undefined values
    const updatePayload = Object.entries(updateData).reduce((acc, [key, value]) => {
      // Skip read-only properties and undefined values
      if (value !== undefined && key !== 'fullName') {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, any>);

    // Update customer with filtered data
    const updated = await this.customerRepository.update(id, updatePayload);

    if (!updated) {
      throw new Error('Failed to update customer');
    }

    return new CustomerResponseDto({
      ...updated,
      userId: updated.userId ?? undefined
    });
  }

  async remove(id: string): Promise<{ message: string }> {
    const customer = await this.customerRepository.findOne({ customerId: id });
    if (!customer) {
      throw new Error(`Customer with ID ${id} not found`);
    }

    // Soft delete by setting deletedAt and isActive to false
    await this.customerRepository.update(id, {
      deletedAt: new Date(),
      isActive: false
    });
    return { message: 'Customer deleted successfully' };
  }

  /**
   * Get customer counts by status with total
   * @returns Object containing status counts and total
   */
  async getStatusCounts(): Promise<StatusCountsResponse> {
    return this.customerRepository.getStatusCounts();
  }
}
