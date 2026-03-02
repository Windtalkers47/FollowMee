import { IsNotEmpty, IsString, Length } from 'class-validator';

export class TaskResponseDto {
  taskId!: string;
  title!: string;
  description?: string;
  assignedTo?: number;
  createdBy!: number;
  dueDate?: Date;
  status!: 'draft' | 'upcoming' | 'past' | 'done';
  imageUrl?: string;
  isActive!: boolean;
  createdAt!: Date;
  updatedAt!: Date;

  // Relations
  assignedToUser?: {
    userId: number;
    userName: string;
    userLastName: string;
  };
  createdByUser?: {
    userId: number;
    userName: string;
    userLastName: string;
  };
  _count?: {
    likes: number;
    love: number;
    laugh: number;
    angry: number;
    comments: number;
  };
}

export class TaskListResponseDto {
  tasks!: TaskResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}
