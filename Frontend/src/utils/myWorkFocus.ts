export const myWorkFilters = ['all', 'todo', 'in_progress', 'review', 'approval', 'overdue', 'due_today', 'due_soon', 'blocked'] as const;
export type MyWorkFilter = typeof myWorkFilters[number];

export const resolveMyWorkFocus = (value: string | null): MyWorkFilter =>
  myWorkFilters.includes(value as MyWorkFilter) ? value as MyWorkFilter : 'all';
