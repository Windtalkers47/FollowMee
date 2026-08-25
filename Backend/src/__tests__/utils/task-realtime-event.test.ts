import { Task } from '../../entities/Task';
import { TaskRepository } from '../../repositories/task.repository';
import {
  cloneTaskRealtimeProjection,
  taskRealtimeChange,
  taskRealtimePayload,
} from '../../types/task-realtime-event';

const makeTask = (taskId: string, version = 1): Task => Object.assign(new Task(), {
  taskId,
  title: `Task ${taskId}`,
  createdBy: 1,
  assignedTo: 2,
  priority: 'normal' as const,
  status: 'todo' as Task['status'],
  version,
  isActive: true,
  createdAt: new Date('2026-08-14T08:00:00.000Z'),
  updatedAt: new Date('2026-08-14T09:00:00.000Z'),
  blockedAt: null,
  blockedReason: null,
});

describe('task realtime contract', () => {
  it('normalizes dates and exposes a numeric revision for every changed entity', () => {
    const before = makeTask('a', 2);
    const after = makeTask('a', 3);
    after.status = 'review';
    const payload = taskRealtimePayload(9, [
      taskRealtimeChange(cloneTaskRealtimeProjection(before), after, ['status']),
    ]);

    expect(payload.schemaVersion).toBe(2);
    expect(payload.occurredAt).toMatch(/Z$/);
    expect(payload.updatedAt).toBe('2026-08-14T09:00:00.000Z');
    expect(payload.changes[0]).toMatchObject({ taskId: 'a', version: 3, changedFields: ['status'] });
    expect(typeof payload.changes[0].version).toBe('number');
  });

  it('contains only explicitly successful bulk changes', () => {
    const changes = [makeTask('b', 4), makeTask('a', 2)].map(task =>
      taskRealtimeChange(null, task, ['created']),
    );
    const payload = taskRealtimePayload(1, changes);
    expect(payload.taskIds).toEqual(['b', 'a']);
    expect(payload.changes.map(change => change.taskId)).toEqual(['b', 'a']);
    expect(payload.taskIds).not.toContain('failed-task');
  });
});

describe('TaskRepository.updateTaskStatus', () => {
  it('increments the entity version atomically and returns the updated task', async () => {
    const repository = new TaskRepository();
    const set = jest.fn();
    const builder: any = {
      update: jest.fn(() => builder),
      set: jest.fn((value) => { set(value); return builder; }),
      where: jest.fn(() => builder),
      andWhere: jest.fn(() => builder),
      execute: jest.fn(async () => ({ affected: 1 })),
    };
    (repository as any).repository = { createQueryBuilder: () => builder };
    const updated = makeTask('a', 2);
    jest.spyOn(repository, 'findById').mockResolvedValue(updated);

    await expect(repository.updateTaskStatus('a', 'review')).resolves.toBe(updated);
    const values = set.mock.calls[0][0];
    expect(values.version()).toBe('version + 1');
    expect(values.updatedAt()).toBe('CURRENT_TIMESTAMP');
  });
});
