import { Task } from '../api/task.api';

export type TaskAction =
  | 'view'
  | 'edit'
  | 'delete'
  | 'cancel'
  | 'start'
  | 'submit'
  | 'approve'
  | 'reject'
  | 'undo';

export interface TaskPermissionContext {
  userId: number;
  task: Task;
}

export interface TaskPermissions {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canCancel: boolean;
  canStart: boolean;
  canSubmit: boolean;
  canApprove: boolean;
  canReject: boolean;
  canUndo: boolean;
}

/**
 * Helper function to check if user has any actionable permission on a task
 * Useful for determining if menu should be shown
 * Excludes canView since it's always true and not an actionable permission
 */
export const hasAnyPermission = (permissions: TaskPermissions): boolean => {
  const {
    canEdit,
    canDelete,
    canCancel,
    canStart,
    canSubmit,
    canApprove,
    canReject,
    canUndo,
  } = permissions;

  return (
    canEdit ||
    canDelete ||
    canCancel ||
    canStart ||
    canSubmit ||
    canApprove ||
    canReject ||
    canUndo
  );
};

/**
 * Centralized permission logic for task actions
 * This is the single source of truth for determining what actions a user can perform on a task
 */
export const getTaskPermissions = ({
  userId,
  task,
}: TaskPermissionContext): TaskPermissions => {
  // Type-safe comparison to handle string vs number mismatches
  const isOwner = Number(task.createdBy) === Number(userId);
  const isAssignee = task.assignedTo ? Number(task.assignedTo) === Number(userId) : false;

  const isTodo = task.status === 'todo';
  const isInProgress = task.status === 'in_progress';
  const isReview = task.status === 'review';
  const isDone = task.status === 'done';

  return {
    canView: true,

    canEdit: isOwner || isAssignee,

    canDelete: isOwner || isAssignee,

    canCancel: (isOwner || isAssignee) && !isDone && task.status !== 'cancelled',

    canStart:
      isAssignee && isTodo,

    canSubmit:
      isAssignee && isInProgress,

    canApprove:
      isOwner && isReview,

    canReject:
      isOwner && isReview,

    canUndo: false,
  };
};

/**
 * Debug helper to log permissions for a task
 * Useful for troubleshooting permission issues
 */
export const debugTaskPermissions = (userId: number, task: Task): void => {
  const permissions = getTaskPermissions({ userId, task });
};
