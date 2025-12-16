import { Body, Controller, Delete, Get, Param, Post, Put, UsePipes, ValidationPipe } from '@nestjs/common';
import { CustomerService } from '../services/customer.service';
import { Customer } from '../entities/Customer';
import { CreateCustomerDto } from '../dtos/create-customer.dto';

@Controller('api/customers')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Get()
  async findAll(): Promise<Customer[]> {
    return this.customerService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Customer> {
    const customer = await this.customerService.findOne(id);
    if (!customer) {
      throw new Error('Customer not found');
    }
    return customer;
  }

  @Post()
  @UsePipes(new ValidationPipe({ transform: true }))
  async create(@Body() createCustomerDto: CreateCustomerDto): Promise<Customer> {
    return this.customerService.create(createCustomerDto);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateData: Partial<Customer>,
  ): Promise<Customer> {
    const customer = await this.customerService.update(id, updateData);
    if (!customer) {
      throw new Error('Customer not found');
    }
    return customer;
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    return this.customerService.remove(id);
  }
}
