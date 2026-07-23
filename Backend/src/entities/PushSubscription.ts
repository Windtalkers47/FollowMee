import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './User';

/**
 * PushSubscription Entity
 * Stores Web Push subscription data for each user device
 */
@Entity('push_subscriptions')
@Index(['userId', 'endpoint'])
export class PushSubscription {
  @PrimaryGeneratedColumn()
  subscriptionId!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column()
  userId!: number;

  @Column({ type: 'varchar', length: 500 })
  endpoint!: string;

  @Column({ type: 'varchar', length: 255 })
  p256dh!: string;

  @Column({ type: 'varchar', length: 255 })
  auth!: string;

  @Column({ type: 'datetime', nullable: true })
  expirationTime!: Date | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  deviceName!: string | null;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}