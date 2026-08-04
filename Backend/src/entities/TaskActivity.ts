import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Task } from './Task';
import { User } from './User';

@Entity('task_activities')
export class TaskActivity {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' }) activityId!: string;
  @Column('varchar', { length: 36 }) taskId!: string;
  @Column('int', { nullable: true }) actorUserId!: number | null;
  @Column('varchar', { length: 50 }) action!: string;
  @Column('json', { nullable: true }) metadata!: Record<string, unknown> | null;
  @CreateDateColumn({ type: 'timestamp' }) createdAt!: Date;
  @ManyToOne(() => Task, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'taskId' }) task!: Task;
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true }) @JoinColumn({ name: 'actorUserId' }) actor!: User | null;
}
