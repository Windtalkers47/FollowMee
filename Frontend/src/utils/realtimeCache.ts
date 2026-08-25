import type { QueryClient, QueryKey } from '@tanstack/react-query';
import type { MyWorkResponse, Task, TaskListResponse } from '../api/task.api';
import type { RewardRedemption, RewardSummary } from '../api/reward.api';

type TaskPatch = Partial<Pick<Task,
  'title' | 'status' | 'assignedTo' | 'createdBy' | 'updatedAt' | 'version' | 'isActive'
  | 'dueDate' | 'startDate' | 'endDate' | 'blockedAt' | 'blockedReason'
>>;

export type TaskRealtimeProjection = {
  taskId: string;
  status: Task['status'];
  assignedTo: number | null;
  createdBy: number;
  version: number;
  isActive: boolean;
  title: string;
  dueDate: string | null;
  startDate: string | null;
  endDate: string | null;
  updatedAt: string;
  blockedAt: string | null;
  blockedReason: string | null;
};

export type TaskRealtimeChange = {
  taskId: string;
  version: number;
  before: TaskRealtimeProjection | null;
  after: TaskRealtimeProjection | null;
  changedFields: string[];
};

type RealtimeBase = { revision?: string; updatedAt?: string; occurredAt?: string };
type TaskEventData = RealtimeBase & TaskPatch & {
  schemaVersion?: 2;
  taskId?: string;
  taskIds?: string[];
  task?: Task;
  tasks?: Task[];
  changes?: TaskRealtimeChange[];
  actorUserId?: number;
  blocked?: boolean;
};
type RewardEventData = RealtimeBase & {
  userId?: number;
  summary?: RewardSummary;
  redemption?: RewardRedemption;
  redemptionId?: number;
  status?: string;
};
type CommentEventData = RealtimeBase & { taskId?: string; commentId?: number; actorUserId?: number };

export type RealtimeDomainEvent =
  | { name: 'task:created' | 'task:updated' | 'task:deleted'; data: TaskEventData }
  | { name: 'activity:created'; data: TaskEventData }
  | { name: 'comment:created' | 'comment:updated' | 'comment:deleted' | 'reaction:updated'; data: CommentEventData }
  | { name: 'reward:points-updated' | 'reward:mission-progress' | 'reward:redemption-updated' | 'reward:season-updated'; data: RewardEventData }
  | { name: 'owner:transferred'; data: RealtimeBase };

export type RealtimeEventData = TaskEventData & RewardEventData & CommentEventData;
export type RealtimeRevision = number | string;

export const taskProjectionFromTask = (task: Task): TaskRealtimeProjection => ({
  taskId: task.taskId,
  status: task.status,
  assignedTo: task.assignedTo ?? null,
  createdBy: task.createdBy,
  version: task.version,
  isActive: task.isActive,
  title: task.title,
  dueDate: task.dueDate ?? null,
  startDate: task.startDate ?? null,
  endDate: task.endDate ?? null,
  updatedAt: task.updatedAt,
  blockedAt: task.blockedAt ?? null,
  blockedReason: task.blockedReason ?? null,
});

const timestampRevision = (data: RealtimeBase): string | undefined => data.revision || data.updatedAt || data.occurredAt;
const validTimestamp = (value: string | undefined): value is string => Boolean(value && !Number.isNaN(Date.parse(value)));

const taskChanges = (event: RealtimeDomainEvent): TaskRealtimeChange[] => {
  if (!event.name.startsWith('task:')) return [];
  const data = event.data as TaskEventData;
  return data.schemaVersion === 2 && Array.isArray(data.changes) ? data.changes : [];
};

export const splitRealtimeEventByEntity = (event: RealtimeDomainEvent): RealtimeDomainEvent[] => {
  const changes = taskChanges(event);
  if (!changes.length) return [event];
  return [...changes]
    .sort((left, right) => left.taskId.localeCompare(right.taskId))
    .map(change => ({ ...event, data: { ...(event.data as TaskEventData), taskId: change.taskId, taskIds: [change.taskId], changes: [change] } } as RealtimeDomainEvent));
};

export const realtimeEventKey = (event: RealtimeDomainEvent): string => {
  if (event.name.startsWith('task:')) {
    const data = event.data as TaskEventData;
    const ids = data.changes?.map(change => change.taskId) || data.taskIds || (data.taskId ? [data.taskId] : []);
    return ids.length === 1 ? `task:${ids[0]}` : `task:${[...ids].sort().join(',') || 'collection'}`;
  }
  if (event.name === 'activity:created') return `${event.name}:${(event.data as TaskEventData).taskId || 'collection'}`;
  if (event.name.startsWith('comment:') || event.name === 'reaction:updated') {
    const data = event.data as CommentEventData;
    return `${event.name}:${data.commentId || data.taskId || 'collection'}`;
  }
  if (event.name === 'reward:redemption-updated') return `${event.name}:${(event.data as RewardEventData).redemptionId || 'collection'}`;
  return event.name;
};

