import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service';
import { CreateUserDto } from '../dtos/create-user.dto';
import { UpdateUserDto } from '../dtos/update-user.dto';
import { UserResponseDto } from '../dtos/user-response.dto';
import { uploadBase64Image, deleteFromCloudinary } from '../config/cloudinary.config';

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
      // Extract userImageUrl from the request body
      const { userImageUrl, ...userData } = req.body;
      
      const createUserDto = userData as CreateUserDto;
      
      // Create the user first
      let user = await this.userService.createUser(createUserDto);
      
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
      
      res.status(201).json({ 
        success: true, 
        data: user,
        message: 'User created successfully' + (userImageUrl ? ' with image' : '')
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
            console.log('User image deleted from Cloudinary');
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
      
      const user = await this.userService.updateUser(Number(userId), updateUserDto);
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
        await this.userService.updateUser(userId, { 
          userImageUrl: null 
        });
        
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
