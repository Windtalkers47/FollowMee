import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCustomerDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  customerName: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  customerLastName?: string;

  @IsEmail()
  @IsNotEmpty()
  @MaxLength(100)
  customerEmail: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  customerPhone1?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  customerPhone2?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  customerFacebook?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  customerInstagram?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  customerTikTok?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  customerLine?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  customerX?: string;

  @IsOptional()
  isActive?: boolean;
}
