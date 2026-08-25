import { describe, expect, it } from 'vitest';
import type { Task } from '../../api/task.api';
import { getDashboardPriorityKind, prioritizeDashboardTasks } from '../../utils/dashboardPriority';

const task = (taskId: string, overrides: Partial<Task> = {}): Task => ({
  taskId, title: taskId, createdBy: 1, priority: 'medium', version: 1, watcherIds: [], scope: 'personal', status: 'todo', isActive: true,
  createdAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-01T00:00:00.000Z',
  createdByUser: { userId: 1, userName: 'A', userLastName: 'B' }, ...overrides,
});

describe('dashboard priority', () => {
  const now = new Date('2026-08-14T10:00:00.000Z');

  it('uses the product priority order and due date as a tie breaker', () => {
    const items = [
      task('soon', { dueDate: '2026-08-16T10:00:00.000Z' }),
      task('blocked', { blockedAt: '2026-08-14T08:00:00.000Z' }),
      task('today', { dueDate: '2026-08-14T12:00:00.000Z' }),
      task('approval', { attentionReason: 'approval_required' }),
      task('overdue-later', { dueDate: '2026-08-14T09:00:00.000Z' }),
      task('overdue-earlier', { dueDate: '2026-08-13T09:00:00.000Z' }),
    ];

    expect(prioritizeDashboardTasks(items, now).map((item) => item.taskId)).toEqual([
      'overdue-earlier', 'overdue-later', 'approval', 'today', 'blocked',
    ]);
  });

  it('keeps an approval without a due date ahead of blocked work', () => {
    expect(getDashboardPriorityKind(task('approval', { attentionReason: 'approval_required' }), now)).toBe('approval');
  });
});
