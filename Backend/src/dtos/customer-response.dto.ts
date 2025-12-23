import { Expose } from 'class-transformer';

export class CustomerResponseDto {
  @Expose()
  customerId!: string;

  @Expose()
  customerName!: string;

  @Expose()
  customerLastName!: string | null;

  @Expose()
  customerEmail!: string;

  @Expose()
  customerPhone1!: string | null;

  @Expose()
  customerPhone2!: string | null;

  @Expose()
  customerFacebook!: string | null;

  @Expose()
  customerInstagram!: string | null;

  @Expose()
  customerTikTok!: string | null;

  @Expose()
  customerLine!: string | null;

  @Expose()
  customerX!: string | null;

  @Expose()
  isActive!: boolean;

  @Expose()
  createdAt!: Date;

  @Expose()
  updatedAt!: Date;

  @Expose()
  get fullName(): string {
    return [this.customerName, this.customerLastName].filter(Boolean).join(' ').trim();
  }

  constructor(partial: Partial<CustomerResponseDto>) {
    Object.assign(this, partial);
  }
}
