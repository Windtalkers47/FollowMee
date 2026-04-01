import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { User } from './User';
import { TaskComment } from './TaskComment';

@Entity('comment_reactions')
@Unique(['commentId', 'userId', 'reactionType'])
export class CommentReaction {
  @PrimaryGeneratedColumn()
  reactionId!: number;

  @Column({ name: 'commentId', type: 'int', nullable: false })
  commentId!: number;

  @Column({ name: 'userId', type: 'int', nullable: false })
  userId!: number;

  @Column({
    name: 'reactionType',
    type: 'enum',
    enum: ['like', 'love', 'laugh', 'angry', 'wow', 'sad'],
    nullable: false
  })
  reactionType!: 'like' | 'love' | 'laugh' | 'angry' | 'wow' | 'sad';

  @CreateDateColumn({ name: 'createdAt' })
  createdAt!: Date;

  // Relations
  @ManyToOne(() => TaskComment, comment => comment.reactions)
  @JoinColumn({ name: 'commentId' })
  comment!: TaskComment;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user!: User;
}
