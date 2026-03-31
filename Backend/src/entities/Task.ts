import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from './User';
import { TaskLike } from './TaskLike';
import { TaskComment } from './TaskComment';
import { TaskImage } from './TaskImage';

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

  @Column({ name: 'dueDate', type: 'datetime', nullable: true })
  dueDate?: Date;

  @Column({ name: 'startDate', type: 'datetime', nullable: true })
  startDate?: Date;

  @Column({ name: 'endDate', type: 'datetime', nullable: true })
  endDate?: Date;

  @Column({
    name: 'status',
    type: 'enum',
    enum: ['draft', 'upcoming', 'past', 'done'],
    default: 'draft'
  })
  status: 'draft' | 'upcoming' | 'past' | 'done' = 'draft';

  @Column({ name: 'isActive', type: 'boolean', default: true })
  isActive: boolean = true;

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
