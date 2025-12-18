import { AppDataSource } from '../config/database';
import User from '../entities/User';
import bcrypt from 'bcryptjs';

export class UserService {
  private userRepository = AppDataSource.getRepository(User);

  async getAllUsers() {
    return this.userRepository.find({
      select: ['userId', 'userName', 'userLastName', 'userEmail', 'userPhone1', 'isActive', 'createdAt']
    });
  }

  async getUserById(id: number) {
    const user = await this.userRepository.findOne({ 
      where: { userId: id },
      select: ['userId', 'userName', 'userLastName', 'userEmail', 'userPhone1', 'isActive', 'createdAt']
    });
    
    if (!user) {
      throw new Error('User not found');
    }
    
    return user;
  }

  async createUser(userData: Omit<User, 'userId' | 'createdAt' | 'updatedAt'>) {
    const existingUser = await this.userRepository.findOne({ 
      where: { userEmail: userData.userEmail } 
    });
    
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(userData.userPassword, 10);
    const user = this.userRepository.create({
      ...userData,
      userPassword: hashedPassword
    });
    
    await this.userRepository.save(user);
    
    // Don't return password
    const { userPassword, ...result } = user;
    return result;
  }

  async updateUser(id: number, userData: Partial<User>) {
    const user = await this.userRepository.findOne({ where: { userId: id } });
    
    if (!user) {
      throw new Error('User not found');
    }

    // Don't allow updating email to an existing one
    if (userData.userEmail && userData.userEmail !== user.userEmail) {
      const existingUser = await this.userRepository.findOne({ 
        where: { userEmail: userData.userEmail } 
      });
      
      if (existingUser) {
        throw new Error('Email already in use');
      }
    }

    // Hash new password if provided
    if (userData.userPassword) {
      userData.userPassword = await bcrypt.hash(userData.userPassword, 10);
    }

    Object.assign(user, userData);
    await this.userRepository.save(user);
    
    // Don't return password
    const { userPassword, ...result } = user;
    return result;
  }

  async deleteUser(id: number) {
    const user = await this.userRepository.findOne({ where: { userId: id } });
    
    if (!user) {
      throw new Error('User not found');
    }
    
    await this.userRepository.remove(user);
    return { message: 'User deleted successfully' };
  }
}

export default new UserService();
