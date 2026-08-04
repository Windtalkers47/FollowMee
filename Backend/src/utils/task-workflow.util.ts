import { Task } from '../entities/Task';
import { TaskActionError, TaskApprovalError, TaskTransitionError } from '../errors/task-transition.error';

export type TaskStatus = 'draft' | 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled';

const transitions: Record<TaskStatus, readonly TaskStatus[]> = {
  draft: ['todo', 'cancelled'],
  todo: ['in_progress', 'cancelled'],
  in_progress: ['review', 'cancelled'],
  review: ['done', 'todo', 'cancelled'],
  done: [],
  cancelled: [],
};

export const canTransitionTask = (task: Pick<Task, 'status'>, nextStatus: TaskStatus): boolean =>
  transitions[task.status as TaskStatus]?.includes(nextStatus) ?? false;

export const assertTaskTransition = (
  task: Pick<Task, 'status' | 'createdBy' | 'assignedTo'>,
  nextStatus: TaskStatus,
  userId: number,
  canManage = false,
): void => {
  if (task.status === nextStatus) return;
  if (!canTransitionTask(task, nextStatus)) {
    throw new TaskTransitionError(
      task.status as TaskStatus,
      nextStatus,
      getAllowedTaskTransitions(task.status as TaskStatus),
    );
  }
  if (nextStatus === 'done' && task.createdBy !== userId && !canManage) {
    throw new TaskApprovalError();
  }
  if ((nextStatus === 'todo' || nextStatus === 'cancelled') && task.createdBy !== userId && !canManage) {
    throw new TaskActionError('Only the task creator can publish, return, or cancel this task', 'manage_task', 403, task.status as TaskStatus);
  }
  if ((nextStatus === 'in_progress' || nextStatus === 'review') && task.assignedTo !== userId) {
    throw new TaskActionError('Only the assignee can start or submit this task', 'execute_task', 403, task.status as TaskStatus);
  }
};

export const getAllowedTaskTransitions = (status: TaskStatus): TaskStatus[] => [...(transitions[status] || [])];

export interface TaskWorkflowCapabilities {
  currentStatus: TaskStatus;
  allowedTransitions: TaskStatus[];
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
  primaryAction: 'start' | 'submit_review' | 'review' | 'view';
  nextActor?: {
    userId: number;
    displayName: string;
    reason: 'assigned_work' | 'approval_required';
  };
}

export const getTaskWorkflowCapabilities = (
  task: Pick<Task, 'status' | 'createdBy' | 'assignedTo'> & {
    createdByUser?: { userName: string; userLastName?: string };
    assignedToUser?: { userName: string; userLastName?: string } | null;
  },
  viewerUserId?: number,
  canOwnerOverride = false,
): TaskWorkflowCapabilities => {
  const status = task.status as TaskStatus;
  const isCreator = viewerUserId === task.createdBy;
  const isAssignee = viewerUserId === task.assignedTo;
  const allowedTransitions = getAllowedTaskTransitions(status).filter((nextStatus) => {
    if (status === 'review' && nextStatus === 'todo') return false;
    if (nextStatus === 'cancelled' || status === 'draft') return isCreator || canOwnerOverride;
    if (status === 'review' && nextStatus === 'done') return isCreator || canOwnerOverride;
    if (nextStatus === 'in_progress' || nextStatus === 'review') return isAssignee;
    return false;
  });
  const canSubmitReview = status === 'in_progress' && isAssignee;
  const canApprove = status === 'review' && (isCreator || canOwnerOverride);
  const createdByName = task.createdByUser
    ? `${task.createdByUser.userName} ${task.createdByUser.userLastName || ''}`.trim()
    : 'Task creator';
  const assignedToName = task.assignedToUser
    ? `${task.assignedToUser.userName} ${task.assignedToUser.userLastName || ''}`.trim()
    : 'Assignee';

  return {
    currentStatus: status,
    allowedTransitions,
    canEdit: (isCreator || canOwnerOverride) && status !== 'done' && status !== 'cancelled',
    canEditMetadata: (isCreator || canOwnerOverride) && status !== 'done' && status !== 'cancelled',
    canReassign: (isCreator || canOwnerOverride) && status !== 'done' && status !== 'cancelled',
    canPublish: (isCreator || canOwnerOverride) && status === 'draft' && Boolean(task.assignedTo),
    canStart: isAssignee && status === 'todo',
    canApprove,
    canSubmitReview,
    canRequestChanges: canApprove,
    canCancel: (isCreator || canOwnerOverride) && status !== 'done' && status !== 'cancelled',
    canOwnerOverride,
    primaryAction: status === 'todo' && isAssignee
      ? 'start'
      : canSubmitReview
        ? 'submit_review'
        : canApprove
          ? 'review'
          : 'view',
    nextActor: status === 'review'
      ? { userId: task.createdBy, displayName: createdByName, reason: 'approval_required' }
      : task.assignedTo
        ? { userId: task.assignedTo, displayName: assignedToName, reason: 'assigned_work' }
        : undefined,
  };
};
