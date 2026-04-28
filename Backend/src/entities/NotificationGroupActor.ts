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

@Entity('notification_group_actors')
@Index(['notificationId'])
export class NotificationGroupActor {
  @PrimaryGeneratedColumn()
  groupActorId!: number;

  @Column({ name: 'notificationId', type: 'bigint', nullable: false })
  notificationId!: number;

  @Column({ name: 'actorUserId', type: 'int', nullable: false })
  actorUserId!: number;

  @CreateDateColumn({ name: 'createdAt', type: 'timestamp' })
  createdAt!: Date;

  // Relations
  @ManyToOne(() => Notification, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'notificationId' })
  notification!: Notification;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'actorUserId' })
  actorUser!: User;
}
