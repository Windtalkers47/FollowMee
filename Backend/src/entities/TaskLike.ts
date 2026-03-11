import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { User } from './User';
import { Task } from './Task';

@Entity('task_likes')
export class TaskLike {
  @PrimaryGeneratedColumn()
  likeId!: number;

  @Column({ name: 'taskId', type: 'varchar', length: 36, nullable: false })
  taskId!: string;

  @Column({ name: 'userId', type: 'int', nullable: false })
  userId!: number;

  @Column({
    name: 'likeType',
    type: 'enum',
    enum: ['like', 'dislike', 'love', 'laugh', 'angry'],
    nullable: false
  })
  likeType!: 'like' | 'dislike' | 'love' | 'laugh' | 'angry';

  @CreateDateColumn({ name: 'createdAt' })
  createdAt!: Date;

  // Relations
  @ManyToOne(() => Task, task => task.likes)
  task!: Task;

  @ManyToOne(() => User, user => user.taskLikes)
  user!: User;
}
