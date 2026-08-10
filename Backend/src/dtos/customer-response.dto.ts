import { Expose } from 'class-transformer';

export class CustomerResponseDto {
  @Expose()
  customerId!: string;

  @Expose()
  userId?: number;

  @Expose()
  assignedTo?: number;

  @Expose()
  createdBy?: number;

  @Expose()
  assignedToUser?: { userId: number; userName: string; userLastName: string; userImageUrl?: string };

  @Expose()
  createdByUser?: { userId: number; userName: string; userLastName: string; userImageUrl?: string };

  @Expose()
  capabilities!: {
    canView: boolean;
    canEdit: boolean;
    canReassign: boolean;
    canDelete: boolean;
    canPublish: boolean;
  };

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
  customerAddress!: string | null;

  @Expose()
  customerImageUrl!: string | null;

  @Expose()
  imageCrop?: { x: number; y: number; zoom: number; rotation: number } | null;

  @Expose()
  isActive!: boolean;

  @Expose()
  status!: 'active' | 'inactive' | 'canceled';

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
