import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './User';

@Entity('customers')
@Index('IDX_customer_email', ['customerEmail'], { unique: true })
export class Customer {
  @PrimaryGeneratedColumn('uuid', { name: 'customerId' })
  customerId!: string;

  @Column({ name: 'userId', type: 'int', nullable: true })
  userId!: number | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId' })
  user!: User | null;

  @Column({ name: 'createdBy', type: 'int', nullable: true })
  createdBy!: number | null;

  @Column({ name: 'updatedBy', type: 'int', nullable: true })
  updatedBy!: number | null;

  @Column({ name: 'customerName', type: 'varchar', length: 50, nullable: false })
  customerName!: string;

  @Column({ name: 'customerLastName', type: 'varchar', length: 50, nullable: true })
  customerLastName?: string;

  @Column({ name: 'customerEmail', type: 'varchar', length: 100, nullable: false })
  customerEmail!: string;

  @Column({ name: 'customerPhone1', type: 'varchar', length: 20, nullable: true })
  customerPhone1?: string;

  @Column({ name: 'customerPhone2', type: 'varchar', length: 20, nullable: true })
  customerPhone2?: string;

  @Column({ name: 'customerFacebook', type: 'varchar', length: 100, nullable: true })
  customerFacebook?: string;

  @Column({ name: 'customerInstagram', type: 'varchar', length: 100, nullable: true })
  customerInstagram?: string;

  @Column({ name: 'customerTikTok', type: 'varchar', length: 100, nullable: true })
  customerTikTok?: string;

  @Column({ name: 'customerLine', type: 'varchar', length: 100, nullable: true })
  customerLine?: string;

  @Column({ name: 'customerX', type: 'varchar', length: 100, nullable: true })
  customerX?: string;

  @Column({ name: 'customerAddress', type: 'varchar', length: 255, nullable: true })
  customerAddress?: string;

  @Column({ name: 'customerImageUrl', type: 'varchar', length: 512, nullable: true })
  customerImageUrl?: string;

  @Column({ name: 'isActive', type: 'boolean', default: true })
  isActive: boolean = true;

  @Column({
    name: 'status',
    type: 'enum',
    enum: ['active', 'inactive', 'canceled'],
    default: 'active'
  })
  status: 'active' | 'inactive' | 'canceled' = 'active';

  @Column({ name: 'deletedAt', type: 'datetime', nullable: true })
  deletedAt?: Date;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt!: Date;

  // Helper method to get full name
  get fullName(): string {
    return [this.customerName, this.customerLastName].filter(Boolean).join(' ').trim();
  }
}
