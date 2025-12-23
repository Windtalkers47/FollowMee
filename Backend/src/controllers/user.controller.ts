import { 
  Body, 
  Controller, 
  Delete, 
  Get, 
  Param, 
  ParseIntPipe, 
  Post, 
  Put, 
  UseGuards, 
  UsePipes, 
  ValidationPipe,
  HttpStatus,
  HttpCode,
  Res,
  Req
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response, Request } from 'express';
import { UserService } from '../services/user.service';
import { CreateUserDto } from '../dtos/create-user.dto';
import { UpdateUserDto } from '../dtos/update-user.dto';
import { UserResponseDto } from '../dtos/user-response.dto';

@Controller('api/users')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * Get all users (Admin only)
   */
  @Get()
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async findAll() {
    const users = await this.userService.getAllUsers();
    return { 
      success: true, 
      data: users 
    };
  }

  /**
   * Get current authenticated user's profile
   */
  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async getProfile(@Req() req: Request) {
    const userId = (req.user as any).userId;
    const user = await this.userService.getUserById(userId);
    return { 
      success: true, 
      data: user 
    };
  }

  /**
   * Get a single user by ID (Admin only)
   */
  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const user = await this.userService.getUserById(id);
    return { 
      success: true, 
      data: user 
    };
  }

  /**
   * Create a new user (Admin only)
   */
  @Post()
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createUserDto: CreateUserDto) {
    const user = await this.userService.createUser(createUserDto);
    return { 
      success: true, 
      data: user,
      message: 'User created successfully' 
    };
  }

  /**
   * Update user profile (for both admin and self-update)
   */
  @Put('me')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @Req() req: Request,
    @Body() updateUserDto: UpdateUserDto
  ) {
    const userId = (req.user as any).userId;
    const user = await this.userService.updateUser(userId, updateUserDto);
    return { 
      success: true, 
      data: user,
      message: 'Profile updated successfully' 
    };
  }

  /**
   * Update any user (Admin only)
   */
  @Put(':id')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto
  ) {
    const user = await this.userService.updateUser(id, updateUserDto);
    return { 
      success: true, 
      data: user,
      message: 'User updated successfully' 
    };
  }

  /**
   * Delete a user (Admin only)
   */
  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.userService.deleteUser(id);
    return { 
      success: true, 
      message: 'User deactivated successfully' 
    };
  }

  /**
   * Change current user's password
   */
  @Post('change-password')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Req() req: Request,
    @Body('currentPassword') currentPassword: string,
    @Body('newPassword') newPassword: string
  ) {
    const userId = (req.user as any).userId;
    await this.userService.changePassword(userId, currentPassword, newPassword);
    return { 
      success: true, 
      message: 'Password changed successfully' 
    };
  }
}
