import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Notification } from './Notification';
import { User } from './User';

@Entity('notification_recipients')
@Index(['userId', 'isRead'])
@Index(['userId', 'isSeen'])
export class NotificationRecipient {
  @PrimaryGeneratedColumn()
  recipientId!: number;

  @Column({ name: 'notificationId', type: 'bigint', nullable: false })
  notificationId!: number;

  @Column({ name: 'userId', type: 'int', nullable: false })
  userId!: number;

  @Column({ name: 'isRead', type: 'boolean', default: false })
  isRead: boolean = false;

  @Column({ name: 'readAt', type: 'timestamp', nullable: true })
  readAt?: Date;

  @Column({ name: 'isSeen', type: 'boolean', default: false })
  isSeen: boolean = false;

  @Column({ name: 'seenAt', type: 'timestamp', nullable: true })
  seenAt?: Date;

  @Column({ name: 'isArchived', type: 'boolean', default: false })
  isArchived: boolean = false;

  @Column({ name: 'archivedAt', type: 'timestamp', nullable: true })
  archivedAt?: Date;

  @Column({ name: 'isDeleted', type: 'boolean', default: false })
  isDeleted: boolean = false;

  @Column({ name: 'deletedAt', type: 'timestamp', nullable: true })
  deletedAt?: Date;

  @Column({ name: 'deliveredAt', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  deliveredAt!: Date;

  // Relations
  @ManyToOne(() => Notification, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'notificationId' })
  notification!: Notification;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;
}
