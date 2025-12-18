import { AppDataSource } from '../config/database';
import User from '../entities/User';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export class AuthService {
  private userRepository = AppDataSource.getRepository(User);

  async login(email: string, password: string) {
    const user = await this.userRepository.findOne({ 
      where: { userEmail: email } 
    });
    
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.userPassword);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    const token = jwt.sign(
      { userId: user.userId, email: user.userEmail },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Don't return password in the response
    const { userPassword, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, token };
  }

  async getCurrentUser(userId: number) {
    const user = await this.userRepository.findOne({ 
      where: { userId },
      select: ['userId', 'userName', 'userLastName', 'userEmail', 'userPhone1', 'isActive', 'createdAt']
    });
    
    if (!user) {
      throw new Error('User not found');
    }
    
    return user;
  }
}

export default new AuthService();
