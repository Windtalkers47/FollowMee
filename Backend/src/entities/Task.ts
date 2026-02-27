import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany } from 'typeorm';
import { User } from './User';
import { TaskLike } from './TaskLike';
import { TaskComment } from './TaskComment';

@Entity('tasks')
export class Task {
  @PrimaryColumn({ name: 'taskId', type: 'varchar', length: 36 })
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

  @Column({
    name: 'status',
    type: 'enum',
    enum: ['draft', 'upcoming', 'past', 'done'],
    default: 'draft'
  })
  status: 'draft' | 'upcoming' | 'past' | 'done' = 'draft';

  @Column({ name: 'imageUrl', type: 'varchar', length: 512, nullable: true })
  imageUrl?: string;

  @Column({ name: 'isActive', type: 'boolean', default: true })
  isActive: boolean = true;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt!: Date;

  // Relations
  @ManyToOne(() => User, user => user.assignedTasks, { nullable: true })
  assignedToUser?: User;

  @ManyToOne(() => User, user => user.createdTasks)
  createdByUser!: User;

  @OneToMany(() => TaskLike, like => like.task)
  likes!: TaskLike[];

  @OneToMany(() => TaskComment, comment => comment.task)
  comments!: TaskComment[];
}
