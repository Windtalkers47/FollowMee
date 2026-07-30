import { Task } from '../entities/Task';
import { TaskApprovalError, TaskTransitionError } from '../errors/task-transition.error';

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
  task: Pick<Task, 'status' | 'createdBy'>,
  nextStatus: TaskStatus,
  userId: number,
): void => {
  if (task.status === nextStatus) return;
  if (!canTransitionTask(task, nextStatus)) {
    throw new TaskTransitionError(
      task.status as TaskStatus,
      nextStatus,
      getAllowedTaskTransitions(task.status as TaskStatus),
    );
  }
  if (nextStatus === 'done' && task.createdBy !== userId) {
    throw new TaskApprovalError();
  }
};

export const getAllowedTaskTransitions = (status: TaskStatus): TaskStatus[] => [...(transitions[status] || [])];

export interface TaskWorkflowCapabilities {
  currentStatus: TaskStatus;
  allowedTransitions: TaskStatus[];
  canEdit: boolean;
  canApprove: boolean;
  canSubmitReview: boolean;
  canRequestChanges: boolean;
  canCancel: boolean;
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
): TaskWorkflowCapabilities => {
  const status = task.status as TaskStatus;
  const isCreator = viewerUserId === task.createdBy;
  const isAssignee = viewerUserId === task.assignedTo;
  const allowedTransitions = getAllowedTaskTransitions(status).filter((nextStatus) => {
    if (status === 'review' && (nextStatus === 'done' || nextStatus === 'todo')) return isCreator;
    return isCreator || isAssignee;
  });
  const canSubmitReview = status === 'in_progress' && (isCreator || isAssignee);
  const canApprove = status === 'review' && isCreator;
  const createdByName = task.createdByUser
    ? `${task.createdByUser.userName} ${task.createdByUser.userLastName || ''}`.trim()
    : 'Task creator';
  const assignedToName = task.assignedToUser
    ? `${task.assignedToUser.userName} ${task.assignedToUser.userLastName || ''}`.trim()
    : 'Assignee';

  return {
    currentStatus: status,
    allowedTransitions,
    canEdit: (isCreator || isAssignee) && status !== 'done' && status !== 'cancelled',
    canApprove,
    canSubmitReview,
    canRequestChanges: canApprove,
    canCancel: (isCreator || isAssignee) && status !== 'done' && status !== 'cancelled',
    primaryAction: status === 'todo' && (isCreator || isAssignee)
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
