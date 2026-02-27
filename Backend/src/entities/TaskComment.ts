import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { User } from './User';
import { Task } from './Task';

@Entity('task_comments')
export class TaskComment {
  @PrimaryGeneratedColumn()
  commentId!: number;

  @Column({ name: 'taskId', type: 'varchar', length: 36, nullable: false })
  taskId!: string;

  @Column({ name: 'userId', type: 'int', nullable: false })
  userId!: number;

  @Column({ name: 'comment', type: 'text', nullable: false })
  comment!: string;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt!: Date;

  // Relations
  @ManyToOne(() => Task, task => task.comments)
  task!: Task;

  @ManyToOne(() => User, user => user.taskComments)
  user!: User;
}