export const realtimeRevisionOf = (event: RealtimeDomainEvent): RealtimeRevision | undefined => {
  const changes = taskChanges(event);
  if (changes.length === 1 && Number.isFinite(changes[0].version)) return changes[0].version;
  const revision = timestampRevision(event.data);
  return validTimestamp(revision) ? revision : undefined;
};

export const isNewerRealtimeEvent = (previousRevision: RealtimeRevision | undefined, event: RealtimeDomainEvent): boolean => {
  const incoming = realtimeRevisionOf(event);
  if (incoming === undefined || previousRevision === undefined) return true;
  if (typeof incoming === 'number' && typeof previousRevision === 'number') return incoming > previousRevision;
  if (typeof incoming === 'string' && typeof previousRevision === 'string') return Date.parse(incoming) > Date.parse(previousRevision);
  // A typed entity version and a legacy timestamp are incomparable during rolling deploys.
  return true;
};

export const taskIdsFromRealtimeEvent = (event: RealtimeDomainEvent): string[] => {
  if (!event.name.startsWith('task:') && event.name !== 'activity:created') return [];
  const data = event.data as TaskEventData;
  return data.changes?.map(change => change.taskId) || data.taskIds || (data.taskId ? [data.taskId] : []);
};

const patchFromProjection = (projection: TaskRealtimeProjection): TaskPatch => ({
  title: projection.title,
  status: projection.status,
  assignedTo: projection.assignedTo ?? undefined,
  createdBy: projection.createdBy,
  version: projection.version,
  isActive: projection.isActive,
  dueDate: projection.dueDate ?? undefined,
  startDate: projection.startDate ?? undefined,
  endDate: projection.endDate ?? undefined,
  updatedAt: projection.updatedAt,
  blockedAt: projection.blockedAt,
  blockedReason: projection.blockedReason,
});

const legacyPatch = (event: RealtimeDomainEvent): TaskPatch => {
  const data = event.data as TaskEventData;
  const patch: TaskPatch = {};
  if (data.status) patch.status = data.status;
  if ('assignedTo' in data) patch.assignedTo = data.assignedTo;
  if (data.updatedAt || data.revision) patch.updatedAt = data.updatedAt || data.revision!;
  if (typeof data.version === 'number') patch.version = data.version;
  if ('blockedAt' in data) patch.blockedAt = data.blockedAt;
  if ('blockedReason' in data) patch.blockedReason = data.blockedReason;
  if (typeof data.blocked === 'boolean') patch.blockedAt = data.blocked ? (data.revision || new Date().toISOString()) : null;
  return patch;
};

const changeForTask = (event: RealtimeDomainEvent, taskId: string) => taskChanges(event).find(change => change.taskId === taskId);

export const patchTaskForRealtimeEvent = (task: Task, event: RealtimeDomainEvent): Task | null => {
  if (!taskIdsFromRealtimeEvent(event).includes(task.taskId)) return task;
  if (event.name === 'task:deleted') return null;
  const data = event.data as TaskEventData;
  const snapshot = data.task || data.tasks?.find(item => item.taskId === task.taskId);
  const change = changeForTask(event, task.taskId);
  return snapshot || { ...task, ...(change?.after ? patchFromProjection(change.after) : legacyPatch(event)) };
};

const queryParams = (queryKey: QueryKey): Record<string, unknown> =>
  queryKey.length > 1 && queryKey[1] && typeof queryKey[1] === 'object' && !Array.isArray(queryKey[1])
    ? queryKey[1] as Record<string, unknown>
    : {};

const dueTimestamp = (task: TaskRealtimeProjection) => {
  const value = task.endDate || task.dueDate;
  return value ? Date.parse(value) : undefined;
};

const bangkokDay = () => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const start = Date.parse(`${parts}T00:00:00+07:00`);
  return { start, tomorrow: start + 86_400_000, soon: start + 4 * 86_400_000, week: start + 7 * 86_400_000 };
};

