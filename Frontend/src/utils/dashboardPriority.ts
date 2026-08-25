import type { Task } from '../api/task.api';

export type DashboardPriorityKind = 'overdue' | 'approval' | 'dueToday' | 'blocked' | 'dueSoon';

const endOfToday = (now: Date) => new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();

export const getDashboardPriorityKind = (task: Task, now = new Date()): DashboardPriorityKind => {
  const dueValue = task.endDate || task.dueDate;
  const dueTime = dueValue ? new Date(dueValue).getTime() : Number.POSITIVE_INFINITY;

  if (dueTime < now.getTime()) return 'overdue';
  if (task.attentionReason === 'approval_required') return 'approval';
  if (dueTime <= endOfToday(now)) return 'dueToday';
  if (task.blockedAt) return 'blocked';
  return 'dueSoon';
};

export const prioritizeDashboardTasks = (tasks: Task[], now = new Date(), limit = 5) =>
  [...tasks]
    .sort((left, right) => {
      const order: DashboardPriorityKind[] = ['overdue', 'approval', 'dueToday', 'blocked', 'dueSoon'];
      const priorityDifference = order.indexOf(getDashboardPriorityKind(left, now)) - order.indexOf(getDashboardPriorityKind(right, now));
      if (priorityDifference) return priorityDifference;

      const leftDue = new Date(left.endDate || left.dueDate || '9999-12-31').getTime();
      const rightDue = new Date(right.endDate || right.dueDate || '9999-12-31').getTime();
      return leftDue - rightDue;
    })
    .slice(0, limit);
