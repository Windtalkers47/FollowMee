import { IsNotEmpty, IsString, Length } from 'class-validator';
import { TaskImageResponseDto } from './task-image.dto';
import type { TaskFocusSummary } from '../utils/task-focus.util';
import type { TaskPriority, TaskScope } from '../types/organization.types';

export class TaskResponseDto {
  taskId!: string;
  title!: string;
  description?: string;
  assignedTo?: number;
  createdBy!: number;
  priority!: TaskPriority;
  version!: number;
  watcherIds!: number[];
  scope!: TaskScope;
  dueDate?: Date;
  startDate?: Date;
  endDate?: Date;
  status!: 'draft' | 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled';
  imageUrl?: string; // For backward compatibility - first image
  isActive!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
  duplicatedFromTaskId?: string | null;
  duplicatedFromTask?: { taskId: string; title: string } | null;
  templateId?: number | null;
  recurrenceRuleId?: number | null;
  scheduledFor?: Date | null;
  blockedReason?: string | null;
  blockedAt?: Date | null;
  blockedBy?: number | null;
  completedBy?: number | null;
  approvedBy?: number | null;
  checklist?: Array<{
    checklistItemId: number;
    label: string;
    isRequired: boolean;
    isCompleted: boolean;
    sortOrder: number;
    completedBy?: number | null;
    completedAt?: Date | null;
  }>;

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
    canEditMetadata: boolean;
    canReassign: boolean;
    canPublish: boolean;
    canStart: boolean;
    canApprove: boolean;
    canSubmitReview: boolean;
    canRequestChanges: boolean;
    canCancel: boolean;
    canOwnerOverride: boolean;
    canDuplicate: boolean;
    canManageChecklist: boolean;
    canToggleChecklist: boolean;
    canManageRecurrence: boolean;
    canSaveTemplate: boolean;
    canSetBlocked: boolean;
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
  statusCounts?: Record<string, number>;
  focus?: TaskFocusSummary;
  
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
    dueToday: number;
    dueSoon: number;
  };
  focus?: TaskFocusSummary;
  pageInfo!: { nextCursor?: string };
}
