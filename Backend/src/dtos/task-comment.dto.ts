import { IsNotEmpty, IsString, Length, IsOptional, IsNumber } from 'class-validator';

export class CreateTaskCommentDto {
  @IsNotEmpty()
  @IsString()
  @Length(1, 1000)
  comment!: string;

  @IsOptional()
  @IsNumber()
  parentCommentId?: number;

  @IsOptional()
  @IsString()
  commentImageUrl?: string;
}

export class UpdateTaskCommentDto {
  @IsNotEmpty()
  @IsString()
  @Length(1, 1000)
  comment!: string;

  @IsOptional()
  @IsString()
  commentImageUrl?: string;
}

export class TaskCommentResponseDto {
  commentId!: number;
  taskId!: string;
  userId!: number;
  comment!: string;
  commentImageUrl?: string;
  parentCommentId?: number;
  createdAt!: Date;
  isActive!: boolean;

  user?: {
    userId: number;
    userName: string;
    userLastName: string;
    userImageUrl?: string;
  };

  replies?: TaskCommentResponseDto[];
  reactions?: CommentReactionResponseDto[];
  _count?: {
    replies: number;
    reactions: number;
  };
}

export class CreateCommentReactionDto {
  @IsNotEmpty()
  @IsString()
  reactionType!: 'like' | 'dislike' | 'love' | 'laugh' | 'angry';
}

export class CommentReactionResponseDto {
  reactionId!: number;
  commentId!: number;
  userId!: number;
  reactionType!: 'like' | 'dislike' | 'love' | 'laugh' | 'angry';
  createdAt!: Date;

  user?: {
    userId: number;
    userName: string;
    userLastName: string;
  };
}
