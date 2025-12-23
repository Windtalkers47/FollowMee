import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { User } from '../entities/User';

export class CreateUserDto implements Omit<User, 'userId' | 'createdAt' | 'updatedAt' | 'hashPassword' | 'verifyPassword'> {
  // This computed property will be used to satisfy the fullName requirement
  get fullName(): string {
    return `${this.userName} ${this.userLastName}`.trim();
  }
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  userName: string = '';

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  userLastName: string = '';

  @IsEmail()
  @IsNotEmpty()
  @MaxLength(100)
  userEmail: string = '';

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(100)
  userPassword: string = '';

  @IsString()
  @IsOptional()
  @MaxLength(20)
  userPhone1?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  userPhone2?: string;

  @IsOptional()
  isActive: boolean = true;
}
