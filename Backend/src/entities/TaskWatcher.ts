import { CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Task } from './Task';
import { User } from './User';

@Entity('task_watchers')
export class TaskWatcher {
  @PrimaryColumn('varchar', { length: 36 }) taskId!: string;
  @PrimaryColumn('int') userId!: number;
  @CreateDateColumn({ type: 'timestamp' }) createdAt!: Date;
  @ManyToOne(() => Task, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'taskId' }) task!: Task;
  @ManyToOne(() => User, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'userId' }) user!: User;
}
