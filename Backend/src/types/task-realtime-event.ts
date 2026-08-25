import type { Task } from '../entities/Task';

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

export type TaskRealtimePayload = {
  schemaVersion: 2;
  occurredAt: string;
  actorUserId: number;
  changes: TaskRealtimeChange[];
  // Rolling-deploy compatibility for clients that predate schemaVersion 2.
  taskId?: string;
  taskIds: string[];
  status?: Task['status'];
  assignedTo?: number | null;
  updatedAt: string;
  revision: string;
};

const iso = (value: Date | string | null | undefined): string | null => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

export const taskRealtimeProjection = (task: Task): TaskRealtimeProjection => ({
  taskId: task.taskId,
  status: task.status,
  assignedTo: task.assignedTo ?? null,
  createdBy: task.createdBy,
  version: Number(task.version),
  isActive: Boolean(task.isActive),
  title: task.title,
  dueDate: iso(task.dueDate),
  startDate: iso(task.startDate),
  endDate: iso(task.endDate),
  updatedAt: iso(task.updatedAt) || new Date().toISOString(),
  blockedAt: iso(task.blockedAt),
  blockedReason: task.blockedReason ?? null,
});

export const cloneTaskRealtimeProjection = (task: Task): TaskRealtimeProjection =>
  taskRealtimeProjection(task);

export const taskRealtimeChange = (
  before: TaskRealtimeProjection | Task | null,
  after: TaskRealtimeProjection | Task | null,
  changedFields: string[],
  resultingVersion?: number,
): TaskRealtimeChange => {
  const previous = before && 'taskId' in before && typeof before.updatedAt === 'string'
    ? before as TaskRealtimeProjection
    : before ? taskRealtimeProjection(before as Task) : null;
  const current = after && 'taskId' in after && typeof after.updatedAt === 'string'
    ? after as TaskRealtimeProjection
    : after ? taskRealtimeProjection(after as Task) : null;
  const source = current || previous;
  if (!source) throw new Error('A realtime task change requires a before or after state');
  return {
    taskId: source.taskId,
    version: resultingVersion ?? current?.version ?? previous!.version,
    before: previous,
    after: current,
    changedFields: [...new Set(changedFields)],
  };
};

export const taskRealtimePayload = (
  actorUserId: number,
  changes: TaskRealtimeChange[],
): TaskRealtimePayload => {
  const occurredAt = new Date().toISOString();
  const only = changes.length === 1 ? changes[0] : undefined;
  const latest = only?.after || only?.before;
  const statuses = [...new Set(changes.map(change => change.after?.status).filter((status): status is Task['status'] => Boolean(status)))];
  const assignees = [...new Set(changes.map(change => change.after?.assignedTo))];
  const sortedUpdatedAt = changes
    .map(change => change.after?.updatedAt || change.before?.updatedAt)
    .filter((value): value is string => Boolean(value))
    .sort();
  const latestUpdatedAt = sortedUpdatedAt[sortedUpdatedAt.length - 1];
  return {
    schemaVersion: 2,
    occurredAt,
    actorUserId,
    changes,
    taskId: only?.taskId,
    taskIds: changes.map(change => change.taskId),
    status: statuses.length === 1 ? statuses[0] : only?.after?.status,
    assignedTo: assignees.length === 1 ? assignees[0] : only?.after?.assignedTo,
    updatedAt: latest?.updatedAt || latestUpdatedAt || occurredAt,
    revision: occurredAt,
  };
};
