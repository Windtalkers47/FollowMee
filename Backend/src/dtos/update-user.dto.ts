import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsEmail()
  @IsOptional()
  @MaxLength(100)
  userEmail?: string;

  @IsString()
  @IsOptional()
  @MinLength(8)
  @MaxLength(100)
  userPassword?: string;
}
