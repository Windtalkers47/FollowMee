import { IsNotEmpty, IsString, Length } from 'class-validator';
import { TaskImageResponseDto } from './task-image.dto';

export class TaskResponseDto {
  taskId!: string;
  title!: string;
  description?: string;
  assignedTo?: number;
  createdBy!: number;
  dueDate?: Date;
  status!: 'draft' | 'upcoming' | 'past' | 'done';
  imageUrl?: string; // For backward compatibility - first image
  isActive!: boolean;
  createdAt!: Date;
  updatedAt!: Date;

  // Relations
  images?: TaskImageResponseDto[];
  assignedToUser?: {
    userId: number;
    userName: string;
    userLastName: string;
    userImageUrl?: string;
  };
  createdByUser?: {
    userId: number;
    userName: string;
    userLastName: string;
    userImageUrl?: string;
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
