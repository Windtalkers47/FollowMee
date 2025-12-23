import { FindOptionsWhere, FindOneOptions } from 'typeorm';
import { User } from '../entities/User';
import { BaseRepository } from './base.repository';

export class UserRepository extends BaseRepository<User> {
  constructor() {
    super(User);
  }

  async findByEmail(email: string, selectPassword: boolean = false): Promise<User | null> {
    const options: FindOneOptions<User> = {
      where: { userEmail: email } as FindOptionsWhere<User>,
      select: ['userId', 'userEmail', 'userName', 'userLastName', 'isActive', 'createdAt']
    };

    if (selectPassword) {
      (options.select as string[]).push('userPassword', 'userPasswordHash');
    }

    return this.repository.findOne(options);
  }

  async updatePassword(userId: number, newPassword: string): Promise<boolean> {
    const user = new User();
    user.userPassword = newPassword;
    // The @BeforeUpdate hook will hash the password
    const result = await this.update(userId, user as any);
    return !!result;
  }

  async markAsInactive(userId: number): Promise<boolean> {
    const result = await this.update(userId, { isActive: false } as any);
    return !!result;
  }
}
