import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './User';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  notificationId!: number;

  @Column({ name: 'notificationType', type: 'varchar', length: 50, nullable: false })
  notificationType!: string;

  @Column({ name: 'actorUserId', type: 'int', nullable: true })
  actorUserId?: number;

  @Column({ name: 'entityType', type: 'varchar', length: 50, nullable: true })
  entityType?: string;

  @Column({ name: 'entityId', type: 'varchar', length: 100, nullable: true })
  entityId?: string;

  @Column({ name: 'title', type: 'varchar', length: 255, nullable: false })
  title!: string;

  @Column({ name: 'message', type: 'text', nullable: false })
  message!: string;

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

  // Relations
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'actorUserId' })
  actorUser?: User;
}
