import type { Task } from '../api/task.api';

export type TaskStatus = Task['status'];

export const taskTransitions: Record<TaskStatus, readonly TaskStatus[]> = {
  draft: ['todo', 'cancelled'],
  todo: ['in_progress', 'cancelled'],
  in_progress: ['review', 'cancelled'],
  review: ['done', 'todo', 'cancelled'],
  done: [],
  cancelled: [],
};

export const getAllowedTaskTransitions = (task: Pick<Task, 'status' | 'workflow'>): TaskStatus[] => {
  const fromApi = task.workflow?.allowedTransitions;
  return fromApi ? [...fromApi] : [...taskTransitions[task.status]];
};

export const getTaskStatusOptions = (task?: Pick<Task, 'status' | 'workflow'>): TaskStatus[] => {
  if (!task) return ['draft', 'todo'];
  return Array.from(new Set([task.status, ...getAllowedTaskTransitions(task)]));
};

export const isAllowedTaskTransition = (task: Pick<Task, 'status' | 'workflow'>, next: TaskStatus): boolean =>
  task.status === next || getAllowedTaskTransitions(task).includes(next);
