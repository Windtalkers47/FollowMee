export type ScheduleTaskStatus = 'draft' | 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled';
export type ScheduleDateFilter = 'all' | 'overdue' | 'today' | 'soon' | 'week';

const statusTabs: Array<'all' | ScheduleTaskStatus> = ['all', 'draft', 'todo', 'in_progress', 'review', 'done', 'cancelled'];

export const resolveScheduleFocus = (
  activeTab: number,
  dateFilter: ScheduleDateFilter,
  focusTarget: string | null,
) => {
  const effectiveDateFilter: ScheduleDateFilter = focusTarget === 'overdue'
    ? 'overdue'
    : focusTarget === 'today'
      ? 'today'
      : focusTarget === 'soon'
        ? 'soon'
        : focusTarget === 'week'
          ? 'week'
        : dateFilter;
  const effectiveStatus = focusTarget === 'review' || focusTarget === 'approval'
    ? 'review'
    : statusTabs[activeTab];
  const displayedTab = effectiveStatus === 'review' && focusTarget
    ? statusTabs.indexOf('review')
    : activeTab;

  return {
    effectiveDateFilter,
    effectiveStatus,
    displayedTab,
    query: {
      status: effectiveStatus === 'all' ? undefined : effectiveStatus,
      dueFilter: effectiveDateFilter === 'all' ? undefined : effectiveDateFilter,
    },
  };
};