export const taskMatchesTaskQuery = (
  task: TaskRealtimeProjection | null,
  params: Record<string, unknown>,
  userId: number,
): boolean | undefined => {
  if (!task || !task.isActive) return false;
  if (task.status === 'draft' && task.createdBy !== userId) return false;
  const status = params.status;
  if (typeof status === 'string' && status !== 'all' && task.status !== status) return false;
  const assignee = params.assigneeId ?? params.assignedTo;
  if (assignee !== undefined && assignee !== 'all' && Number(assignee) !== task.assignedTo) return false;
  if (params.creatorOnlySelection && task.createdBy !== userId) return false;
  if (params.createdBy !== undefined && Number(params.createdBy) !== task.createdBy) return false;
  const search = typeof params.search === 'string' ? params.search.trim().toLocaleLowerCase() : '';
  if (search && !task.title.toLocaleLowerCase().includes(search)) return undefined;
  const dueFilter = params.dateFilter ?? params.dueFilter;
  if (!dueFilter || dueFilter === 'all') return true;
  const due = dueTimestamp(task);
  if (due === undefined) return false;
  const day = bangkokDay();
  if (dueFilter === 'overdue') return due < day.start && !['done', 'cancelled'].includes(task.status);
  if (dueFilter === 'today') return due >= day.start && due < day.tomorrow;
  if (dueFilter === 'soon') return due >= day.tomorrow && due < day.soon;
  if (dueFilter === 'week') return due >= day.start && due < day.week;
  return true;
};

const myWorkMembership = (task: TaskRealtimeProjection | null, userId: number) => Boolean(
  task && task.isActive && ['todo', 'in_progress', 'review'].includes(task.status)
  && (task.assignedTo === userId || (task.createdBy === userId && task.status === 'review')),
);

const adjustMyWorkCounts = (current: MyWorkResponse, change: TaskRealtimeChange, userId: number): MyWorkResponse['counts'] => {
  const counts = { ...current.counts };
  const adjust = (task: TaskRealtimeProjection | null, delta: number) => {
    if (!myWorkMembership(task, userId) || !task) return;
    if (task.status === 'todo') counts.todo = Math.max(0, counts.todo + delta);
    if (task.status === 'in_progress') counts.inProgress = Math.max(0, counts.inProgress + delta);
    if (task.status === 'review') counts.review = Math.max(0, counts.review + delta);
    if (task.status === 'review' && task.createdBy === userId) counts.approvalRequired = Math.max(0, counts.approvalRequired + delta);
    const due = dueTimestamp(task);
    if (due !== undefined) {
      const day = bangkokDay();
      if (due < day.start) counts.overdue = Math.max(0, counts.overdue + delta);
      else if (due < day.tomorrow) counts.dueToday = Math.max(0, counts.dueToday + delta);
      else if (due < day.soon) counts.dueSoon = Math.max(0, counts.dueSoon + delta);
    }
  };
  adjust(change.before, -1);
  adjust(change.after, 1);
  return counts;
};

export const patchTaskListForRealtimeEvent = (current: TaskListResponse | undefined, event: RealtimeDomainEvent): TaskListResponse | undefined => {
  if (!current) return current;
  const tasks = current.tasks.map(task => patchTaskForRealtimeEvent(task, event)).filter((task): task is Task => Boolean(task));
  const data = event.data as TaskEventData;
  if (event.name === 'task:created') {
    const snapshots = data.tasks || (data.task ? [data.task] : []);
    snapshots.forEach(snapshot => { if (!tasks.some(task => task.taskId === snapshot.taskId)) tasks.unshift(snapshot); });
  }
  const removed = current.tasks.length - tasks.length;
  const added = tasks.length - (current.tasks.length - removed);
  return { ...current, tasks, total: Math.max(0, current.total - removed + added) };
};

export const patchMyWorkForRealtimeEvent = (current: MyWorkResponse | undefined, event: RealtimeDomainEvent, userId?: number): MyWorkResponse | undefined => {
  if (!current) return current;
  let items = current.items.map(task => patchTaskForRealtimeEvent(task, event)).filter((task): task is Task => Boolean(task));
  let counts = current.counts;
  if (userId !== undefined) {
    taskChanges(event).forEach(change => {
      counts = adjustMyWorkCounts({ ...current, counts }, change, userId);
      if (change.after && !myWorkMembership(change.after, userId)) items = items.filter(task => task.taskId !== change.taskId);
      if (change.after && myWorkMembership(change.after, userId) && !items.some(task => task.taskId === change.taskId)) {
        const snapshot = (event.data as TaskEventData).task
          || (event.data as TaskEventData).tasks?.find(task => task.taskId === change.taskId);
        if (snapshot) items = [snapshot, ...items];
      }
    });
  }
  items.sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt) || right.taskId.localeCompare(left.taskId));
  return { ...current, items, counts };
};

