import { Type } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';

export class RequiredString {
  @IsString()
  @IsNotEmpty()
  value: string = '';
}

export class OptionalString {
  @IsString()
  @IsOptional()
  value: string = '';
}

export class CreateCustomerDto {
  @Type(() => RequiredString)
  @ValidateNested()
  @MaxLength(50, { message: 'Customer name must be at most 50 characters' })
  customerName: RequiredString = new RequiredString();

  @Type(() => OptionalString)
  @ValidateNested()
  @MaxLength(50, { message: 'Last name must be at most 50 characters' })
  @IsOptional()
  customerLastName?: OptionalString;

  @Type(() => RequiredString)
  @ValidateNested()
  @IsEmail({}, { message: 'Invalid email format' })
  @MaxLength(100, { message: 'Email must be at most 100 characters' })
  customerEmail: RequiredString = new RequiredString();

  @Type(() => OptionalString)
  @ValidateNested()
  @MaxLength(20, { message: 'Phone number must be at most 20 characters' })
  @IsOptional()
  customerPhone1?: OptionalString;

  @Type(() => OptionalString)
  @ValidateNested()
  @MaxLength(20, { message: 'Phone number must be at most 20 characters' })
  @IsOptional()
  customerPhone2?: OptionalString;

  @Type(() => OptionalString)
  @ValidateNested()
  @MaxLength(100, { message: 'Facebook URL must be at most 100 characters' })
  @IsOptional()
  customerFacebook?: OptionalString;

  @Type(() => OptionalString)
  @ValidateNested()
  @MaxLength(100, { message: 'Instagram handle must be at most 100 characters' })
  @IsOptional()
  customerInstagram?: OptionalString;

  @Type(() => OptionalString)
  @ValidateNested()
  @MaxLength(100, { message: 'TikTok handle must be at most 100 characters' })
  @IsOptional()
  customerTikTok?: OptionalString;

  @Type(() => OptionalString)
  @ValidateNested()
  @MaxLength(100, { message: 'Line ID must be at most 100 characters' })
  @IsOptional()
  customerLine?: OptionalString;

  @Type(() => OptionalString)
  @ValidateNested()
  @MaxLength(100, { message: 'X handle must be at most 100 characters' })
  @IsOptional()
  customerX?: OptionalString;

  @IsOptional()
  isActive?: boolean;
}
