import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service';
import { CreateUserDto } from '../dtos/create-user.dto';
import { UpdateUserDto } from '../dtos/update-user.dto';
import { UserResponseDto } from '../dtos/user-response.dto';

export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * Get all users
   */
  async getAllUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const users = await this.userService.getAllUsers();
      res.status(200).json({ success: true, data: users });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current authenticated user's profile
   */
  async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ message: 'User not authenticated' });
        return;
      }
      const user = await this.userService.getUserById(userId);
      res.status(200).json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a single user by ID
   */
  async getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;
      const user = await this.userService.getUserById(Number(userId));
      res.status(200).json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a new user
   */
  async createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userData: CreateUserDto = req.body;
      const user = await this.userService.createUser(userData);
      res.status(201).json({ 
        success: true, 
        data: user,
        message: 'User created successfully' 
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user profile (for both admin and self-update)
   */
  async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ message: 'User not authenticated' });
        return;
      }
      const userData: UpdateUserDto = req.body;
      const user = await this.userService.updateUser(userId, userData);
      res.status(200).json({ 
        success: true, 
        data: user,
        message: 'Profile updated successfully' 
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update any user (Admin only)
   */
  async updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;
      const userData: UpdateUserDto = req.body;
      const user = await this.userService.updateUser(Number(userId), userData);
      res.status(200).json({ 
        success: true, 
        data: user,
        message: 'User updated successfully' 
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a user
   */
  async deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;
      await this.userService.deleteUser(Number(userId));
      res.status(200).json({ 
        success: true, 
        message: 'User deleted successfully' 
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Change current user's password
   */
  async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ message: 'User not authenticated' });
        return;
      }
      const { currentPassword, newPassword } = req.body;
      await this.userService.changePassword(userId, currentPassword, newPassword);
      res.status(200).json({ 
        success: true, 
        message: 'Password changed successfully' 
      });
    } catch (error) {
      next(error);
    }
  }
}
