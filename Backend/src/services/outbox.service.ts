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

type OutboxHandler = (payload: Record<string, unknown>) => Promise<void>;

export class OutboxService {
  private timer: NodeJS.Timeout | null = null;
  private readonly handlers = new Map<string, OutboxHandler>();

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
    void this.reconcile();
    void this.drain();
    this.timer = setInterval(() => void this.drain(), 5_000);
    this.timer.unref?.();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private async claimNext(): Promise<any | null> {
    const runner = AppDataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      const rows = await runner.query(`
        SELECT * FROM outbox_events
        WHERE status IN ('pending','failed') AND nextAttemptAt <= NOW()
        ORDER BY eventId ASC LIMIT 1 FOR UPDATE
      `);
      const event = rows[0];
      if (!event) {
        await runner.commitTransaction();
        return null;
      }
      await runner.query(`
        UPDATE outbox_events
        SET status='processing', lockedAt=NOW(), attempts=attempts+1, lastError=NULL
        WHERE eventId=?
      `, [event.eventId]);
      await runner.commitTransaction();
      return event;
    } catch (error) {
      await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
  }

  async drain(limit = 25): Promise<void> {
    for (let index = 0; index < limit; index += 1) {
      const event = await this.claimNext();
      if (!event) return;
      const handler = this.handlers.get(String(event.eventType));
      if (!handler) {
        await AppDataSource.query(`
          UPDATE outbox_events SET status='failed', lastError='No handler registered',
            nextAttemptAt=DATE_ADD(NOW(), INTERVAL 1 HOUR) WHERE eventId=?
        `, [event.eventId]);
        continue;
      }
      try {
        const payload = typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload;
        await handler(payload || {});
        await AppDataSource.query(`UPDATE outbox_events SET status='processed', processedAt=NOW(), lockedAt=NULL WHERE eventId=?`, [event.eventId]);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const delayMinutes = Math.min(360, 2 ** Math.min(Number(event.attempts || 0) + 1, 8));
        await AppDataSource.query(`
          UPDATE outbox_events SET status='failed', lockedAt=NULL, lastError=?,
            nextAttemptAt=DATE_ADD(NOW(), INTERVAL ? MINUTE) WHERE eventId=?
        `, [message.slice(0, 500), delayMinutes, event.eventId]);
        logger.warn(`Outbox event ${event.eventId} (${event.eventType}) failed; retry scheduled.`);
      }
    }
  }

  async reconcile(): Promise<void> {
    await AppDataSource.query(`
      UPDATE outbox_events
      SET status='failed', lockedAt=NULL, lastError='Recovered stale processing lease', nextAttemptAt=NOW()
      WHERE status='processing' AND lockedAt < DATE_SUB(NOW(), INTERVAL 15 MINUTE)
    `);
  }
}

export const outboxService = new OutboxService();
