import { describe, expect, it } from 'vitest';
import type { Task } from '../../api/task.api';
import {
  scheduleActiveFilterCount,
  scheduleBulkActions,
  scheduleTaskFormPayload,
  scheduleTaskQueryKey,
  scheduleTaskRequest,
  type ScheduleQueryState,
} from '../../pages/Schedule/schedule.contracts';

const queryState: ScheduleQueryState = {
  searchQuery: 'launch', status: 'review', dueFilter: 'soon', effectiveStatus: 'review',
  effectiveDateFilter: 'soon', sortBy: 'due_asc', page: 3, creatorOnlySelection: true, assigneeId: 17,
};

const task = (overrides: Partial<Task> = {}) => ({
  taskId: 'task-1', title: 'Task', createdBy: 7, priority: 'medium', version: 1, watcherIds: [],
  scope: 'organization', status: 'todo', isActive: true, createdAt: '2026-08-14T00:00:00.000Z',
  updatedAt: '2026-08-14T00:00:00.000Z', createdByUser: { userId: 7, userName: 'A', userLastName: 'B' },
  workflow: {
    currentStatus: 'todo', allowedTransitions: ['in_progress', 'cancelled'], canEdit: true, canEditMetadata: true,
    canReassign: true, canPublish: false, canStart: true, canApprove: false, canSubmitReview: false,
    canRequestChanges: false, canCancel: true, canOwnerOverride: false, canDuplicate: true,
    canManageChecklist: true, canToggleChecklist: true, canManageRecurrence: true, canSaveTemplate: true,
    canSetBlocked: true,
  },
  ...overrides,
}) as Task;

describe('Schedule extraction contracts', () => {
  it('keeps the existing task query key and REST request parameter names', () => {
    expect(scheduleTaskQueryKey(queryState)).toEqual(['tasks', {
      search: 'launch', status: 'review', dateFilter: 'soon', sortBy: 'due_asc', page: 3,
      creatorOnlySelection: true, assigneeId: 17,
    }]);
    expect(scheduleTaskRequest(queryState, 7)).toEqual({
      search: 'launch', status: 'review', dueFilter: 'soon', sort: 'due_asc', page: 3, limit: 24,
      createdBy: 7, assignedTo: 17,
    });
  });

  it('preserves undefined REST filters and the visible filter count defaults', () => {
    expect(scheduleTaskRequest({ ...queryState, searchQuery: '', status: undefined, dueFilter: undefined, creatorOnlySelection: false, assigneeId: 'all' }, 7))
      .toMatchObject({ search: undefined, status: undefined, dueFilter: undefined, createdBy: undefined, assignedTo: undefined });
    expect(scheduleActiveFilterCount('all', 'updated_desc', 'all')).toBe(0);
    expect(scheduleActiveFilterCount('today', 'title_asc', 17)).toBe(3);
  });

  it('keeps bulk actions gated by ownership, workflow capability, and allowed transition', () => {
    expect(scheduleBulkActions([task()], 7)).toEqual(['delete', 'start', 'in_progress', 'cancelled']);
    expect(scheduleBulkActions([task({ createdBy: 8 })], 7)).toEqual(['start', 'in_progress', 'cancelled']);
    expect(scheduleBulkActions([task({ workflow: { ...task().workflow!, allowedTransitions: [] } })], 7)).toEqual(['delete']);
  });

  it('normalizes dialog dates and draft/publish intent without leaking form-only fields', () => {
    const start = new Date('2026-08-15T00:00:00.000Z');
    const end = new Date('2026-08-16T00:00:00.000Z');
    const payload = scheduleTaskFormPayload({
      title: 'Launch', status: 'draft', dueDateRange: [start, end],
      createdAt: 'old', updatedAt: 'old', dueDate: new Date('2026-08-20T00:00:00.000Z'),
    }, 'publish');
    expect(payload).toMatchObject({ title: 'Launch', status: 'todo', startDate: start.toISOString(), endDate: end.toISOString(), dueDate: null });
    expect(payload).not.toHaveProperty('dueDateRange');
    expect(payload).not.toHaveProperty('createdAt');
    expect(payload).not.toHaveProperty('updatedAt');
  });
});
