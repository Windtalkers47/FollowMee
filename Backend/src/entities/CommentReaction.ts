import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { User } from './User';
import { TaskComment } from './TaskComment';

@Entity('comment_reactions')
export class CommentReaction {
  @PrimaryGeneratedColumn()
  reactionId!: number;

  @Column({ name: 'commentId', type: 'int', nullable: false })
  commentId!: number;

  @Column({ name: 'userId', type: 'int', nullable: false })
  userId!: number;

  @Column({ name: 'reactionType', type: 'varchar', length: 20, nullable: false })
  reactionType!: 'like' | 'dislike' | 'love' | 'laugh' | 'angry';

  @CreateDateColumn({ name: 'createdAt' })
  createdAt!: Date;

  // Relations
  @ManyToOne(() => TaskComment, comment => comment.reactions)
  comment!: TaskComment;

  @ManyToOne(() => User)
  user!: User;
}
