import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, OneToMany, RelationCount } from 'typeorm';
import { User } from './User';
import { Task } from './Task';
import { CommentReaction } from './CommentReaction';

@Entity('task_comments')
export class TaskComment {
  @PrimaryGeneratedColumn()
  commentId!: number;

  @Column({ name: 'taskId', type: 'varchar', length: 36, nullable: false })
  taskId!: string;

  @Column({ name: 'userId', type: 'int', nullable: false })
  userId!: number;

  @Column({ name: 'parentCommentId', type: 'int', nullable: true })
  parentCommentId?: number;

  @Column({ name: 'comment', type: 'text', nullable: false })
  comment!: string;

  @Column({ name: 'commentImageUrl', type: 'varchar', length: 512, nullable: true })
  commentImageUrl?: string;

  @Column({ name: 'isActive', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt!: Date;

  // Relations
  @ManyToOne(() => Task, task => task.comments)
  task!: Task;

  @ManyToOne(() => User, user => user.taskComments)
  user!: User;

  @ManyToOne(() => TaskComment, comment => comment.replies, { nullable: true })
  parentComment?: TaskComment;

  @OneToMany(() => TaskComment, comment => comment.parentComment)
  replies?: TaskComment[];

  @OneToMany(() => CommentReaction, reaction => reaction.comment)
  reactions?: CommentReaction[];

  @RelationCount((comment: TaskComment) => comment.replies)
  repliesCount?: number;

  @RelationCount((comment: TaskComment) => comment.reactions)
  reactionsCount?: number;
}