const patchRedemption = (redemption: RewardRedemption, data: RewardEventData): RewardRedemption =>
  redemption.redemptionId === data.redemptionId
    ? data.redemption || { ...redemption, status: data.status || redemption.status }
    : redemption;

const uniqueKeys = (keys: QueryKey[]) => [...new Map(keys.map(key => [JSON.stringify(key), key])).values()];

const reconcileCompletedList = (
  current: TaskListResponse | undefined,
  event: RealtimeDomainEvent,
  queryKey: QueryKey,
): TaskListResponse | undefined => {
  if (!current) return current;
  const isSearch = queryKey[0] === 'search-tasks';
  const search = isSearch ? String(queryKey[1] || '').trim().toLocaleLowerCase() : '';
  const activeTab = Number(isSearch ? queryKey[2] : queryKey[1]);
  const userId = Number(isSearch ? queryKey[3] : queryKey[2]);
  let next = current;
  taskChanges(event).forEach(change => {
    const member = (task: TaskRealtimeProjection | null) => Boolean(
      task && task.isActive && task.status === 'done'
      && (activeTab !== 1 || task.assignedTo === userId)
      && (!search || task.title.toLocaleLowerCase().includes(search)),
    );
    const beforeMember = member(change.before);
    const afterMember = member(change.after);
    const existed = next.tasks.some(task => task.taskId === change.taskId);
    let tasks = next.tasks.map(task => patchTaskForRealtimeEvent(task, event)).filter((task): task is Task => Boolean(task));
    if (!afterMember) tasks = tasks.filter(task => task.taskId !== change.taskId);
    const snapshot = (event.data as TaskEventData).task
      || (event.data as TaskEventData).tasks?.find(task => task.taskId === change.taskId);
    if (afterMember && !existed && snapshot) tasks.unshift(snapshot);
    tasks.sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));
    const total = beforeMember === afterMember ? next.total : Math.max(0, next.total + (afterMember ? 1 : -1));
    next = { ...next, tasks: tasks.slice(0, next.limit), total, totalPages: Math.ceil(total / Math.max(1, next.limit)) };
  });
  return next;
};

