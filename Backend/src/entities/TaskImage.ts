import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { User } from './User';

@Entity('task_images')
export class TaskImage {
  @PrimaryGeneratedColumn()
  imageId!: number;

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

  @CreateDateColumn({ name: 'createdAt' })
  createdAt!: Date;

  // Relations
  @ManyToOne('Task', 'images', { onDelete: 'CASCADE' })
  task!: any;

  @ManyToOne(() => User, user => user.taskImages)
  uploadedByUser!: User;
}
