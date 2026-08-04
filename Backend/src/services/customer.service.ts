import { Customer } from '../entities/Customer';
import { CreateCustomerDto } from '../dtos/create-customer.dto';
import { UpdateCustomerDto } from '../dtos/update-customer.dto';
import { CustomerRepository } from '../repositories/customer.repository';
import { CustomerResponseDto } from '../dtos/customer-response.dto';
import { StatusCountsResponse } from '../types/status.types';
import { CloudinaryUtil } from '../utils/cloudinary.util';
import dataSource from '../config/database';
import { In } from 'typeorm';
import { customerAccessService, CustomerAccessContext } from './customer-access.service';
import { User } from '../entities/User';
import { ApplicationError } from '../errors/application.error';

export class CustomerService {
  private customerRepository: CustomerRepository;

  constructor() {
    this.customerRepository = new CustomerRepository();
  }

  private present(customer: Customer, access: CustomerAccessContext, users: Map<number, User> = new Map()): CustomerResponseDto {
    const assignedTo = customer.assignedTo ?? customer.userId ?? undefined;
    const assignedUser = assignedTo ? users.get(assignedTo) : undefined;
    const creatorUser = customer.createdBy ? users.get(customer.createdBy) : undefined;
    return new CustomerResponseDto({
      ...customer,
      userId: assignedTo,
      assignedTo,
      createdBy: customer.createdBy ?? undefined,
      assignedToUser: assignedUser ? { userId: assignedUser.userId, userName: assignedUser.userName, userLastName: assignedUser.userLastName, userImageUrl: assignedUser.userImageUrl || undefined } : undefined,
      createdByUser: creatorUser ? { userId: creatorUser.userId, userName: creatorUser.userName, userLastName: creatorUser.userLastName, userImageUrl: creatorUser.userImageUrl || undefined } : undefined,
      capabilities: customerAccessService.capabilities(customer, access),
    });
  }

  private async presentMany(customers: Customer[], viewerUserId: number): Promise<CustomerResponseDto[]> {
    const access = await customerAccessService.context(viewerUserId);
    const ids = [...new Set(customers.flatMap(customer => [customer.assignedTo, customer.createdBy].filter((id): id is number => Boolean(id))))];
    const users = ids.length ? await dataSource.getRepository(User).find({ where: { userId: In(ids) } }) : [];
    const userMap = new Map(users.map(user => [user.userId, user]));
    return customers.map(customer => this.present(customer, access, userMap));
  }

  async findAll(options: {
    status?: 'active' | 'inactive' | 'canceled' | 'all';
    search?: string;
  } | undefined, viewerUserId: number): Promise<CustomerResponseDto[]> {
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
      
      return this.presentMany(filtered, viewerUserId);
    }
    
    const customers = await this.customerRepository.findMany({ 
      where: whereConditions,
      order: { createdAt: 'DESC' }
    } as any);

