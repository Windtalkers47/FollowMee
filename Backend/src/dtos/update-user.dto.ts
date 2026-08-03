import { IsEmail, IsOptional, IsString, MaxLength, MinLength, IsBoolean, IsIn } from 'class-validator';

/**
 * DTO for updating user information
 * All fields are optional since we're doing partial updates
 */
export class UpdateUserDto {
  @IsString()
  @IsOptional()
  @MaxLength(50)
  userName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  userLastName?: string;

  @IsEmail()
  @IsOptional()
  @MaxLength(100)
  userEmail?: string;

  @IsString()
  @IsOptional()
  @MinLength(6)
  @MaxLength(100)
  userPassword?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  userPhone1?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  userPhone2?: string | null;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  userImageUrl?: string | null;

  @IsOptional()
  @IsIn(['Owner', 'Admin', 'Moderator', 'Customer'])
  selectedRole?: string;
}
