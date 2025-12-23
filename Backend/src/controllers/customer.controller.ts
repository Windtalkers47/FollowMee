import { 
  Body, 
  Controller, 
  Delete, 
  Get, 
  Param, 
  Post, 
  Put, 
  Query, 
  UseGuards, 
  UsePipes, 
  ValidationPipe,
  HttpStatus,
  HttpCode,
  Req
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { CustomerService } from '../services/customer.service';
import { CreateCustomerDto } from '../dtos/create-customer.dto';
import { UpdateCustomerDto } from '../dtos/update-customer.dto';
import { CustomerResponseDto } from '../dtos/customer-response.dto';

@Controller('api/customers')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  /**
   * Get all customers (paginated)
   */
  @Get()
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search?: string
  ) {
    if (search) {
      const results = await this.customerService.search(search);
      return { 
        success: true, 
        data: results,
        meta: { total: results.length, page: 1, limit: results.length }
      };
    }

    const [customers, total] = await this.customerService.findAll(true);
    return { 
      success: true, 
      data: customers,
      meta: { 
        total: +total, 
        page: +page, 
        limit: +limit,
        totalPages: Math.ceil(Number(total) / +limit)
      }
    };
  }

  /**
   * Get a single customer by ID
   */
  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) {
    const customer = await this.customerService.findOne(id);
    return { 
      success: true, 
      data: customer 
    };
  }

  /**
   * Create a new customer
   */
  @Post()
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createCustomerDto: CreateCustomerDto) {
    const customer = await this.customerService.create(createCustomerDto);
    return { 
      success: true, 
      data: customer,
      message: 'Customer created successfully' 
    };
  }

  /**
   * Update a customer
   */
  @Put(':id')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() updateData: UpdateCustomerDto
  ) {
    const customer = await this.customerService.update(id, updateData);
    return { 
      success: true, 
      data: customer,
      message: 'Customer updated successfully' 
    };
  }

  /**
   * Delete (deactivate) a customer
   */
  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string) {
    await this.customerService.remove(id);
    return { 
      success: true, 
      message: 'Customer deactivated successfully' 
    };
  }
}
