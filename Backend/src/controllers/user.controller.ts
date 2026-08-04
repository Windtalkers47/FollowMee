import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service';
import { CreateUserDto } from '../dtos/create-user.dto';
import { UpdateUserDto } from '../dtos/update-user.dto';
import { UserResponseDto } from '../dtos/user-response.dto';
import { uploadBase64Image, deleteFromCloudinary } from '../config/cloudinary.config';
import AppDataSource from '../config/database';
import { User } from '../entities/User';
import { webSocketService } from '../services/websocket.service';
import { randomUUID } from 'crypto';
import { NotificationHelper } from '../utils/notification.util';

export class UserController {
  constructor(private readonly userService: UserService) {}

  private userRepository = AppDataSource.getRepository(User);

  private emitProfileUpdated(user: UserResponseDto | User, actorUserId: number): void {
    webSocketService.broadcastProfileUpdate({
      eventId: randomUUID(),
      userId: user.userId,
      actorUserId,
      userName: user.userName,
      userLastName: user.userLastName || '',
      userImageUrl: user.userImageUrl || null,
      updatedAt: new Date(user.updatedAt || Date.now()).toISOString(),
    });
  }

  /**
   * Check if user is active
   */
  private async checkUserActive(userId: number): Promise<boolean> {
    const user = await this.userRepository.findOne({ 
      where: { userId, isActive: true } 
    });
    return !!user;
  }

