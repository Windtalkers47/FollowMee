import { Customer } from '../entities/Customer';
import { CreateCustomerDto } from '../dtos/create-customer.dto';
import { UpdateCustomerDto } from '../dtos/update-customer.dto';
import { CustomerRepository } from '../repositories/customer.repository';
import { CustomerResponseDto } from '../dtos/customer-response.dto';

export class CustomerService {
  constructor(private customerRepository: CustomerRepository) {}

  async findAll(includeInactive = false): Promise<CustomerResponseDto[]> {
    const customers = includeInactive
      ? await this.customerRepository.find(undefined, { order: { createdAt: 'DESC' } })
      : await this.customerRepository.findActive();

    return customers.map(c => new CustomerResponseDto(c));
  }

  async findOne(id: string): Promise<CustomerResponseDto> {
    const customer = await this.customerRepository.findOne({ customerId: id });
    if (!customer) {
      throw new Error(`Customer with ID ${id} not found`);
    }
    return new CustomerResponseDto(customer);
  }

  async search(query: string): Promise<CustomerResponseDto[]> {
    const customers = await this.customerRepository.search(query);
    return customers.map(c => new CustomerResponseDto(c));
  }

  async create(dto: CreateCustomerDto): Promise<CustomerResponseDto> {
    const existing = await this.customerRepository.findByEmail(dto.customerEmail);
    if (existing) {
      throw new Error('A customer with this email already exists');
    }

    const customer = new Customer();
    Object.assign(customer, dto);
    
    // Ensure isActive is set (default to true if not provided)
    if (customer.isActive === undefined) {
      customer.isActive = true;
    }

    const created = await this.customerRepository.create(customer);
    return new CustomerResponseDto(created);
  }

  async update(
    id: string,
    updateData: Partial<UpdateCustomerDto>
  ): Promise<CustomerResponseDto> {
    const customer = await this.customerRepository.findOne({ customerId: id });
    if (!customer) {
      throw new Error(`Customer with ID ${id} not found`);
    }

    // Check if email is being updated and if it's already in use
    if (
      updateData.customerEmail &&
      updateData.customerEmail !== customer.customerEmail
    ) {
      const existing = await this.customerRepository.findByEmail(
        updateData.customerEmail
      );
      if (existing) {
        throw new Error('Email is already in use');
      }
    }

    // Update customer with new data
    Object.assign(customer, updateData);
    
    const updated = await this.customerRepository.update(id, customer);

    if (!updated) {
      throw new Error('Failed to update customer');
    }

    return new CustomerResponseDto(updated);
  }

  async remove(id: string): Promise<{ message: string }> {
    const customer = await this.customerRepository.findOne({ customerId: id });
    if (!customer) {
      throw new Error(`Customer with ID ${id} not found`);
    }

    await this.customerRepository.deactivate(id);
    return { message: 'Customer deactivated successfully' };
  }
}
