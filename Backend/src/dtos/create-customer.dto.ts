import { IsEmail, IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCustomerDto {
  @IsString()
  @IsNotEmpty({ message: 'Customer name is required' })
  @MaxLength(50, { message: 'Customer name must be at most 50 characters' })
  customerName: string = '';

  @IsString()
  @IsOptional()
  @MaxLength(50, { message: 'Last name must be at most 50 characters' })
  customerLastName?: string;

  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty({ message: 'Email is required' })
  @MaxLength(100, { message: 'Email must be at most 100 characters' })
  customerEmail: string = '';

  @IsString()
  @IsOptional()
  @MaxLength(20, { message: 'Phone number must be at most 20 characters' })
  customerPhone1?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20, { message: 'Phone number must be at most 20 characters' })
  customerPhone2?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100, { message: 'Facebook username must be at most 100 characters' })
  customerFacebook?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100, { message: 'Instagram username must be at most 100 characters' })
  customerInstagram?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100, { message: 'TikTok username must be at most 100 characters' })
  customerTikTok?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100, { message: 'Line ID must be at most 100 characters' })
  customerLine?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100, { message: 'X (Twitter) username must be at most 100 characters' })
  customerX?: string;

  @IsBoolean()
  @IsOptional()
  isActive: boolean = true;
}
