import type { QueryClient, QueryKey } from '@tanstack/react-query';
import type { MyWorkResponse, Task, TaskListResponse } from '../api/task.api';
import {
  applyRealtimeEventToCache,
  taskProjectionFromTask,
  type RealtimeDomainEvent,
  type TaskRealtimeChange,
} from './realtimeCache';

const invalidateKeys = (queryClient: QueryClient, keys: ReadonlyArray<QueryKey>) => {
  const unique = new Map(keys.map(key => [JSON.stringify(key), key]));
  unique.forEach(queryKey => { void queryClient.invalidateQueries({ queryKey }); });
};

export const applyTaskMutationSnapshot = (
  queryClient: QueryClient,
  task: Task,
  userId: number,
  previous?: Task,
) => {
  const cachedPrevious = previous
    || queryClient.getQueryData<Task>(['task-detail', task.taskId])
    || queryClient.getQueryData<MyWorkResponse>(['my-work', userId])?.items.find(item => item.taskId === task.taskId)
    || queryClient.getQueriesData<TaskListResponse>({ queryKey: ['tasks'] })
      .flatMap(([, data]) => data?.tasks || [])
      .find(item => item.taskId === task.taskId)
    || queryClient.getQueriesData<TaskListResponse>({ queryKey: ['all-tasks'] })
      .flatMap(([, data]) => data?.tasks || [])
      .find(item => item.taskId === task.taskId);
  const change: TaskRealtimeChange = {
    taskId: task.taskId,
    version: task.version,
    before: cachedPrevious ? taskProjectionFromTask(cachedPrevious) : null,
    after: taskProjectionFromTask(task),
    changedFields: [],
  };
  const event: RealtimeDomainEvent = {
    name: cachedPrevious ? 'task:updated' : 'task:created',
    data: {
      schemaVersion: 2,
      occurredAt: task.updatedAt,
      revision: task.updatedAt,
      taskId: task.taskId,
      taskIds: [task.taskId],
      task,
      changes: [change],
    },
  };
  queryClient.setQueryData(['task-detail', task.taskId], task);
  invalidateKeys(queryClient, applyRealtimeEventToCache(queryClient, event, userId));
};

export const applyTaskMutationDelete = (
  queryClient: QueryClient,
  task: Task,
  userId: number,
) => {
  const before = taskProjectionFromTask(task);
  const event: RealtimeDomainEvent = {
    name: 'task:deleted',
    data: {
      schemaVersion: 2,
      occurredAt: task.updatedAt,
      revision: task.updatedAt,
      taskId: task.taskId,
      taskIds: [task.taskId],
      changes: [{ taskId: task.taskId, version: task.version, before, after: null, changedFields: ['isActive'] }],
    },
  };
  invalidateKeys(queryClient, applyRealtimeEventToCache(queryClient, event, userId));
};
