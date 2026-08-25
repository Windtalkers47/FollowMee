import { Customer } from '../entities/Customer';
import { CreateCustomerDto } from '../dtos/create-customer.dto';
import { UpdateCustomerDto } from '../dtos/update-customer.dto';
import { CustomerRepository } from '../repositories/customer.repository';
import { CustomerResponseDto } from '../dtos/customer-response.dto';
import { StatusCountsResponse } from '../types/status.types';
import { CloudinaryUtil } from '../utils/cloudinary.util';
import dataSource from '../config/database';
import { In, IsNull } from 'typeorm';
import { customerAccessService, CustomerAccessContext } from './customer-access.service';
import { User } from '../entities/User';
import { ApplicationError } from '../errors/application.error';
import { PublicProfile } from '../entities/PublicProfile';
import { CustomerMergeSnapshot } from '../entities/CustomerMergeSnapshot';
import auditService from './audit.service';

export class CustomerService {
  private customerRepository: CustomerRepository;
  private statusCache: { value: StatusCountsResponse; expiresAt: number } | null = null;

  constructor() {
    this.customerRepository = new CustomerRepository();
  }

  private invalidateStatusCache() { this.statusCache = null; }

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

  async findPage(options: {
    page: number;
    limit: number;
    status?: 'active' | 'inactive' | 'canceled' | 'all';
    search?: string;
    assignedTo?: number;
    createdBy?: number;
    missingImage?: boolean;
  }, viewerUserId: number) {
    const [customers, total] = await this.customerRepository.findPage(options);
    return {
      items: await this.presentMany(customers, viewerUserId),
      total,
      page: options.page,
      limit: options.limit,
      totalPages: Math.ceil(total / options.limit),
    };
  }

  async findAll(options: {
    status?: 'active' | 'inactive' | 'canceled' | 'all';
    search?: string;
    assignedTo?: number;
    createdBy?: number;
  } | undefined, viewerUserId: number): Promise<CustomerResponseDto[]> {
    const { status, search, assignedTo, createdBy } = options || {};
    
    // Build filter conditions
    const whereConditions: any = {};
    
    // Filter by status if provided
    // Note: 'all' or undefined means show all customers (no status filter)
    if (status && status !== 'all') {
      // Use the status field directly instead of isActive
      whereConditions.status = status;
    }
    if (assignedTo) whereConditions.assignedTo = assignedTo;
    if (createdBy) whereConditions.createdBy = createdBy;
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
    const duplicate = await this.duplicateCheck(data);
    if (duplicate.emailConflict) {
      throw new ApplicationError('Customer email already exists', 'CUSTOMER_EMAIL_DUPLICATE', 409);
    }
    const customer = this.customerRepository.create({
      ...data,
      assignedTo,
      userId: assignedTo,
      createdBy: userId,
      updatedBy: userId,
    });
    const created = await this.customerRepository.save(customer);
    this.invalidateStatusCache();
    await this.recordActivity(created.customerId, userId, 'created', { assignedTo });
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
    const duplicate = await this.duplicateCheck(data, id);
    if (duplicate.emailConflict) {
      throw new ApplicationError('Customer email already exists', 'CUSTOMER_EMAIL_DUPLICATE', 409);
    }
    const changedFields = Object.keys(data).filter(key => !['assignedTo', 'userId', 'createdBy'].includes(key));
    const { assignedTo: _assignedTo, userId: _userId, createdBy: _createdBy, ...safeData } = data as UpdateCustomerDto & Record<string, unknown>;
    Object.assign(customer, safeData);
    if (actorUserId) customer.updatedBy = actorUserId;
    const updated = await this.customerRepository.save(customer);
    this.invalidateStatusCache();
    await this.recordActivity(id, actorUserId, 'updated', { changedFields });
    
    return (await this.presentMany([updated], actorUserId))[0];
  }

