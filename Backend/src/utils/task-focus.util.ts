export type TaskFocusKind =
  | 'approval_required'
  | 'overdue'
  | 'due_today'
  | 'due_soon'
  | 'waiting_review';

export interface TaskFocusCounts {
  overdue: number;
  dueToday: number;
  dueSoon: number;
  waitingReview?: number;
  approvalRequired?: number;
}

export interface TaskFocusSummary {
  primary?: {
    kind: TaskFocusKind;
    count: number;
    targetFilter: string;
  };
  counts: TaskFocusCounts;
  revision: string;
}

export const getBangkokDateBoundaries = (now = new Date()) => {
  const bangkokOffsetMs = 7 * 60 * 60 * 1000;
  const local = new Date(now.getTime() + bangkokOffsetMs);
  const todayStart = new Date(
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - bangkokOffsetMs,
  );
  const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const soonEnd = new Date(todayStart.getTime() + 4 * 24 * 60 * 60 * 1000);
  const weekEnd = new Date(todayStart.getTime() + 7 * 24 * 60 * 60 * 1000);
  return { todayStart, tomorrowStart, soonEnd, weekEnd };
};

export const createTaskFocusSummary = (
  counts: TaskFocusCounts,
  revisionSeed: string,
  scope: 'personal' | 'organization',
): TaskFocusSummary => {
  const priorities: Array<{ kind: TaskFocusKind; count: number; targetFilter: string }> =
    scope === 'personal'
      ? [
          { kind: 'approval_required', count: counts.approvalRequired || 0, targetFilter: 'approval' },
          { kind: 'overdue', count: counts.overdue, targetFilter: 'overdue' },
          { kind: 'due_today', count: counts.dueToday, targetFilter: 'due_today' },
          { kind: 'due_soon', count: counts.dueSoon, targetFilter: 'due_soon' },
        ]
      : [
          { kind: 'overdue', count: counts.overdue, targetFilter: 'overdue' },
          { kind: 'due_today', count: counts.dueToday, targetFilter: 'today' },
          { kind: 'waiting_review', count: counts.waitingReview || 0, targetFilter: 'review' },
          { kind: 'due_soon', count: counts.dueSoon, targetFilter: 'soon' },
        ];
  const primary = priorities.find((item) => item.count > 0);
  return {
    primary,
    counts,
    revision: [
      revisionSeed,
      counts.overdue,
      counts.dueToday,
      counts.dueSoon,
      counts.waitingReview || 0,
      counts.approvalRequired || 0,
    ].join(':'),
  };
};
