import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './User';
import { Task } from './Task';

@Entity('task_images')
export class TaskImage {
  @PrimaryGeneratedColumn()
  imageId!: number;

  @Column({ name: 'copiedFromImageId', type: 'int', nullable: true })
  copiedFromImageId?: number | null;

  @Column({ name: 'taskId', type: 'varchar', length: 36 })
  taskId!: string;

  @Column({ name: 'imageUrl', type: 'varchar', length: 512 })
  imageUrl!: string;

  @Column({ name: 'imageOrder', type: 'int', default: 0 })
  imageOrder: number = 0;

  @Column({ name: 'uploadedBy', type: 'int' })
  uploadedBy!: number;

  @Column({ name: 'isActive', type: 'boolean', default: true })
  isActive: boolean = true;

  @Column({ name: 'deletedAt', type: 'datetime', nullable: true })
  deletedAt?: Date;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt!: Date;

  // Relations
  @ManyToOne(() => Task, task => task.images, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'taskId' })
  task!: Task;

  @ManyToOne(() => User, user => user.taskImages)
  @JoinColumn({ name: 'uploadedBy' })
  uploadedByUser!: User;
}
