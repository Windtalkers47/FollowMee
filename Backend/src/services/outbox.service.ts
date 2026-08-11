import crypto from 'crypto';
import AppDataSource from '../config/database';
import { logger } from '../utils/logger';

export interface OutboxEventInput {
  eventType: string;
  aggregateType?: string;
  aggregateId?: string | number;
  payload: Record<string, unknown>;
  idempotencyKey?: string;
}

export interface DeliveryHealth {
  pending: number;
  processing: number;
  failed: number;
  dead: number;
  staleProcessing: number;
  oldestReadyAt: string | null;
}

type OutboxHandler = (payload: Record<string, unknown>) => Promise<void>;
type OutboxEvent = {
  eventId: number;
  eventType: string;
  payload: string | Record<string, unknown>;
  attempts: number;
};

export const DELIVERY_MAX_ATTEMPTS = 8;
export const DELIVERY_LEASE_MINUTES = 15;

export const calculateDeliveryBackoffMinutes = (attempts: number): number =>
  Math.min(360, 2 ** Math.min(Math.max(1, attempts), 8));

export const deliveryFailureStatus = (attempts: number): 'failed' | 'dead' =>
  attempts >= DELIVERY_MAX_ATTEMPTS ? 'dead' : 'failed';

export class OutboxService {
  private timer: NodeJS.Timeout | null = null;
  private activeDrain: Promise<void> | null = null;
  private readonly handlers = new Map<string, OutboxHandler>();
  private readonly workerId = `outbox-${process.pid}-${crypto.randomUUID()}`.slice(0, 100);

  register(eventType: string, handler: OutboxHandler): void {
    this.handlers.set(eventType, handler);
  }

  async enqueue(input: OutboxEventInput, manager = AppDataSource.manager): Promise<number | null> {
    const key = input.idempotencyKey || `${input.eventType}:${crypto.randomUUID()}`;
    const result = await manager.query(`
      INSERT IGNORE INTO outbox_events
        (eventType,aggregateType,aggregateId,payload,idempotencyKey)
      VALUES (?,?,?,?,?)
    `, [
      input.eventType,
      input.aggregateType || null,
      input.aggregateId == null ? null : String(input.aggregateId),
      JSON.stringify(input.payload),
      key,
    ]);
    return Number(result?.insertId || 0) || null;
  }

  start(): void {
    if (this.timer) return;
    void this.reconcile().then(() => this.drain()).catch(error => {
      logger.error(`Outbox startup reconciliation failed: ${error instanceof Error ? error.message : String(error)}`);
    });
    this.timer = setInterval(() => {
      void this.drain().catch(error => {
        logger.error(`Outbox drain failed: ${error instanceof Error ? error.message : String(error)}`);
      });
    }, 5_000);
    this.timer.unref?.();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private async claimNext(): Promise<OutboxEvent | null> {
    const runner = AppDataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      const rows = await runner.query(`
        SELECT eventId,eventType,payload,attempts FROM outbox_events
        WHERE status IN ('pending','failed') AND nextAttemptAt <= NOW()
        ORDER BY eventId ASC LIMIT 1 FOR UPDATE
      `) as OutboxEvent[];
      const event = rows[0];
      if (!event) {
        await runner.commitTransaction();
        return null;
      }
      await runner.query(`
        UPDATE outbox_events
        SET status='processing', lockedAt=NOW(), lockedBy=?, attempts=attempts+1, lastError=NULL
        WHERE eventId=?
      `, [this.workerId, event.eventId]);
      await runner.commitTransaction();
      return { ...event, attempts: Number(event.attempts || 0) + 1 };
    } catch (error) {
      await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
  }

  async drain(limit = 25): Promise<void> {
    if (this.activeDrain) return this.activeDrain;
    const run = this.drainInternal(limit).finally(() => {
      if (this.activeDrain === run) this.activeDrain = null;
    });
    this.activeDrain = run;
    return run;
  }

  private async drainInternal(limit: number): Promise<void> {
    for (let index = 0; index < limit; index += 1) {
      const event = await this.claimNext();
      if (!event) return;
      const handler = this.handlers.get(String(event.eventType));
      if (!handler) {
        await this.recordFailure(event, 'No handler registered');
        continue;
      }
      try {
        const payload = typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload;
        await handler(payload || {});
        await AppDataSource.query(`
          UPDATE outbox_events
          SET status='processed', processedAt=NOW(), lockedAt=NULL, lockedBy=NULL, deadAt=NULL, lastError=NULL
          WHERE eventId=? AND status='processing' AND lockedBy=?
        `, [event.eventId, this.workerId]);
      } catch (error) {
        await this.recordFailure(event, error instanceof Error ? error.message : String(error));
      }
    }
  }

  private async recordFailure(event: OutboxEvent, message: string): Promise<void> {
    const status = deliveryFailureStatus(event.attempts);
    const delayMinutes = calculateDeliveryBackoffMinutes(event.attempts);
    await AppDataSource.query(`
      UPDATE outbox_events
      SET status=?, lockedAt=NULL, lockedBy=NULL, lastError=?,
          deadAt=CASE WHEN ?='dead' THEN NOW() ELSE NULL END,
          nextAttemptAt=CASE WHEN ?='dead' THEN nextAttemptAt ELSE DATE_ADD(NOW(), INTERVAL ? MINUTE) END
      WHERE eventId=? AND status='processing' AND lockedBy=?
    `, [status, message.slice(0, 1000), status, status, delayMinutes, event.eventId, this.workerId]);
    if (status === 'dead') {
      logger.error(`Outbox event ${event.eventId} (${event.eventType}) moved to dead letter after ${event.attempts} attempts.`);
    } else {
      logger.warn(`Outbox event ${event.eventId} (${event.eventType}) failed; retry scheduled.`);
    }
  }

  async reconcile(): Promise<number> {
    const result = await AppDataSource.query(`
      UPDATE outbox_events
      SET status='failed', lockedAt=NULL, lockedBy=NULL,
          lastError='Recovered stale processing lease', nextAttemptAt=NOW()
      WHERE status='processing' AND lockedAt < DATE_SUB(NOW(), INTERVAL ${DELIVERY_LEASE_MINUTES} MINUTE)
    `);
    return Number(result?.affectedRows || 0);
  }

  async getHealth(): Promise<DeliveryHealth> {
    const rows = await AppDataSource.query(`
      SELECT
        SUM(status='pending') AS pending,
        SUM(status='processing') AS processing,
        SUM(status='failed') AS failed,
        SUM(status='dead') AS dead,
        SUM(status='processing' AND lockedAt < DATE_SUB(NOW(), INTERVAL ${DELIVERY_LEASE_MINUTES} MINUTE)) AS staleProcessing,
        MIN(CASE WHEN status IN ('pending','failed') THEN nextAttemptAt END) AS oldestReadyAt
      FROM outbox_events
    `);
    const row = rows[0] || {};
    return {
      pending: Number(row.pending || 0),
      processing: Number(row.processing || 0),
      failed: Number(row.failed || 0),
      dead: Number(row.dead || 0),
      staleProcessing: Number(row.staleProcessing || 0),
      oldestReadyAt: row.oldestReadyAt ? new Date(row.oldestReadyAt).toISOString() : null,
    };
  }
}

export const outboxService = new OutboxService();
