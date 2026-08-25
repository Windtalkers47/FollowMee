import type { CreateTaskData, Task, TaskQueryParams, UpdateTaskData } from '../../api/task.api';
import type { ScheduleDateFilter } from '../../utils/scheduleFocus';
import { isAllowedTaskTransition } from '../../utils/taskWorkflow';

export type ScheduleSortOption = 'updated_desc' | 'due_asc' | 'title_asc';
export type ScheduleAssignee = number | 'all';

export interface ScheduleQueryState {
  searchQuery: string;
  status?: Task['status'];
  dueFilter?: ScheduleDateFilter;
  effectiveStatus: 'all' | Task['status'];
  effectiveDateFilter: ScheduleDateFilter;
  sortBy: ScheduleSortOption;
  page: number;
  creatorOnlySelection: boolean;
  assigneeId: ScheduleAssignee;
}

export const scheduleTaskQueryKey = (state: ScheduleQueryState) => ['tasks', {
  search: state.searchQuery,
  status: state.effectiveStatus,
  dateFilter: state.effectiveDateFilter,
  sortBy: state.sortBy,
  page: state.page,
  creatorOnlySelection: state.creatorOnlySelection,
  assigneeId: state.assigneeId,
}] as const;

export const scheduleTaskRequest = (state: ScheduleQueryState, userId?: number): TaskQueryParams => ({
  search: state.searchQuery || undefined,
  status: state.status,
  dueFilter: state.dueFilter,
  sort: state.sortBy,
  page: state.page,
  limit: 24,
  createdBy: state.creatorOnlySelection ? userId : undefined,
  assignedTo: state.assigneeId === 'all' ? undefined : state.assigneeId,
});

export const scheduleActiveFilterCount = (
  dateFilter: ScheduleDateFilter,
  sortBy: ScheduleSortOption,
  assigneeId: ScheduleAssignee,
) => Number(dateFilter !== 'all') + Number(sortBy !== 'updated_desc') + Number(assigneeId !== 'all');

export const scheduleBulkActions = (tasks: Task[], userId?: number) => {
  if (tasks.length === 0) return [];
  const actions: Array<'delete' | 'done' | 'start' | 'todo' | 'in_progress' | 'review' | 'cancelled'> = [];
  if (tasks.every((task) => task.createdBy === userId)) actions.push('delete');
  if (tasks.every((task) => task.workflow?.canStart && isAllowedTaskTransition(task, 'in_progress'))) actions.push('start', 'in_progress');
  if (tasks.every((task) => task.workflow?.canSubmitReview && isAllowedTaskTransition(task, 'review'))) actions.push('review');
  if (tasks.every((task) => task.workflow?.canApprove && isAllowedTaskTransition(task, 'done'))) actions.push('done');
  if (tasks.every((task) => task.workflow?.canPublish && isAllowedTaskTransition(task, 'todo'))) actions.push('todo');
  if (tasks.every((task) => task.workflow?.canCancel && isAllowedTaskTransition(task, 'cancelled'))) actions.push('cancelled');
  return actions;
};

export const scheduleTaskFormPayload = (taskData: CreateTaskData, intent: 'publish' | 'draft' | string) => {
  const { dueDateRange } = taskData;
  const editableTaskData = { ...taskData };
  delete editableTaskData.dueDateRange;
  delete editableTaskData.createdAt;
  delete editableTaskData.updatedAt;
  return {
    ...editableTaskData,
    status: intent === 'publish' ? 'todo' : intent === 'draft' ? 'draft' : taskData.status,
    startDate: dueDateRange?.[0] ? dueDateRange[0].toISOString() : taskData.startDate || null,
    endDate: dueDateRange?.[1] ? dueDateRange[1].toISOString() : taskData.endDate || null,
    dueDate: (!dueDateRange?.[0] && !taskData.startDate)
      ? (taskData.dueDate instanceof Date ? taskData.dueDate.toISOString() : taskData.dueDate)
      : null,
  } as CreateTaskData & UpdateTaskData;
};
