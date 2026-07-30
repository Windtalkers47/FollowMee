import type { TaskStatus } from '../utils/task-workflow.util';

export class TaskTransitionError extends Error {
  readonly statusCode = 409;
  readonly code = 'INVALID_TASK_TRANSITION' as const;
  readonly currentStatus: TaskStatus;
  readonly requestedStatus: TaskStatus;
  readonly allowedTransitions: TaskStatus[];

  constructor(currentStatus: TaskStatus, requestedStatus: TaskStatus, allowedTransitions: TaskStatus[]) {
    super(`Invalid task transition from ${currentStatus} to ${requestedStatus}`);
    this.name = 'TaskTransitionError';
    this.currentStatus = currentStatus;
    this.requestedStatus = requestedStatus;
    this.allowedTransitions = allowedTransitions;
  }
}

export class TaskApprovalError extends Error {
  readonly statusCode = 403;
  readonly code = 'TASK_APPROVAL_FORBIDDEN' as const;

  constructor() {
    super('Only the task creator can approve a task that is in review');
    this.name = 'TaskApprovalError';
  }
}

export class TaskActionError extends Error {
  readonly statusCode: 403 | 409;
  readonly code: 'TASK_ACTION_FORBIDDEN' | 'INVALID_TASK_ACTION';
  readonly currentStatus?: TaskStatus;
  readonly action: string;

  constructor(
    message: string,
    action: string,
    statusCode: 403 | 409,
    currentStatus?: TaskStatus,
  ) {
    super(message);
    this.name = 'TaskActionError';
    this.statusCode = statusCode;
    this.code = statusCode === 403 ? 'TASK_ACTION_FORBIDDEN' : 'INVALID_TASK_ACTION';
    this.currentStatus = currentStatus;
    this.action = action;
  }
}
