import * as bcrypt from 'bcryptjs';
import { User } from '../entities/User';
import { CreateUserDto } from '../dtos/create-user.dto';
import { UserResponseDto } from '../dtos/user-response.dto';
import { UserRepository } from '../repositories/user.repository';

export class UserService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  /**
   * Get all active users
   */
  async getAllUsers(): Promise<UserResponseDto[]> {
    const users = await this.userRepository.find({ isActive: true });
    return users.map(user => new UserResponseDto(user));
  }

  /**
   * Get user by ID
   */
  async getUserById(id: number): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({ userId: id });
    
    if (!user) {
      throw new Error('User not found');
    }
    
    return new UserResponseDto(user);
  }

  /**
   * Create a new user
   */
  async createUser(userData: CreateUserDto): Promise<UserResponseDto> {
    // Check if user with email already exists
    const existingUser = await this.userRepository.findByEmail(userData.userEmail);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Create new user
    const user = new User();
    Object.assign(user, userData);
    
    // Save will trigger the @BeforeInsert hook to hash the password
    const createdUser = await this.userRepository.create(user);
    
    return new UserResponseDto(createdUser);
  }

  /**
   * Update user information
   */
  async updateUser(
    id: number, 
    userData: Partial<Omit<CreateUserDto, 'userPassword'>> & { userPassword?: string }
  ): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({ userId: id });
    if (!user) {
      throw new Error('User not found');
    }

    // Check if email is being updated and if it's already in use
    if (userData.userEmail && userData.userEmail !== user.userEmail) {
      const existingUser = await this.userRepository.findByEmail(userData.userEmail);
      if (existingUser) {
        throw new Error('Email already in use');
      }
    }

    // Update user data
    Object.assign(user, userData);
    
    // If password is being updated, it will be hashed by the @BeforeUpdate hook
    if (userData.userPassword) {
      user.userPassword = userData.userPassword;
    }

    const updatedUser = await this.userRepository.update(id, user);
    if (!updatedUser) {
      throw new Error('Failed to update user');
    }

    return new UserResponseDto(updatedUser);
  }

  /**
   * Soft delete a user (mark as inactive)
   */
  async deleteUser(id: number): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({ userId: id });
    if (!user) {
      throw new Error('User not found');
    }

    await this.userRepository.markAsInactive(id);
    return { message: 'User deactivated successfully' };
  }

  /**
   * Change user password
   */
  async changePassword(userId: number, currentPassword: string, newPassword: string): Promise<boolean> {
    const user = await this.userRepository.findByEmail(
      (await this.getUserById(userId)).userEmail,
      true // Include password fields
    ) as User & { userPassword: string };

    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.userPassword);
    if (!isPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Update to new password (will be hashed by the repository)
    return this.userRepository.updatePassword(userId, newPassword);
  }
}

export default new UserService();
