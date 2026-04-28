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

@Entity('user_notification_settings')
@Index(['userId'], { unique: true })
export class UserNotificationSettings {
  @PrimaryGeneratedColumn()
  settingId!: number;

  @Column({ name: 'userId', type: 'int', nullable: false, unique: true })
  userId!: number;

  // Task notifications
  @Column({ name: 'notifyTaskAssigned', type: 'boolean', default: true })
  notifyTaskAssigned: boolean = true;

  @Column({ name: 'notifyTaskComment', type: 'boolean', default: true })
  notifyTaskComment: boolean = true;

  @Column({ name: 'notifyTaskLike', type: 'boolean', default: true })
  notifyTaskLike: boolean = true;

  // Social notifications
  @Column({ name: 'notifyCommentReply', type: 'boolean', default: true })
  notifyCommentReply: boolean = true;

  @Column({ name: 'notifyCommentReaction', type: 'boolean', default: true })
  notifyCommentReaction: boolean = true;

  // System notifications
  @Column({ name: 'notifySystemAlert', type: 'boolean', default: true })
  notifySystemAlert: boolean = true;

  @Column({ name: 'notifyRoleChanged', type: 'boolean', default: true })
  notifyRoleChanged: boolean = true;

  // Delivery methods
  @Column({ name: 'emailEnabled', type: 'boolean', default: false })
  emailEnabled: boolean = false;

  @Column({ name: 'pushEnabled', type: 'boolean', default: true })
  pushEnabled: boolean = true;

  @CreateDateColumn({ name: 'createdAt', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updatedAt', type: 'timestamp' })
  updatedAt!: Date;

  // Relations
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;
}
