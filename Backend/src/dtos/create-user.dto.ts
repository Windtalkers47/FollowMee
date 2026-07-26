import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateUserDto {
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
  userPhone1: string | null = null;
  
  @IsString()
  @IsOptional()
  @MaxLength(20)
  userPhone2: string | null = null;

  @IsOptional()
  isActive: boolean = true;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  userImageUrl: string | null = null;

}
