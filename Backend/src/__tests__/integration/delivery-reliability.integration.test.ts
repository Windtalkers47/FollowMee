import dataSource from '../../config/database';
import { NotificationQueueService } from '../../services/notification-queue.service';
import { OutboxService } from '../../services/outbox.service';

describe('persistent delivery workers', () => {
  beforeAll(async () => {
    await dataSource.initialize();
  });

  beforeEach(async () => {
    await dataSource.query('DELETE FROM notification_queue');
    await dataSource.query('DELETE FROM outbox_events');
  });

  afterAll(async () => {
    if (dataSource.isInitialized) await dataSource.destroy();
  });

  it('enqueues an outbox idempotency key once and processes it once across concurrent drains', async () => {
    const service = new OutboxService();
    const handler = jest.fn().mockResolvedValue(undefined);
    service.register('test.concurrent', handler);

    const firstId = await service.enqueue({
      eventType: 'test.concurrent', payload: { value: 1 }, idempotencyKey: 'delivery-test:concurrent',
    });
    const duplicateId = await service.enqueue({
      eventType: 'test.concurrent', payload: { value: 1 }, idempotencyKey: 'delivery-test:concurrent',
    });

    expect(firstId).not.toBeNull();
    expect(duplicateId).toBeNull();
    await Promise.all([service.drain(), service.drain()]);

    expect(handler).toHaveBeenCalledTimes(1);
    const rows = await dataSource.query("SELECT status,attempts FROM outbox_events WHERE idempotencyKey='delivery-test:concurrent'");
    expect(rows).toMatchObject([{ status: 'processed', attempts: 1 }]);
  });

  it('retries a failed outbox event and succeeds without duplicating the event', async () => {
    const service = new OutboxService();
    let shouldFail = true;
    const handler = jest.fn(async () => {
      if (shouldFail) throw new Error('temporary provider failure');
    });
    service.register('test.retry', handler);
    await service.enqueue({ eventType: 'test.retry', payload: {}, idempotencyKey: 'delivery-test:retry' });

    await service.drain();
    let rows = await dataSource.query("SELECT status,attempts,lastError FROM outbox_events WHERE idempotencyKey='delivery-test:retry'");
    expect(rows[0]).toMatchObject({ status: 'failed', attempts: 1, lastError: 'temporary provider failure' });

    shouldFail = false;
    await dataSource.query("UPDATE outbox_events SET nextAttemptAt=NOW() WHERE idempotencyKey='delivery-test:retry'");
    await service.drain();
    rows = await dataSource.query("SELECT status,attempts FROM outbox_events WHERE idempotencyKey='delivery-test:retry'");
    expect(rows[0]).toMatchObject({ status: 'processed', attempts: 2 });
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('recovers a stale outbox lease and bounds permanent failures with dead letter', async () => {
    const service = new OutboxService();
    service.register('test.dead', jest.fn().mockRejectedValue(new Error('permanent failure')));
    await service.enqueue({ eventType: 'test.dead', payload: {}, idempotencyKey: 'delivery-test:dead' });
    await dataSource.query(`
      UPDATE outbox_events SET status='processing',attempts=7,lockedAt=DATE_SUB(NOW(), INTERVAL 20 MINUTE),lockedBy='dead-worker'
      WHERE idempotencyKey='delivery-test:dead'
    `);

    expect(await service.reconcile()).toBe(1);
    await service.drain();
    const rows = await dataSource.query("SELECT status,attempts,deadAt FROM outbox_events WHERE idempotencyKey='delivery-test:dead'");
    expect(rows[0].status).toBe('dead');
    expect(Number(rows[0].attempts)).toBe(8);
    expect(rows[0].deadAt).toBeTruthy();
  });

  it('deduplicates queued notifications and delivers once across concurrent drains', async () => {
    const service = new NotificationQueueService();
    const createNotification = jest.fn().mockResolvedValue(undefined);
    service.initialize({ createNotification } as any);
    const dto = {
      notificationType: 'TASK_LIKE', entityType: 'task', entityId: 'delivery-task',
      actorUserId: 1, recipientUserIds: [2], title: 'Task liked', message: 'Someone liked your task',
    };

    await service.queueNotification(dto);
    await service.queueNotification(dto);
    let rows = await dataSource.query("SELECT queueId FROM notification_queue WHERE deduplicationKey='TASK_LIKE:task:delivery-task:2'");
    expect(rows).toHaveLength(1);

    await dataSource.query("UPDATE notification_queue SET nextAttemptAt=NOW() WHERE deduplicationKey='TASK_LIKE:task:delivery-task:2'");
    await Promise.all([service.drain(), service.drain()]);
    expect(createNotification).toHaveBeenCalledTimes(1);
    rows = await dataSource.query("SELECT queueId FROM notification_queue WHERE deduplicationKey='TASK_LIKE:task:delivery-task:2'");
    expect(rows).toHaveLength(0);
  });

  it('recovers a stale notification lease and dead-letters a permanent failure', async () => {
    const service = new NotificationQueueService();
    service.initialize({ createNotification: jest.fn().mockRejectedValue(new Error('provider unavailable')) } as any);
    await service.queueNotification({
      notificationType: 'TASK_COMMENT', entityType: 'task', entityId: 'dead-notification',
      actorUserId: 1, recipientUserIds: [2], title: 'Comment', message: 'New comment',
    });
    await dataSource.query(`
      UPDATE notification_queue
      SET status='processing',attempts=7,lockedAt=DATE_SUB(NOW(), INTERVAL 20 MINUTE),lockedBy='stale-worker'
      WHERE deduplicationKey='TASK_COMMENT:task:dead-notification:2'
    `);

    expect(await service.reconcile()).toBe(1);
    await service.drain();
    const rows = await dataSource.query(`
      SELECT status,attempts,deadAt FROM notification_queue
      WHERE deduplicationKey='TASK_COMMENT:task:dead-notification:2'
    `);
    expect(rows[0].status).toBe('dead');
    expect(Number(rows[0].attempts)).toBe(8);
    expect(rows[0].deadAt).toBeTruthy();
    expect(await service.getHealth()).toMatchObject({ dead: 1, staleProcessing: 0 });
  });
});
