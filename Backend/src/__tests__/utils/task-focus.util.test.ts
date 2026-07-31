import { createTaskFocusSummary, getBangkokDateBoundaries } from '../../utils/task-focus.util';

describe('task focus', () => {
  it('prioritizes personal approvals before overdue and upcoming work', () => {
    const focus = createTaskFocusSummary({
      approvalRequired: 2,
      overdue: 5,
      dueToday: 3,
      dueSoon: 4,
    }, 'revision-1', 'personal');

    expect(focus.primary).toEqual({
      kind: 'approval_required',
      count: 2,
      targetFilter: 'approval',
    });
  });

  it('prioritizes organization overdue work and creates a stable revision', () => {
    const counts = { overdue: 5, dueToday: 3, dueSoon: 4, waitingReview: 7 };
    const first = createTaskFocusSummary(counts, 'revision-1', 'organization');
    const second = createTaskFocusSummary(counts, 'revision-1', 'organization');

    expect(first.primary).toEqual({
      kind: 'overdue',
      count: 5,
      targetFilter: 'overdue',
    });
    expect(first.revision).toBe(second.revision);
  });

  it('uses Asia/Bangkok midnight boundaries', () => {
    const boundaries = getBangkokDateBoundaries(new Date('2026-07-31T15:30:00.000Z'));
    expect(boundaries.todayStart.toISOString()).toBe('2026-07-30T17:00:00.000Z');
    expect(boundaries.tomorrowStart.toISOString()).toBe('2026-07-31T17:00:00.000Z');
    expect(boundaries.soonEnd.toISOString()).toBe('2026-08-03T17:00:00.000Z');
  });
});