    return this.presentMany(customers, viewerUserId);
  }

  async findOne(id: string, viewerUserId: number): Promise<CustomerResponseDto> {
    const customer = await this.customerRepository.findById(id);
    if (!customer) {
      throw new Error(`Customer with ID ${id} not found`);
    }
    return (await this.presentMany([customer], viewerUserId))[0];
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
    if (!userId) throw new ApplicationError('Authentication required', 'AUTH_REQUIRED', 401);
    const assignedTo = data.assignedTo ?? userId;
    await customerAccessService.assertActiveAssignee(assignedTo);
    const customer = this.customerRepository.create({
      ...data,
      assignedTo,
      userId: assignedTo,
      createdBy: userId,
      updatedBy: userId,
    });
    const created = await this.customerRepository.save(customer);
    return (await this.presentMany([created], userId))[0];
  }

  async update(id: string, data: UpdateCustomerDto, actorUserId?: number): Promise<CustomerResponseDto> {
    const customer = await this.customerRepository.findById(id);
    if (!customer) {
      throw new Error(`Customer with ID ${id} not found`);
    }

    if (!actorUserId) throw new ApplicationError('Authentication required', 'AUTH_REQUIRED', 401);
    const access = await customerAccessService.context(actorUserId);
    customerAccessService.assertEdit(customer, access);
    const { assignedTo: _assignedTo, userId: _userId, createdBy: _createdBy, ...safeData } = data as UpdateCustomerDto & Record<string, unknown>;
    Object.assign(customer, safeData);
    if (actorUserId) customer.updatedBy = actorUserId;
    const updated = await this.customerRepository.save(customer);
    
    return (await this.presentMany([updated], actorUserId))[0];
  }

  async reassign(id: string, assignedTo: number, actorUserId: number): Promise<CustomerResponseDto> {
    const customer = await this.customerRepository.findById(id);
    if (!customer) throw new ApplicationError('Customer not found', 'CUSTOMER_NOT_FOUND', 404);
    const access = await customerAccessService.context(actorUserId);
    customerAccessService.assertReassign(customer, access);
    await customerAccessService.assertActiveAssignee(assignedTo);
    customer.assignedTo = assignedTo;
    customer.userId = assignedTo;
    customer.updatedBy = actorUserId;
    const updated = await this.customerRepository.save(customer);
    return (await this.presentMany([updated], actorUserId))[0];
  }

  async delete(id: string, actorUserId?: number): Promise<void> {
    const customer = await this.customerRepository.findById(id);
    if (!customer) {
      throw new Error(`Customer with ID ${id} not found`);
    }
    if (!actorUserId) throw new ApplicationError('Authentication required', 'AUTH_REQUIRED', 401);
    const access = await customerAccessService.context(actorUserId);
    customerAccessService.assertDelete(customer, access);
    customer.isActive = false;
    customer.deletedAt = new Date();
    if (actorUserId) customer.updatedBy = actorUserId;
    await this.customerRepository.save(customer);
  }

  async bulkUpdateStatus(customerIds: string[], status: 'active' | 'inactive', actorUserId: number) {
    const ids = [...new Set(customerIds)].filter(Boolean).slice(0, 500);
    if (!ids.length) throw new Error('At least one customer is required');
    const customers = await dataSource.getRepository(Customer).find({ where: { customerId: In(ids) } });
    if (customers.length !== ids.length) throw new ApplicationError('One or more customers were not found', 'CUSTOMER_NOT_FOUND', 404);
    const access = await customerAccessService.context(actorUserId);
    customers.forEach(customer => customerAccessService.assertEdit(customer, access));
    await dataSource.transaction(async manager => {
      customers.forEach(customer => { customer.status = status; customer.isActive = status === 'active'; customer.updatedBy = actorUserId; });
      await manager.getRepository(Customer).save(customers);
    });
    return { requested: ids.length, updated: customers.length };
  }

  async bulkDelete(customerIds: string[], actorUserId: number) {
    const ids = [...new Set(customerIds)].filter(Boolean).slice(0, 500);
    if (!ids.length) throw new Error('At least one customer is required');
    const customers = await dataSource.getRepository(Customer).find({ where: { customerId: In(ids) } });
    if (customers.length !== ids.length) throw new ApplicationError('One or more customers were not found', 'CUSTOMER_NOT_FOUND', 404);
    const access = await customerAccessService.context(actorUserId);
    customers.forEach(customer => customerAccessService.assertDelete(customer, access));
    await dataSource.transaction(async manager => {
      customers.forEach(customer => { customer.isActive = false; customer.deletedAt = new Date(); customer.updatedBy = actorUserId; });
      await manager.getRepository(Customer).save(customers);
    });
    return { requested: ids.length, updated: customers.length };
  }

  async getCustomerWithProfile(id: string, viewerUserId: number): Promise<CustomerResponseDto | null> {
    const customer = await this.customerRepository.findById(id);
    if (!customer) return null;
    return (await this.presentMany([customer], viewerUserId))[0];
  }

  async searchCustomers(query: string, viewerUserId: number, includeInactive = false): Promise<CustomerResponseDto[]> {
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
    return this.presentMany(filtered, viewerUserId);
  }

  async getStatusCounts(): Promise<StatusCountsResponse> {
    return this.customerRepository.getStatusCounts();
  }

  async uploadCustomerImage(id: string, fileBuffer: Buffer, actorUserId: number): Promise<CustomerResponseDto> {
    const customer = await this.customerRepository.findById(id);
    if (!customer) {
      throw new Error(`Customer with ID ${id} not found`);
    }

    customerAccessService.assertEdit(customer, await customerAccessService.context(actorUserId));
    // Delete old image if exists
    if (customer.customerImageUrl) {
      await CloudinaryUtil.deleteImage(customer.customerImageUrl);
    }

    const uploadResult = await CloudinaryUtil.uploadImage(fileBuffer, 'followmee/customers');
    customer.customerImageUrl = uploadResult || undefined;
    
    const updated = await this.customerRepository.save(customer);
    return (await this.presentMany([updated], actorUserId))[0];
  }

  async removeCustomerImage(id: string, actorUserId: number): Promise<CustomerResponseDto> {
    const customer = await this.customerRepository.findById(id);
    if (!customer) {
      throw new Error(`Customer with ID ${id} not found`);
    }

    customerAccessService.assertEdit(customer, await customerAccessService.context(actorUserId));
    if (customer.customerImageUrl) {
      await CloudinaryUtil.deleteImage(customer.customerImageUrl);
      customer.customerImageUrl = undefined;
      const updated = await this.customerRepository.save(customer);
      return (await this.presentMany([updated], actorUserId))[0];
    }

    return (await this.presentMany([customer], actorUserId))[0];
  }
}

export default new CustomerService();
