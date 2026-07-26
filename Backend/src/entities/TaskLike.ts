import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { User } from './User';
import { Task } from './Task';

@Entity('task_likes')
@Unique(['taskId', 'userId'])
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
    enum: ['like', 'love', 'laugh', 'angry', 'wow', 'sad'],
    nullable: false
  })
  likeType!: 'like' | 'love' | 'laugh' | 'angry' | 'wow' | 'sad';

  @CreateDateColumn({ name: 'createdAt' })
  createdAt!: Date;

  // Relations
  @ManyToOne(() => Task, task => task.likes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'taskId' })
  task!: Task;

  @ManyToOne(() => User, user => user.taskLikes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;
}