  async getAssignableUsers(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const users = await this.userRepository.find({
        where: { isActive: true },
        select: { userId: true, userName: true, userLastName: true, userImageUrl: true },
        order: { userName: 'ASC', userLastName: 'ASC' },
      });
      res.status(200).json({ success: true, data: users });
    } catch (error) {
      next(error);
    }
  }

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

      // Check if user is active
      const isUserActive = await this.checkUserActive(userId);
      if (!isUserActive) {
        res.status(403).json({ message: 'User account is not active' });
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
      // Extract userImageUrl from the request body
      const { userImageUrl, ...userData } = req.body;
      
      const createUserDto = userData as CreateUserDto;
      
      // Create the user first
      let result = await this.userService.createUser(createUserDto);
      let user = result.user;
      
      // If there's a userImageUrl, upload it and update the user
      if (userImageUrl) {
        try {
          const imageUrl = await uploadBase64Image(userImageUrl, 'followmee/users');
          user = await this.userService.updateUser(user.userId, { 
            userImageUrl: imageUrl 
          });
        } catch (error) {
          console.error('Error uploading user image:', error);
          // Don't fail the entire request if image upload fails
          // The user is already created, we can continue without the image
        }
      }
      
      const message = result.reactivated 
        ? 'User reactivated successfully' + (userImageUrl ? ' with image' : '')
        : 'User created successfully' + (userImageUrl ? ' with image' : '');
      
      res.status(201).json({ 
        success: true, 
        data: user,
        message
      });
    } catch (error: unknown) {
      console.error('Error creating user:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      
      // Handle duplicate email or name error specifically
      if (errorMessage.includes('email already exists') || errorMessage.includes('duplicate') || errorMessage.includes('name already exists') || errorMessage.includes('Email already in use')) {
        res.status(400).json({ 
          success: false, 
          message: 'Failed to create user',
          error: errorMessage
        });
        return;
      }
      
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

      // Check if user is active
      const isUserActive = await this.checkUserActive(userId);
      if (!isUserActive) {
        res.status(403).json({ message: 'User account is not active' });
        return;
      }
      
      // Extract userImageUrl from the request body
      const { userImageUrl, ...userData } = req.body;
      
      const updateUserDto = userData as UpdateUserDto;
      
      // Handle image removal if userImageUrl is explicitly set to null
      if (userImageUrl === null) {
        // Find the user to get the current image URL
        const user = await this.userService.getUserById(userId);
        
        if (user && user.userImageUrl) {
          try {
            await deleteFromCloudinary(user.userImageUrl);
          } catch (error) {
            console.error('Error deleting user image from Cloudinary:', error);
            // Continue even if deletion fails
          }
        }
        
        // Set userImageUrl to null to remove it
        updateUserDto.userImageUrl = null;
      }
      // If there's a userImageUrl (base64 string), upload it
      else if (userImageUrl) {
        try {
          const imageUrl = await uploadBase64Image(userImageUrl, 'followmee/users');
          updateUserDto.userImageUrl = imageUrl;
                  } catch (error) {
          console.error('Error uploading user image:', error);
          // Don't fail the entire request if image upload fails
          // Just continue without updating the image
        }
      }
      
      const user = await this.userService.updateUser(userId, updateUserDto);
      
      this.emitProfileUpdated(user, userId);
      
      res.status(200).json({ 
        success: true, 
        data: user,
        message: userImageUrl === null ? 'Profile updated and image removed successfully' : 
                  userImageUrl ? 'Profile updated with new image successfully' : 'Profile updated successfully'
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
      
      // Extract userImageUrl from the request body
      const { userImageUrl, ...userData } = req.body;
      
      const updateUserDto = userData as UpdateUserDto;
      
      // Handle image removal if userImageUrl is explicitly set to null
      if (userImageUrl === null) {
        // Find the user to get the current image URL
        const user = await this.userService.getUserById(Number(userId));
        
        if (user && user.userImageUrl) {
          try {
            await deleteFromCloudinary(user.userImageUrl);
          } catch (error) {
            console.error('Error deleting user image from Cloudinary:', error);
            // Continue even if deletion fails
          }
        }
        
        // Set userImageUrl to null to remove it
        updateUserDto.userImageUrl = null;
              }
      // If there's a userImageUrl (base64 string), upload it
      else if (userImageUrl) {
        try {
          const imageUrl = await uploadBase64Image(userImageUrl, 'followmee/users');
          updateUserDto.userImageUrl = imageUrl;
                  } catch (error) {
          console.error('Error uploading user image:', error);
          // Don't fail the entire request if image upload fails
          // Just continue without updating the image
        }
      }
      
      const targetUserId = Number(userId);
      const actorUserId = req.user?.userId;
      const user = await this.userService.updateUser(targetUserId, updateUserDto);
      
      if (actorUserId) {
        this.emitProfileUpdated(user, actorUserId);
        const publicProfileChanged = ['userName', 'userLastName', 'userImageUrl']
          .some(field => Object.prototype.hasOwnProperty.call(updateUserDto, field));
        if (actorUserId !== targetUserId && publicProfileChanged) {
          void NotificationHelper.notifyProfileUpdatedByAdmin(
            `${user.userName} ${user.userLastName || ''}`.trim(),
            actorUserId,
            targetUserId,
          ).catch(error => {
            console.error('[ProfileNotification] Delivery failed', {
              actorUserId,
              targetUserId,
              error: error instanceof Error ? error.message : String(error),
            });
          });
        }
      }
      
      res.status(200).json({ 
        success: true, 
        data: user,
        message: userImageUrl === null ? 'User updated and image removed successfully' : 
                  userImageUrl ? 'User updated with new image successfully' : 'User updated successfully'
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

      // Check if user is active
      const isUserActive = await this.checkUserActive(userId);
      if (!isUserActive) {
        res.status(403).json({ message: 'User account is not active' });
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

  /**
   * Upload user profile image
   */
  async uploadUserImage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ message: 'User not authenticated' });
        return;
      }

      // Check if user is active
      const isUserActive = await this.checkUserActive(userId);
      if (!isUserActive) {
        res.status(403).json({ message: 'User account is not active' });
        return;
      }
      
      const { userImageUrl } = req.body;
      
      if (!userImageUrl) {
        res.status(400).json({
          success: false,
          message: 'No image data provided',
        });
        return;
      }

      try {
        // Get current user to check if they have an existing image
        const currentUser = await this.userService.getUserById(userId);
        
        // Delete old image from Cloudinary if it exists
        if (currentUser?.userImageUrl) {
          await deleteFromCloudinary(currentUser.userImageUrl);
        }
        
        // Upload new image
        const imageUrl = await uploadBase64Image(userImageUrl, 'followmee/users');
        
        // Update user with new image URL
        const updatedUser = await this.userService.updateUser(userId, {
          userImageUrl: imageUrl 
        });
        this.emitProfileUpdated(updatedUser, userId);
        
        res.json({
          success: true,
          data: { userImageUrl: imageUrl },
          message: 'Profile image uploaded successfully'
        });
      } catch (uploadError) {
        console.error('Error uploading user image:', uploadError);
        res.status(500).json({
          success: false,
          message: 'Failed to upload image',
          error: uploadError instanceof Error ? uploadError.message : 'Unknown error'
        });
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete user profile image
   */
  async deleteUserImage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ message: 'User not authenticated' });
        return;
      }

      // Check if user is active
      const isUserActive = await this.checkUserActive(userId);
      if (!isUserActive) {
        res.status(403).json({ message: 'User account is not active' });
        return;
      }

      try {
        // Get current user to get their image URL
        const currentUser = await this.userService.getUserById(userId);
        
        if (!currentUser?.userImageUrl) {
          res.status(404).json({
            success: false,
            message: 'No profile image found'
          });
          return;
        }
        
        // Delete image from Cloudinary
        await deleteFromCloudinary(currentUser.userImageUrl);
        
        // Update user to remove image URL
        const updatedUser = await this.userService.updateUser(userId, {
          userImageUrl: null 
        });
        this.emitProfileUpdated(updatedUser, userId);
        
        res.json({
          success: true,
          message: 'Profile image deleted successfully'
        });
      } catch (deleteError) {
        console.error('Error deleting user image:', deleteError);
        res.status(500).json({
          success: false,
          message: 'Failed to delete image',
          error: deleteError instanceof Error ? deleteError.message : 'Unknown error'
        });
      }
    } catch (error) {
      next(error);
    }
  }
}
