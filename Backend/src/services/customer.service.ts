import { Injectable, NotFoundException } from '@nestjs/common';
import { Customer } from '../entities/Customer';
import { CreateCustomerDto } from '../dtos/create-customer.dto';
import { CustomerRepository } from '../repositories/customer.repository';
import { CustomerResponseDto } from '../dtos/customer-response.dto';

@Injectable()
export class CustomerService {
  constructor(private customerRepository: CustomerRepository) {}

  /**
   * Get all active customers
   */
  async findAll(includeInactive = false): Promise<CustomerResponseDto[]> {
    const customers = includeInactive 
      ? await this.customerRepository.find(undefined, { order: { createdAt: 'DESC' } })
      : await this.customerRepository.findActive();
    
    return customers.map(customer => new CustomerResponseDto(customer));
  }

  /**
   * Find customer by ID
   */
  async findOne(id: string): Promise<CustomerResponseDto> {
    const customer = await this.customerRepository.findOne({ customerId: id });
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }
    return new CustomerResponseDto(customer);
  }

  /**
   * Search customers by name or email
   */
  async search(query: string): Promise<CustomerResponseDto[]> {
    const customers = await this.customerRepository.search(query);
    return customers.map(customer => new CustomerResponseDto(customer));
  }

  /**
   * Create a new customer
   */
  async create(createCustomerDto: CreateCustomerDto): Promise<CustomerResponseDto> {
    // Check if customer with email already exists
    const existingCustomer = await this.customerRepository.findByEmail(createCustomerDto.customerEmail.value);
    if (existingCustomer) {
      throw new Error('A customer with this email already exists');
    }

    const customer = new Customer();
    Object.assign(customer, {
      ...createCustomerDto,
      isActive: createCustomerDto.isActive ?? true
    });

    const createdCustomer = await this.customerRepository.create(customer);
    return new CustomerResponseDto(createdCustomer);
  }

  /**
   * Update customer information
   */
  async update(
    id: string, 
    updateData: Partial<CreateCustomerDto>
  ): Promise<CustomerResponseDto> {
    const customer = await this.customerRepository.findOne({ customerId: id });
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    // If email is being updated, check if it's already in use
    if (updateData.customerEmail && updateData.customerEmail.value !== customer.customerEmail) {
      const existingCustomer = await this.customerRepository.findByEmail(updateData.customerEmail.value);
      if (existingCustomer) {
        throw new Error('Email is already in use by another customer');
      }
    }

    Object.assign(customer, updateData);
    const updatedCustomer = await this.customerRepository.update(id, customer);
    
    if (!updatedCustomer) {
      throw new Error('Failed to update customer');
    }

    return new CustomerResponseDto(updatedCustomer);
  }

  /**
   * Soft delete a customer (mark as inactive)
   */
  async remove(id: string): Promise<{ message: string }> {
    const customer = await this.customerRepository.findOne({ customerId: id });
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    await this.customerRepository.deactivate(id);
    return { message: 'Customer deactivated successfully' };
  }
}
