import { IsEmail, IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength, IsBase64, IsEnum } from 'class-validator';

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

  @IsString()
  @IsOptional()
  @MaxLength(255, { message: 'Address must be at most 255 characters' })
  customerAddress?: string;

  @IsString()
  @IsOptional()
  customerImageUrl?: string;

  @IsEnum(['active', 'inactive', 'canceled'], { message: 'Status must be active, inactive, or canceled' })
  @IsOptional()
  status?: 'active' | 'inactive' | 'canceled' = 'active';

  @IsString()
  @IsOptional()
  @IsBase64()
  base64Image?: string;

  @IsBoolean()
  @IsOptional()
  removeImage?: boolean;
}