export const applyRealtimeEventToCache = (
  queryClient: QueryClient,
  event: RealtimeDomainEvent,
  userId: number,
): ReadonlyArray<QueryKey> => {
  if (event.name.startsWith('task:')) {
    const fallbacks: QueryKey[] = [];
    const changes = taskChanges(event);
    const ordered = realtimeRevisionOf(event) !== undefined;
    const taskQueries = queryClient.getQueriesData<TaskListResponse>({ queryKey: ['tasks'] });

    taskQueries.forEach(([queryKey, current]) => {
      if (!current) return;
      if (!ordered || !changes.length) {
        fallbacks.push(queryKey);
        return;
      }
      const params = queryParams(queryKey);
      let next = current;
      let ambiguous = false;
      changes.forEach(change => {
        const beforeMatches = taskMatchesTaskQuery(change.before, params, userId);
        const afterMatches = taskMatchesTaskQuery(change.after, params, userId);
        if (beforeMatches === undefined || afterMatches === undefined) { ambiguous = true; return; }
        const existed = next.tasks.some(task => task.taskId === change.taskId);
        let tasks = next.tasks.map(task => patchTaskForRealtimeEvent(task, event)).filter((task): task is Task => Boolean(task));
        if (!afterMatches) tasks = tasks.filter(task => task.taskId !== change.taskId);
        const page = Number(params.page || next.page || 1);
        const snapshot = (event.data as TaskEventData).task
          || (event.data as TaskEventData).tasks?.find(task => task.taskId === change.taskId);
        if (afterMatches && !existed && page === 1 && snapshot) {
          tasks = [snapshot, ...tasks].slice(0, next.limit);
        }
        const sort = String(params.sortBy || params.sort || 'updated_desc');
        const orderingChanged = Boolean(change.before && change.after && (
          (sort === 'updated_desc' && change.before.updatedAt !== change.after.updatedAt)
          || (sort === 'title_asc' && change.before.title !== change.after.title)
          || (sort === 'due_asc' && dueTimestamp(change.before) !== dueTimestamp(change.after))
        ));
        if (orderingChanged && page === 1) {
          tasks.sort((left, right) => {
            if (sort === 'title_asc') return left.title.localeCompare(right.title);
            if (sort === 'due_asc') {
              const leftDue = Date.parse(left.endDate || left.dueDate || '9999-12-31');
              const rightDue = Date.parse(right.endDate || right.dueDate || '9999-12-31');
              return leftDue - rightDue;
            }
            return Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
          });
        }
        const membershipChanged = beforeMatches !== afterMatches;
        const total = membershipChanged ? Math.max(0, next.total + (afterMatches ? 1 : -1)) : next.total;
        next = { ...next, tasks, total, totalPages: Math.ceil(total / Math.max(1, next.limit)) };
        if ((afterMatches && !existed && (!snapshot || page > 1)) || (membershipChanged && page > 1) || (membershipChanged && existed && page === 1 && !afterMatches) || (orderingChanged && page > 1)) ambiguous = true;
      });
      queryClient.setQueryData(queryKey, next);
      if (ambiguous) fallbacks.push(queryKey);
    });

    if (!ordered || !changes.length) {
      queryClient.getQueriesData({ queryKey: ['all-tasks'] }).forEach(([queryKey]) => fallbacks.push(queryKey));
      queryClient.getQueriesData({ queryKey: ['search-tasks'] }).forEach(([queryKey]) => fallbacks.push(queryKey));
      taskIdsFromRealtimeEvent(event).forEach(taskId => fallbacks.push(['task-detail', taskId]));
      return uniqueKeys([...fallbacks, ['my-work', userId]]);
    }

    queryClient.getQueriesData<TaskListResponse>({ queryKey: ['all-tasks'] }).forEach(([queryKey, current]) => {
      queryClient.setQueryData(queryKey, changes.length ? reconcileCompletedList(current, event, queryKey) : patchTaskListForRealtimeEvent(current, event));
    });
    queryClient.getQueriesData<TaskListResponse>({ queryKey: ['search-tasks'] }).forEach(([queryKey, current]) => {
      queryClient.setQueryData(queryKey, changes.length ? reconcileCompletedList(current, event, queryKey) : patchTaskListForRealtimeEvent(current, event));
    });
    queryClient.setQueryData<MyWorkResponse>(['my-work', userId], current => patchMyWorkForRealtimeEvent(current, event, userId));
    taskIdsFromRealtimeEvent(event).forEach(taskId => {
      queryClient.setQueryData<Task>(['task-detail', taskId], current => current ? patchTaskForRealtimeEvent(current, event) || undefined : current);
    });

    changes.forEach(change => {
      const beforeMember = myWorkMembership(change.before, userId);
      const afterMember = myWorkMembership(change.after, userId);
      const cached = queryClient.getQueryData<MyWorkResponse>(['my-work', userId]);
      if (afterMember && !cached?.items.some(task => task.taskId === change.taskId)) fallbacks.push(['my-work', userId]);
      if (beforeMember !== afterMember && cached?.pageInfo.nextCursor) fallbacks.push(['my-work', userId]);
      if (change.before?.updatedAt !== change.after?.updatedAt && cached?.pageInfo.nextCursor) fallbacks.push(['my-work', userId]);
    });
    return uniqueKeys(fallbacks);
  }

  if (event.name === 'activity:created') return (event.data as TaskEventData).schemaVersion === 2 ? [] : [['all-tasks']];
  if (event.name.startsWith('comment:')) {
    const data = event.data as CommentEventData;
    return data.taskId ? [['task-comments', data.taskId], ['all-tasks']] : [['all-tasks']];
  }
  if (event.name === 'reaction:updated') {
    const data = event.data as CommentEventData;
    return data.taskId ? [['task-comments', data.taskId], ['task-detail', data.taskId], ['all-tasks']] : [['all-tasks']];
  }

  if (event.name.startsWith('reward:')) {
    const data = event.data as RewardEventData;
    if (data.summary) {
      queryClient.setQueryData(['rewards', 'summary'], data.summary);
      queryClient.setQueryData(['dashboard', 'achievement'], data.summary);
    }
    if (event.name === 'reward:redemption-updated' && data.redemptionId) {
      queryClient.setQueryData<RewardSummary>(['rewards', 'summary'], current => current ? {
        ...current,
        redemptions: current.redemptions.map(item => patchRedemption(item, data)),
      } : current);
      queryClient.setQueryData<RewardRedemption[]>(['rewards', 'admin-redemptions'], current => current?.map(item => patchRedemption(item, data)));
    }
    if (data.summary) return [];
    if (event.name === 'reward:redemption-updated') return [['rewards', 'summary'], ['rewards', 'catalog']];
    if (event.name === 'reward:season-updated') return [['rewards', 'summary'], ['rewards', 'seasons'], ['dashboard', 'achievement']];
    return [['rewards', 'summary'], ['dashboard', 'achievement']];
  }

  if (event.name === 'owner:transferred') return [['users']];
  return [];
};
