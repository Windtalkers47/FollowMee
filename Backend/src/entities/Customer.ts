import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('customers')
@Index('IDX_customer_email', ['customerEmail'], { unique: true })
export class Customer {
  @PrimaryGeneratedColumn('uuid', { name: 'customerId' })
  customerId!: string;

  @Column({ name: 'customerName', type: 'varchar', length: 50, nullable: false })
  customerName!: string;

  @Column({ name: 'customerLastName', type: 'varchar', length: 50, nullable: true })
  customerLastName?: string;

  @Column({ name: 'customerEmail', type: 'varchar', length: 100, unique: true, nullable: false })
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

  @Column({ name: 'isActive', type: 'boolean', default: true })
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
