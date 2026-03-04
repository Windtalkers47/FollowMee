import { IsNotEmpty, IsEnum } from 'class-validator';

export class CreateTaskLikeDto {
  @IsNotEmpty()
  @IsEnum(['like', 'love', 'laugh', 'angry'])
  likeType!: 'like' | 'love' | 'laugh' | 'angry';
}

export class UpdateTaskLikeDto {
  @IsNotEmpty()
  @IsEnum(['like', 'love', 'laugh', 'angry'])
  likeType!: 'like' | 'love' | 'laugh' | 'angry';
}

export class TaskLikeResponseDto {
  likeId!: number;
  taskId!: string;
  userId!: number;
  likeType!: 'like' | 'love' | 'laugh' | 'angry';
  createdAt!: Date;

  user!: {
    userId: number;
    userName: string;
    userLastName: string;
    userImageUrl?: string;
  };
}

export class TaskLikeSummaryDto {
  like: number = 0;
  love: number = 0;
  laugh: number = 0;
  angry: number = 0;
  total: number = 0;
  userLike?: 'like' | 'love' | 'laugh' | 'angry';
}
