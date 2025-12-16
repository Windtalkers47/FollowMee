import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../entities/Customer';
import { CreateCustomerDto } from '../dtos/create-customer.dto';

@Injectable()
export class CustomerService {
  constructor(
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
  ) {}

  async findAll(): Promise<Customer[]> {
    return this.customerRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Customer | undefined> {
    return this.customerRepository.findOne({ where: { customerId: id } });
  }

  async create(createCustomerDto: CreateCustomerDto): Promise<Customer> {
    const customer = this.customerRepository.create({
      ...createCustomerDto,
      isActive: createCustomerDto.isActive ?? true, // Default to true if not provided
    });
    return this.customerRepository.save(customer);
  }

  async update(id: string, updateData: Partial<Customer>): Promise<Customer | undefined> {
    await this.customerRepository.update(id, updateData);
    return this.customerRepository.findOne({ where: { customerId: id } });
  }

  async remove(id: string): Promise<void> {
    await this.customerRepository.delete(id);
  }
}
