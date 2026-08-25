import { describe, expect, it } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import type { MyWorkResponse, Task, TaskListResponse } from '../../api/task.api';
import {
  isNewerRealtimeEvent,
  applyRealtimeEventToCache,
  patchTaskListForRealtimeEvent,
  realtimeEventKey,
  splitRealtimeEventByEntity,
  taskProjectionFromTask,
  taskIdsFromRealtimeEvent,
  type RealtimeDomainEvent,
} from '../../utils/realtimeCache';

const task = (taskId: string, status: Task['status'] = 'todo'): Task => ({
  taskId,
  title: taskId,
  createdBy: 1,
  priority: 'medium',
  version: 1,
  watcherIds: [],
  scope: 'shared',
  status,
  isActive: true,
  createdAt: '2026-08-14T00:00:00.000Z',
  updatedAt: '2026-08-14T00:00:00.000Z',
  createdByUser: { userId: 1, userName: 'A', userLastName: 'B' },
});

const list = (tasks: Task[]): TaskListResponse => ({ tasks, total: tasks.length, page: 1, limit: 24, totalPages: 1 });

describe('realtime cache helpers', () => {
  it('rejects an event older than the last applied revision', () => {
    const event: RealtimeDomainEvent = { name: 'task:updated', data: { taskId: 'a', revision: '2026-08-14T09:00:00.000Z' } };
    expect(isNewerRealtimeEvent('2026-08-14T10:00:00.000Z', event)).toBe(false);
    expect(isNewerRealtimeEvent('2026-08-14T08:00:00.000Z', event)).toBe(true);
  });

  it('coalesces by entity key and exposes bulk task IDs', () => {
    const event: RealtimeDomainEvent = { name: 'task:updated', data: { taskIds: ['a', 'b'], status: 'review' } };
    expect(realtimeEventKey(event)).toBe('task:a,b');
    expect(taskIdsFromRealtimeEvent(event)).toEqual(['a', 'b']);
  });

  it('patches bulk status without replacing unrelated tasks', () => {
    const event: RealtimeDomainEvent = { name: 'task:updated', data: { taskIds: ['a', 'b'], status: 'done', updatedAt: '2026-08-14T10:00:00.000Z' } };
    const result = patchTaskListForRealtimeEvent(list([task('a'), task('b'), task('c')]), event)!;
    expect(result.tasks.map(item => item.status)).toEqual(['done', 'done', 'todo']);
  });

  it('removes deleted tasks and adjusts totals', () => {
    const event: RealtimeDomainEvent = { name: 'task:deleted', data: { taskIds: ['a', 'c'] } };
    const result = patchTaskListForRealtimeEvent(list([task('a'), task('b'), task('c')]), event)!;
    expect(result.tasks.map(item => item.taskId)).toEqual(['b']);
    expect(result.total).toBe(1);
  });

  it('adds a task only when the event contains a snapshot', () => {
    const event: RealtimeDomainEvent = { name: 'task:created', data: { taskId: 'b', task: task('b') } };
    const result = patchTaskListForRealtimeEvent(list([task('a')]), event)!;
    expect(result.tasks.map(item => item.taskId)).toEqual(['b', 'a']);
    expect(result.total).toBe(2);
  });

  it('splits schema v2 bulk events into canonical per-entity revisions', () => {
    const first = taskProjectionFromTask({ ...task('a'), version: 2 });
    const second = taskProjectionFromTask({ ...task('b'), version: 4 });
    const event: RealtimeDomainEvent = {
      name: 'task:updated',
      data: {
        schemaVersion: 2,
        occurredAt: '2026-08-14T10:00:00.000Z',
        changes: [
          { taskId: 'b', version: 4, before: { ...second, version: 3 }, after: second, changedFields: ['status'] },
          { taskId: 'a', version: 2, before: { ...first, version: 1 }, after: first, changedFields: ['status'] },
        ],
      },
    };
    const split = splitRealtimeEventByEntity(event);
    expect(split.map(realtimeEventKey)).toEqual(['task:a', 'task:b']);
    expect(isNewerRealtimeEvent(2, split[0])).toBe(false);
    expect(isNewerRealtimeEvent(1, split[0])).toBe(true);
  });

  it('removes a task from a filtered list and invalidates only that exact paginated key', () => {
    const queryClient = new QueryClient();
    const queryKey = ['tasks', { status: 'todo', page: 2 }] as const;
    const beforeTask = task('a');
    const afterTask = { ...beforeTask, status: 'review' as const, version: 2, updatedAt: '2026-08-14T10:00:00.000Z' };
    queryClient.setQueryData(queryKey, { ...list([beforeTask, task('b')]), page: 2, total: 3, totalPages: 2 });
    const event: RealtimeDomainEvent = {
      name: 'task:updated',
      data: {
        schemaVersion: 2,
        occurredAt: afterTask.updatedAt,
        changes: [{
          taskId: 'a', version: 2,
          before: taskProjectionFromTask(beforeTask),
          after: taskProjectionFromTask(afterTask),
          changedFields: ['status'],
        }],
      },
    };
    const fallbacks = applyRealtimeEventToCache(queryClient, event, 1);
    expect(queryClient.getQueryData<TaskListResponse>(queryKey)?.tasks.map(item => item.taskId)).toEqual(['b']);
    expect(queryClient.getQueryData<TaskListResponse>(queryKey)?.total).toBe(2);
    expect(fallbacks).toContainEqual(queryKey);
    expect(fallbacks).not.toContainEqual(['tasks']);
  });

  it('updates My Work membership counts without a broad task refresh', () => {
    const queryClient = new QueryClient();
    const beforeTask = { ...task('a'), assignedTo: 7 };
    const afterTask = { ...beforeTask, status: 'review' as const, version: 2, updatedAt: '2026-08-14T10:00:00.000Z' };
    queryClient.setQueryData(['my-work', 7], {
      items: [beforeTask],
      counts: { todo: 1, inProgress: 0, review: 0, approvalRequired: 0, overdue: 0, dueToday: 0, dueSoon: 0 },
      pageInfo: {},
    });
    const event: RealtimeDomainEvent = {
      name: 'task:updated',
      data: {
        schemaVersion: 2,
        occurredAt: afterTask.updatedAt,
        task: afterTask,
        changes: [{ taskId: 'a', version: 2, before: taskProjectionFromTask(beforeTask), after: taskProjectionFromTask(afterTask), changedFields: ['status'] }],
      },
    };
    expect(applyRealtimeEventToCache(queryClient, event, 7)).toEqual([]);
    expect(queryClient.getQueryData<MyWorkResponse>(['my-work', 7])?.counts).toMatchObject({ todo: 0, review: 1 });
  });

  it('does not patch unordered legacy payloads and returns targeted fallbacks', () => {
    const queryClient = new QueryClient();
    const queryKey = ['tasks', { status: 'todo', page: 1 }] as const;
    queryClient.setQueryData(queryKey, list([task('a')]));
    const event: RealtimeDomainEvent = { name: 'task:updated', data: { taskId: 'a', status: 'done' } };
    const fallbacks = applyRealtimeEventToCache(queryClient, event, 7);
    expect(queryClient.getQueryData<TaskListResponse>(queryKey)?.tasks[0].status).toBe('todo');
    expect(fallbacks).toContainEqual(queryKey);
    expect(fallbacks).toContainEqual(['task-detail', 'a']);
  });
});
