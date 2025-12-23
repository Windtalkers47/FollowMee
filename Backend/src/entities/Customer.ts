import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('customers')
@Index('IDX_customer_email', ['email'], { unique: true })
export class Customer {
  @PrimaryGeneratedColumn('uuid', { name: 'customerId' })
  customerId!: string;

  @Column({ name: 'customerName', length: 50, nullable: false })
  customerName: string = '';

  @Column({ name: 'customerLastName', length: 50, nullable: true })
  customerLastName: string | null = null;

  @Column({ name: 'customerEmail', length: 100, unique: true, nullable: false })
  customerEmail: string = '';

  @Column({ name: 'customerPhone1', length: 20, nullable: true })
  customerPhone1: string | null = null;

  @Column({ name: 'customerPhone2', length: 20, nullable: true })
  customerPhone2: string | null = null;

  @Column({ name: 'customerFacebook', length: 100, nullable: true })
  customerFacebook: string | null = null;

  @Column({ name: 'customerInstagram', length: 100, nullable: true })
  customerInstagram: string | null = null;

  @Column({ name: 'customerTikTok', length: 100, nullable: true })
  customerTikTok: string | null = null;

  @Column({ name: 'customerLine', length: 100, nullable: true })
  customerLine: string | null = null;

  @Column({ name: 'customerX', length: 100, nullable: true })
  customerX: string | null = null;

  @Column({ name: 'isActive', default: true })
  isActive: boolean = true;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt!: Date;

  // Helper method to get full name
  get fullName(): string {
    return [this.customerName, this.customerLastName].filter(Boolean).join(' ').trim();
  }
}