  async reassign(id: string, assignedTo: number, actorUserId: number): Promise<CustomerResponseDto> {
    const customer = await this.customerRepository.findById(id);
    if (!customer) throw new ApplicationError('Customer not found', 'CUSTOMER_NOT_FOUND', 404);
    const access = await customerAccessService.context(actorUserId);
    customerAccessService.assertReassign(customer, access);
    await customerAccessService.assertActiveAssignee(assignedTo);
    const previousAssignedTo = customer.assignedTo ?? customer.userId;
    customer.assignedTo = assignedTo;
    customer.userId = assignedTo;
    customer.updatedBy = actorUserId;
    const updated = await this.customerRepository.save(customer);
    await this.recordActivity(id, actorUserId, 'reassigned', { previousAssignedTo, assignedTo });
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
    this.invalidateStatusCache();
    await this.recordActivity(id, actorUserId, 'deactivated');
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
    this.invalidateStatusCache();
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
    this.invalidateStatusCache();
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
    if (this.statusCache && this.statusCache.expiresAt > Date.now()) return this.statusCache.value;
    const value = await this.customerRepository.getStatusCounts();
    this.statusCache = { value, expiresAt: Date.now() + 15_000 };
    return value;
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
    await this.recordActivity(id, actorUserId, 'image_updated');
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
      await this.recordActivity(id, actorUserId, 'image_removed');
      return (await this.presentMany([updated], actorUserId))[0];
    }

