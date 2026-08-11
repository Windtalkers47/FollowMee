import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Notification Queue Entity
 * 
 * Stores queued notifications for aggregation in database.
 * This ensures notifications are not lost on server restart.
 */
@Entity('notification_queue')
@Index(['notificationType', 'entityType', 'entityId', 'recipientUserId'])
@Index(['createdAt'])
@Index(['status', 'nextAttemptAt', 'queueId'])
export class NotificationQueue {
  @PrimaryGeneratedColumn()
  queueId!: number;

  @Column({ name: 'deduplicationKey', type: 'varchar', length: 255, nullable: true, unique: true })
  deduplicationKey?: string;

  @Column({ name: 'notificationType', type: 'varchar', length: 50, nullable: false })
  notificationType!: string;

  @Column({ name: 'entityType', type: 'varchar', length: 50, nullable: false })
  entityType!: string;

  @Column({ name: 'entityId', type: 'varchar', length: 100, nullable: false })
  entityId!: string;

  @Column({ name: 'recipientUserId', type: 'int', nullable: false })
  recipientUserId!: number;

  @Column({ name: 'actorUserIds', type: 'text', nullable: false })
  actorUserIds!: string; // JSON string of number[]

  @Column({ name: 'title', type: 'varchar', length: 255, nullable: false })
  title!: string;

  @Column({ name: 'baseMessage', type: 'text', nullable: false })
  baseMessage!: string;

  @Column({ name: 'titleKey', type: 'varchar', length: 120, nullable: true })
  titleKey?: string;

  @Column({ name: 'messageKey', type: 'varchar', length: 120, nullable: true })
  messageKey?: string;

  @Column({ name: 'translationParams', type: 'json', nullable: true })
  translationParams?: Record<string, string | number>;

  @Column({ name: 'actionUrl', type: 'varchar', length: 500, nullable: true })
  actionUrl?: string;

  @Column({ name: 'imageUrl', type: 'varchar', length: 512, nullable: true })
  imageUrl?: string;

  @Column({ name: 'isSystem', type: 'boolean', default: false })
  isSystem: boolean = false;

  @Column({ name: 'isGlobal', type: 'boolean', default: false })
  isGlobal: boolean = false;

  @CreateDateColumn({ name: 'createdAt', type: 'timestamp' })
  createdAt!: Date;

  @Column({ name: 'groupActorUserIds', type: 'text', nullable: true })
  groupActorUserIds?: string; // JSON string of number[]

  @Column({ name: 'status', type: 'enum', enum: ['pending', 'processing', 'failed', 'dead'], default: 'pending' })
  status: 'pending' | 'processing' | 'failed' | 'dead' = 'pending';

  @Column({ name: 'attempts', type: 'int', default: 0 })
  attempts = 0;

  @Column({ name: 'nextAttemptAt', type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  nextAttemptAt!: Date;

  @Column({ name: 'lockedAt', type: 'datetime', nullable: true })
  lockedAt?: Date | null;

  @Column({ name: 'lockedBy', type: 'varchar', length: 100, nullable: true })
  lockedBy?: string | null;

  @Column({ name: 'lastError', type: 'varchar', length: 1000, nullable: true })
  lastError?: string | null;

  @Column({ name: 'deadAt', type: 'datetime', nullable: true })
  deadAt?: Date | null;

  @UpdateDateColumn({ name: 'updatedAt', type: 'timestamp', precision: 6 })
  updatedAt!: Date;

  /**
   * Get actor user IDs as array
   */
  getActorUserIds(): number[] {
    try {
      return JSON.parse(this.actorUserIds);
    } catch {
      return [];
    }
  }

  /**
   * Set actor user IDs from array
   */
  setActorUserIds(ids: number[]): void {
    this.actorUserIds = JSON.stringify(ids);
  }

  /**
   * Get group actor user IDs as array
   */
  getGroupActorUserIds(): number[] {
    try {
      return JSON.parse(this.groupActorUserIds || '[]');
    } catch {
      return [];
    }
  }

  /**
   * Set group actor user IDs from array
   */
  setGroupActorUserIds(ids: number[]): void {
    this.groupActorUserIds = JSON.stringify(ids);
  }
}
