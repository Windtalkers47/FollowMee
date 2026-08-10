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

  @Column({ name: 'notifyProfileChanged', type: 'boolean', default: true })
  notifyProfileChanged: boolean = true;

  // Delivery methods
  @Column({ name: 'emailEnabled', type: 'boolean', default: false })
  emailEnabled: boolean = false;

  @Column({ name: 'pushEnabled', type: 'boolean', default: true })
  pushEnabled: boolean = true;

  // U4-PREFERENCES: Do Not Disturb mode
  @Column({ name: 'doNotDisturbEnabled', type: 'boolean', default: false })
  doNotDisturbEnabled: boolean = false;

  // U4-PREFERENCES: Digest mode (none, hourly, daily)
  @Column({ name: 'digestMode', type: 'varchar', length: 20, default: 'none' })
  digestMode: 'none' | 'hourly' | 'daily' | 'weekly' = 'none';

  @Column({ name: 'digestDay', type: 'int', nullable: true })
  digestDay!: number | null;

  @Column({ name: 'digestTime', type: 'varchar', length: 5, default: '08:00' })
  digestTime: string = '08:00';

  @Column({ name: 'timezone', type: 'varchar', length: 60, default: 'Asia/Bangkok' })
  timezone: string = 'Asia/Bangkok';

  @Column({ name: 'lastDigestAt', type: 'datetime', nullable: true })
  lastDigestAt!: Date | null;

  // U4-PREFERENCES: Quiet hours
  @Column({ name: 'quietHoursStart', type: 'int', default: 22, nullable: true })
  quietHoursStart: number | null = 22; // 10 PM

  @Column({ name: 'quietHoursEnd', type: 'int', default: 7, nullable: true })
  quietHoursEnd: number | null = 7; // 7 AM

  // U4-PREFERENCES: Priority filtering (all, high, none)
  @Column({ name: 'priorityFilter', type: 'varchar', length: 20, default: 'all' })
  priorityFilter: 'all' | 'high' | 'none' = 'all';

  @CreateDateColumn({ name: 'createdAt', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updatedAt', type: 'timestamp' })
  updatedAt!: Date;

  // Relations
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;
}
