import { IsNotEmpty, IsString, Length } from 'class-validator';
import { TaskImageResponseDto } from './task-image.dto';

export class TaskResponseDto {
  taskId!: string;
  title!: string;
  description?: string;
  assignedTo?: number;
  createdBy!: number;
  dueDate?: Date;
  startDate?: Date;
  endDate?: Date;
  status!: 'draft' | 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled';
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
    wow?: number;
    sad?: number;
    userLike?: 'like' | 'love' | 'laugh' | 'angry' | 'wow' | 'sad';
  };
  workflow?: {
    currentStatus: 'draft' | 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled';
    allowedTransitions: Array<'draft' | 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled'>;
    canEdit: boolean;
    canApprove: boolean;
    canSubmitReview: boolean;
    canRequestChanges: boolean;
    canCancel: boolean;
    primaryAction?: 'start' | 'submit_review' | 'review' | 'view';
    nextActor?: {
      userId: number;
      displayName: string;
      reason: 'assigned_work' | 'approval_required';
    };
  };
  attentionReason?: 'assigned' | 'approval_required';
}

export class TaskListResponseDto {
  tasks!: TaskResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
  
  // Performance statistics
  topPerformers?: {
    userId: number;
    userName: string;
    userLastName: string;
    completedTasks: number;
  }[];
}

export class MyWorkResponseDto {
  items!: TaskResponseDto[];
  counts!: {
    todo: number;
    inProgress: number;
    review: number;
    approvalRequired: number;
    overdue: number;
  };
  pageInfo!: { nextCursor?: string };
}
