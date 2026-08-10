import { IsString, IsEmail, IsOptional, MaxLength, IsBoolean, IsEnum, IsObject } from 'class-validator';

export class UpdateCustomerDto {
  @IsString()
  @IsOptional()
  @MaxLength(50, { message: 'Customer name must be at most 50 characters' })
  customerName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50, { message: 'Last name must be at most 50 characters' })
  customerLastName?: string;

  @IsEmail({}, { message: 'Invalid email format' })
  @IsOptional()
  @MaxLength(100, { message: 'Email must be at most 100 characters' })
  customerEmail?: string;

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
  @MaxLength(255, { message: 'Image URL must be at most 255 characters' })
  customerImageUrl?: string | null;

  @IsObject()
  @IsOptional()
  imageCrop?: { x: number; y: number; zoom: number; rotation: number } | null;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsEnum(['active', 'inactive', 'canceled'], { message: 'Status must be active, inactive, or canceled' })
  @IsOptional()
  status?: 'active' | 'inactive' | 'canceled';

  @IsBoolean()
  @IsOptional()
  removeImage?: boolean;
}