    return (await this.presentMany([customer], actorUserId))[0];
  }

  private normalizeEmail(value?: string | null) {
    return String(value || '').trim().toLocaleLowerCase('en-US');
  }

  private normalizeLoose(value?: string | null) {
    return String(value || '').normalize('NFKC').trim().toLocaleLowerCase('en-US').replace(/[\s@._+()\-]/g, '');
  }

  private editDistance(a: string, b: string) {
    const row = Array.from({ length: b.length + 1 }, (_, index) => index);
    for (let i = 1; i <= a.length; i += 1) {
      let previous = row[0];
      row[0] = i;
      for (let j = 1; j <= b.length; j += 1) {
        const current = row[j];
        row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
        previous = current;
      }
    }
    return row[b.length];
  }

  async duplicateCheck(input: Record<string, any>, excludeCustomerId?: string) {
    const customers = await this.customerRepository.findMany({ order: { createdAt: 'DESC' } } as any);
    const email = this.normalizeEmail(input.customerEmail);
    const phones = [input.customerPhone1, input.customerPhone2].map(value => this.normalizeLoose(value)).filter(Boolean);
    const socialFields = ['customerFacebook', 'customerInstagram', 'customerTikTok', 'customerLine', 'customerX'] as const;
    const socials = socialFields.map(field => this.normalizeLoose(input[field])).filter(Boolean);
    const fullName = this.normalizeLoose(`${input.customerName || ''}${input.customerLastName || ''}`);
    const matches = customers
      .filter(customer => customer.customerId !== excludeCustomerId)
      .map(customer => {
        const reasons: string[] = [];
        if (email && this.normalizeEmail(customer.customerEmail) === email) reasons.push('email');
        const existingPhones = [customer.customerPhone1, customer.customerPhone2].map(value => this.normalizeLoose(value)).filter(Boolean);
        if (phones.some(phone => existingPhones.includes(phone))) reasons.push('phone');
        const existingSocials = socialFields.map(field => this.normalizeLoose(customer[field])).filter(Boolean);
        if (socials.some(handle => existingSocials.includes(handle))) reasons.push('social');
        const existingName = this.normalizeLoose(`${customer.customerName || ''}${customer.customerLastName || ''}`);
        if (fullName.length >= 4 && existingName && this.editDistance(fullName, existingName) <= Math.max(1, Math.floor(fullName.length * 0.2))) reasons.push('similar_name');
        return reasons.length ? {
          customerId: customer.customerId,
          displayName: [customer.customerName, customer.customerLastName].filter(Boolean).join(' '),
          reasons,
          hardBlock: reasons.includes('email'),
        } : null;
      })
      .filter(Boolean);
    return { emailConflict: matches.some(match => match?.hardBlock), matches };
  }

  async mergePreview(sourceCustomerId: string, targetCustomerId: string, actorUserId: number) {
    if (!sourceCustomerId || !targetCustomerId || sourceCustomerId === targetCustomerId) throw new ApplicationError('Choose two different customers', 'CUSTOMER_MERGE_INVALID', 400);
    const [source, target] = await Promise.all([this.customerRepository.findById(sourceCustomerId), this.customerRepository.findById(targetCustomerId)]);
    if (!source || !target) throw new ApplicationError('Customer not found', 'CUSTOMER_NOT_FOUND', 404);
    const access = await customerAccessService.context(actorUserId); customerAccessService.assertDelete(source, access); customerAccessService.assertEdit(target, access);
    const [sourceProfile, targetProfile] = await Promise.all([
      dataSource.getRepository(PublicProfile).findOne({ where: { customerId: sourceCustomerId, deletedAt: IsNull() } }),
      dataSource.getRepository(PublicProfile).findOne({ where: { customerId: targetCustomerId, deletedAt: IsNull() } }),
    ]);
    const fields = ['customerName','customerLastName','customerEmail','customerPhone1','customerPhone2','customerFacebook','customerInstagram','customerTikTok','customerLine','customerX','customerAddress','customerImageUrl','status'] as const;
    return { source: this.present(source, access), target: this.present(target, access), fields: fields.map(field => ({ field, source: source[field], target: target[field], recommended: target[field] ? 'target' : 'source' })), profiles: [sourceProfile, targetProfile].filter(Boolean).map(profile => ({ profileId: profile!.profileId, customerId: profile!.customerId, displayName: profile!.displayName, status: profile!.status })) };
  }

  async merge(sourceCustomerId: string, targetCustomerId: string, actorUserId: number, input: { values?: Record<string, unknown>; keepProfileId?: string }) {
    const preview = await this.mergePreview(sourceCustomerId, targetCustomerId, actorUserId);
    const source = await dataSource.getRepository(Customer).findOneByOrFail({ customerId: sourceCustomerId });
    const target = await dataSource.getRepository(Customer).findOneByOrFail({ customerId: targetCustomerId });
    const allowed = ['customerName','customerLastName','customerEmail','customerPhone1','customerPhone2','customerFacebook','customerInstagram','customerTikTok','customerLine','customerX','customerAddress','customerImageUrl','status'];
    await dataSource.transaction(async manager => {
      await manager.getRepository(CustomerMergeSnapshot).save(manager.getRepository(CustomerMergeSnapshot).create({ sourceCustomerId, targetCustomerId, sourceSnapshot: { ...source }, targetSnapshot: { ...target }, actorUserId }));
      const selectedEmail = String(input.values?.customerEmail ?? target.customerEmail).trim().toLowerCase();
      if (selectedEmail === source.customerEmail.toLowerCase()) source.customerEmail = `merged+${source.customerId}@invalid.followmee.local`;
      source.deletedAt = new Date(); source.isActive = false; source.status = 'canceled'; source.updatedBy = actorUserId;
      await manager.getRepository(Customer).save(source);
      allowed.forEach(field => { if (field in (input.values || {})) (target as any)[field] = input.values![field]; }); target.updatedBy = actorUserId;
      await manager.getRepository(Customer).save(target);
      await manager.query('UPDATE customer_activities SET customerId = ? WHERE customerId = ?', [targetCustomerId, sourceCustomerId]);
      const profiles = await manager.getRepository(PublicProfile).find({ where: [{ customerId: sourceCustomerId }, { customerId: targetCustomerId }] });
      const keep = profiles.find(profile => profile.profileId === input.keepProfileId) || profiles.find(profile => profile.customerId === targetCustomerId) || profiles[0];
      for (const profile of profiles) {
        if (profile.profileId === keep?.profileId) { profile.customerId = targetCustomerId; }
        else { profile.customerId = null; profile.status = 'draft'; profile.visibility = 'private'; }
        profile.updatedBy = actorUserId; await manager.getRepository(PublicProfile).save(profile);
      }
    });
    this.invalidateStatusCache(); await auditService.logEvent({ userId: actorUserId, action: 'CUSTOMER_MERGED', status: 'SUCCESS', details: { sourceCustomerId, targetCustomerId, keepProfileId: input.keepProfileId } });
    return { target: await this.findOne(targetCustomerId, actorUserId), mergedSourceId: sourceCustomerId, preview };
  }

  async getTimeline(customerId: string, viewerUserId: number) {
    await this.findOne(customerId, viewerUserId);
    return dataSource.query(`
      SELECT ca.activityId, ca.activityType, ca.metadata, ca.createdAt,
             u.userId AS actorUserId, u.userName AS actorUserName, u.userLastName AS actorUserLastName, u.userImageUrl AS actorUserImageUrl
      FROM customer_activities ca
      LEFT JOIN users u ON u.userId = ca.actorUserId
      WHERE ca.customerId = ?
      ORDER BY ca.createdAt DESC, ca.activityId DESC
      LIMIT 200
    `, [customerId]);
  }

  private async recordActivity(customerId: string, actorUserId: number | undefined, activityType: string, metadata?: Record<string, unknown>) {
    await dataSource.query(
      'INSERT INTO customer_activities (customerId, actorUserId, activityType, metadata) VALUES (?, ?, ?, ?)',
      [customerId, actorUserId || null, activityType, metadata ? JSON.stringify(metadata) : null],
    );
  }
}

export default new CustomerService();
