import { IsNotEmpty, IsString, Length, IsOptional } from 'class-validator';

export class CreateTaskCommentDto {
  @IsNotEmpty()
  @IsString()
  @Length(1, 1000)
  comment!: string;

  @IsOptional()
  @IsString()
  commentImageUrl?: string;
}

export class UpdateTaskCommentDto {
  @IsNotEmpty()
  @IsString()
  @Length(1, 1000)
  comment!: string;
}

export class TaskCommentResponseDto {
  commentId!: number;
  taskId!: string;
  userId!: number;
  comment!: string;
  commentImageUrl?: string;
  createdAt!: Date;

  user?: {
    userId: number;
    userName: string;
    userLastName: string;
    userImageUrl?: string;
  };
}
