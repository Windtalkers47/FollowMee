import { Customer } from '../entities/Customer';
import { CreateCustomerDto } from '../dtos/create-customer.dto';
import { UpdateCustomerDto } from '../dtos/update-customer.dto';
import { CustomerRepository } from '../repositories/customer.repository';
import { CustomerResponseDto } from '../dtos/customer-response.dto';
import { StatusCountsResponse } from '../types/status.types';
import { CloudinaryUtil } from '../utils/cloudinary.util';
import dataSource from '../config/database';
import { In } from 'typeorm';

export class CustomerService {
  private customerRepository: CustomerRepository;

  constructor() {
    this.customerRepository = new CustomerRepository();
  }

  async findAll(options?: { 
    status?: 'active' | 'inactive' | 'canceled' | 'all';
    search?: string;
  }): Promise<CustomerResponseDto[]> {
    const { status, search } = options || {};
    
    // Build filter conditions
    const whereConditions: any = {};
    
    // Filter by status if provided
    // Note: 'all' or undefined means show all customers (no status filter)
    if (status && status !== 'all') {
      // Use the status field directly instead of isActive
      whereConditions.status = status;
    }
    // If status is 'all' or undefined, don't set status filter (show all)
    
    // Filter by search query if provided
    if (search) {
      const searchLower = search.toLowerCase();
      const customers = await this.customerRepository.findMany({ 
        where: whereConditions,
        order: { createdAt: 'DESC' }
      } as any);
      
      const filtered = customers.filter(c => 
        c.customerName?.toLowerCase().includes(searchLower) ||
        c.customerLastName?.toLowerCase().includes(searchLower) ||
        c.customerEmail?.toLowerCase().includes(searchLower) ||
        c.customerPhone1?.toLowerCase().includes(searchLower) ||
        c.customerAddress?.toLowerCase().includes(searchLower) ||
        c.customerFacebook?.toLowerCase().includes(searchLower) ||
        c.customerInstagram?.toLowerCase().includes(searchLower) ||
        c.customerTikTok?.toLowerCase().includes(searchLower) ||
        c.customerLine?.toLowerCase().includes(searchLower) ||
        c.customerX?.toLowerCase().includes(searchLower)
      );
      
      return filtered.map(c => new CustomerResponseDto({
        ...c,
        userId: c.userId ?? undefined
      }));
    }
    
    const customers = await this.customerRepository.findMany({ 
      where: whereConditions,
      order: { createdAt: 'DESC' }
    } as any);

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
        'customerImageUrl',
        'customerFacebook',
        'customerInstagram',
        'customerTikTok',
        'customerLine',
        'customerX',
        'status',
        'isActive',
      ],
    });

    if (!customer) {
      return null;
    }

    return {
      customerId: customer.customerId,
      customerName: customer.customerName,
      customerLastName: customer.customerLastName,
      customerImageUrl: customer.customerImageUrl,
      customerFacebook: customer.customerFacebook,
      customerInstagram: customer.customerInstagram,
      customerTikTok: customer.customerTikTok,
      customerLine: customer.customerLine,
      customerX: customer.customerX,
      status: customer.status,
      isActive: customer.isActive,
    };
  }

  async create(data: CreateCustomerDto, userId?: number): Promise<CustomerResponseDto> {
    const customer = this.customerRepository.create({
      ...data,
      userId: userId ?? null,
      createdBy: userId ?? null,
      updatedBy: userId ?? null,
    });
    const created = await this.customerRepository.save(customer);
    return new CustomerResponseDto({
      ...created,
      userId: created.userId ?? undefined
    });
  }

  async update(id: string, data: UpdateCustomerDto, actorUserId?: number): Promise<CustomerResponseDto> {
    const customer = await this.customerRepository.findById(id);
    if (!customer) {
      throw new Error(`Customer with ID ${id} not found`);
    }

    Object.assign(customer, data);
    if (actorUserId) customer.updatedBy = actorUserId;
    const updated = await this.customerRepository.save(customer);
    
    return new CustomerResponseDto({
      ...updated,
      userId: updated.userId ?? undefined
    });
  }

  async delete(id: string, actorUserId?: number): Promise<void> {
    const customer = await this.customerRepository.findById(id);
    if (!customer) {
      throw new Error(`Customer with ID ${id} not found`);
    }
    // Soft delete by marking as inactive
    customer.isActive = false;
    if (actorUserId) customer.updatedBy = actorUserId;
    await this.customerRepository.save(customer);
  }

  async bulkUpdateStatus(customerIds: string[], status: 'active' | 'inactive') {
    const ids = [...new Set(customerIds)].filter(Boolean).slice(0, 500);
    if (!ids.length) throw new Error('At least one customer is required');
    const result = await dataSource.getRepository(Customer).update(
      { customerId: In(ids) },
      { status, isActive: status === 'active' }
    );
    return { requested: ids.length, updated: result.affected || 0 };
  }

  async bulkDelete(customerIds: string[]) {
    const ids = [...new Set(customerIds)].filter(Boolean).slice(0, 500);
    if (!ids.length) throw new Error('At least one customer is required');
    const result = await dataSource.getRepository(Customer).update(
      { customerId: In(ids) },
      { isActive: false }
    );
    return { requested: ids.length, updated: result.affected || 0 };
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
    // Simple search implementation - Search across 10 key fields
    const customers = await this.customerRepository.find({ isActive: !includeInactive } as any);
    const searchLower = query.toLowerCase();
    const filtered = customers.filter(c => 
      c.customerName?.toLowerCase().includes(searchLower) ||
      c.customerLastName?.toLowerCase().includes(searchLower) ||
      c.customerEmail?.toLowerCase().includes(searchLower) ||
      c.customerPhone1?.toLowerCase().includes(searchLower) ||
      c.customerAddress?.toLowerCase().includes(searchLower) ||
      c.customerFacebook?.toLowerCase().includes(searchLower) ||
      c.customerInstagram?.toLowerCase().includes(searchLower) ||
      c.customerTikTok?.toLowerCase().includes(searchLower) ||
      c.customerLine?.toLowerCase().includes(searchLower) ||
      c.customerX?.toLowerCase().includes(searchLower)
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
