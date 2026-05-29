import { Customer } from '../entities/Customer';
import { CreateCustomerDto } from '../dtos/create-customer.dto';
import { UpdateCustomerDto } from '../dtos/update-customer.dto';
import { CustomerRepository } from '../repositories/customer.repository';
import { CustomerResponseDto } from '../dtos/customer-response.dto';
import { StatusCountsResponse } from '../types/status.types';
import { CloudinaryUtil } from '../utils/cloudinary.util';

export class CustomerService {
  private customerRepository: CustomerRepository;

  constructor() {
    this.customerRepository = new CustomerRepository();
  }

  async findAll(includeInactive = false): Promise<CustomerResponseDto[]> {
    const customers = includeInactive
      ? await this.customerRepository.findMany({ order: { createdAt: 'DESC' } } as any)
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

  async create(data: CreateCustomerDto, userId?: number): Promise<CustomerResponseDto> {
    const customer = this.customerRepository.create({
      ...data,
      userId: userId ?? null,
    });
    const created = await this.customerRepository.save(customer);
    return new CustomerResponseDto({
      ...created,
      userId: created.userId ?? undefined
    });
  }

  async update(id: string, data: UpdateCustomerDto): Promise<CustomerResponseDto> {
    const customer = await this.customerRepository.findById(id);
    if (!customer) {
      throw new Error(`Customer with ID ${id} not found`);
    }

    Object.assign(customer, data);
    const updated = await this.customerRepository.save(customer);
    
    return new CustomerResponseDto({
      ...updated,
      userId: updated.userId ?? undefined
    });
  }

  async delete(id: string): Promise<void> {
    const customer = await this.customerRepository.findById(id);
    if (!customer) {
      throw new Error(`Customer with ID ${id} not found`);
    }
    // Soft delete by marking as inactive
    customer.isActive = false;
    await this.customerRepository.save(customer);
  }

  async getCustomerWithProfile(id: string): Promise<CustomerResponseDto | null> {
    const customer = await this.customerRepository.findById(id);
    if (!customer) return null;
    return new CustomerResponseDto({
      ...customer,
      userId: customer.userId ?? undefined
    });
  }

  async searchCustomers(query: string, includeInactive = false): Promise<CustomerResponseDto[]> {
    // Simple search implementation
    const customers = await this.customerRepository.find({ isActive: !includeInactive } as any);
    const filtered = customers.filter(c => 
      c.customerName?.toLowerCase().includes(query.toLowerCase()) ||
      c.customerEmail?.toLowerCase().includes(query.toLowerCase())
    );
    return filtered.map(c => new CustomerResponseDto({
      ...c,
      userId: c.userId ?? undefined
    }));
  }

  async getStatusCounts(): Promise<StatusCountsResponse> {
    return this.customerRepository.getStatusCounts();
  }

  async uploadCustomerImage(id: string, fileBuffer: Buffer): Promise<CustomerResponseDto> {
    const customer = await this.customerRepository.findById(id);
    if (!customer) {
      throw new Error(`Customer with ID ${id} not found`);
    }

    // Delete old image if exists
    if (customer.customerImageUrl) {
      await CloudinaryUtil.deleteImage(customer.customerImageUrl);
    }

    const uploadResult = await CloudinaryUtil.uploadImage(fileBuffer, 'followmee/customers');
    customer.customerImageUrl = uploadResult || undefined;
    
    const updated = await this.customerRepository.save(customer);
    return new CustomerResponseDto({
      ...updated,
      userId: updated.userId ?? undefined
    });
  }

  async removeCustomerImage(id: string): Promise<CustomerResponseDto> {
    const customer = await this.customerRepository.findById(id);
    if (!customer) {
      throw new Error(`Customer with ID ${id} not found`);
    }

    if (customer.customerImageUrl) {
      await CloudinaryUtil.deleteImage(customer.customerImageUrl);
      customer.customerImageUrl = undefined;
      const updated = await this.customerRepository.save(customer);
      return new CustomerResponseDto({
        ...updated,
        userId: updated.userId ?? undefined
      });
    }

    return new CustomerResponseDto({
      ...customer,
      userId: customer.userId ?? undefined
    });
  }
}

export default new CustomerService();