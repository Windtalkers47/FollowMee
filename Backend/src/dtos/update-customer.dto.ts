import { Type } from 'class-transformer';
import { IsBoolean, IsOptional, ValidateNested } from 'class-validator';
import { OptionalString, RequiredString } from './create-customer.dto';

export class UpdateCustomerDto {
  @Type(() => RequiredString)
  @ValidateNested()
  @IsOptional()
  customerName?: RequiredString;

  @Type(() => OptionalString)
  @ValidateNested()
  @IsOptional()
  customerLastName?: OptionalString;

  @Type(() => RequiredString)
  @ValidateNested()
  @IsOptional()
  customerEmail?: RequiredString;

  @Type(() => OptionalString)
  @ValidateNested()
  @IsOptional()
  customerPhone1?: OptionalString;

  @Type(() => OptionalString)
  @ValidateNested()
  @IsOptional()
  customerPhone2?: OptionalString;

  @Type(() => OptionalString)
  @ValidateNested()
  @IsOptional()
  customerFacebook?: OptionalString;

  @Type(() => OptionalString)
  @ValidateNested()
  @IsOptional()
  customerInstagram?: OptionalString;

  @Type(() => OptionalString)
  @ValidateNested()
  @IsOptional()
  customerTikTok?: OptionalString;

  @Type(() => OptionalString)
  @ValidateNested()
  @IsOptional()
  customerLine?: OptionalString;

  @Type(() => OptionalString)
  @ValidateNested()
  @IsOptional()
  customerX?: OptionalString;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
