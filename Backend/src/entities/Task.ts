import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  VersionColumn,
} from 'typeorm';
import { User } from './User';
import { TaskLike } from './TaskLike';
import { TaskComment } from './TaskComment';
import { TaskImage } from './TaskImage';
import type { TaskPriority } from '../types/organization.types';

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn('uuid', { name: 'taskId' })
  taskId!: string;

  @Column({ name: 'title', type: 'varchar', length: 255, nullable: false })
  title!: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'assignedTo', type: 'int', nullable: true })
  assignedTo?: number;

  @Column({ name: 'createdBy', type: 'int', nullable: false })
  createdBy!: number;

  @Column({ type: 'enum', enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' })
  priority: TaskPriority = 'normal';

  @VersionColumn({ default: 1 })
  version!: number;

  @Column({ name: 'dueDate', type: 'datetime', nullable: true })
  dueDate?: Date;

  @Column({ name: 'startDate', type: 'datetime', nullable: true })
  startDate?: Date;

  @Column({ name: 'endDate', type: 'datetime', nullable: true })
  endDate?: Date;

  @Column({
    name: 'status',
    type: 'enum',
    enum: ['draft', 'todo', 'in_progress', 'review', 'done', 'cancelled'],
    default: 'draft'
  })
  status: 'draft' | 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled' = 'draft';

  @Column({ name: 'imageUrl', type: 'varchar', length: 512, nullable: true })
  imageUrl?: string;

  @Column({ name: 'isActive', type: 'boolean', default: true })
  isActive: boolean = true;

  @Column({ name: 'deletedAt', type: 'datetime', nullable: true })
  deletedAt?: Date;

  @Column({ name: 'completedAt', type: 'datetime', nullable: true })
  completedAt?: Date;

  @Column({ name: 'completionScore', type: 'int', default: 0 })
  completionScore: number = 0;

  @Column({ name: 'reopenedCount', type: 'int', default: 0 })
  reopenedCount: number = 0;

  @Column({ name: 'duplicatedFromTaskId', type: 'char', length: 36, nullable: true })
  duplicatedFromTaskId!: string | null;

  @Column({ name: 'templateId', type: 'bigint', nullable: true })
  templateId!: number | null;

  @Column({ name: 'recurrenceRuleId', type: 'bigint', nullable: true })
  recurrenceRuleId!: number | null;

  @Column({ name: 'scheduledFor', type: 'datetime', nullable: true })
  scheduledFor!: Date | null;

  @Column({ name: 'occurrenceKey', type: 'varchar', length: 180, nullable: true })
  occurrenceKey!: string | null;

  @Column({ name: 'blockedReason', type: 'varchar', length: 500, nullable: true })
  blockedReason!: string | null;

  @Column({ name: 'blockedAt', type: 'datetime', nullable: true })
  blockedAt!: Date | null;

  @Column({ name: 'blockedBy', type: 'int', nullable: true })
  blockedBy!: number | null;

  @Column({ name: 'completedBy', type: 'int', nullable: true })
  completedBy!: number | null;

  @Column({ name: 'approvedBy', type: 'int', nullable: true })
  approvedBy!: number | null;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt!: Date;

  // Relations
  @ManyToOne(() => User, user => user.assignedTasks, { nullable: true })
  @JoinColumn({ name: 'assignedTo' })
  assignedToUser?: User;

  @ManyToOne(() => User, user => user.createdTasks)
  @JoinColumn({ name: 'createdBy' })
  createdByUser!: User;

  @OneToMany(() => TaskLike, like => like.task)
  likes!: TaskLike[];

  @OneToMany(() => TaskComment, comment => comment.task)
  comments!: TaskComment[];

  @OneToMany(() => TaskImage, image => image.task)
  images!: TaskImage[];
}
