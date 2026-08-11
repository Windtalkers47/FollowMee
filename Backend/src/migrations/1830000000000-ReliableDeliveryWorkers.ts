import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReliableDeliveryWorkers1830000000000 implements MigrationInterface {
  name = 'ReliableDeliveryWorkers1830000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE outbox_events
        MODIFY COLUMN idempotencyKey VARCHAR(190) NOT NULL,
        MODIFY COLUMN status ENUM('pending','processing','processed','failed','dead') NOT NULL DEFAULT 'pending',
        MODIFY COLUMN lastError VARCHAR(1000) NULL,
        ADD COLUMN IF NOT EXISTS lockedBy VARCHAR(100) NULL AFTER lockedAt,
        ADD COLUMN IF NOT EXISTS deadAt DATETIME NULL AFTER processedAt
    `);

    const outboxIndexes = await queryRunner.query(`
      SELECT INDEX_NAME AS indexName, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS columns
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'outbox_events'
      GROUP BY INDEX_NAME
    `) as Array<{ indexName: string; columns: string }>;
    const outboxIndexColumns = new Set(outboxIndexes.map(row => row.columns));
    if (!outboxIndexColumns.has('status,nextAttemptAt,eventId')) {
      await queryRunner.query('CREATE INDEX idx_outbox_claim ON outbox_events(status,nextAttemptAt,eventId)');
    }
    if (!outboxIndexColumns.has('aggregateType,aggregateId')) {
      await queryRunner.query('CREATE INDEX idx_outbox_aggregate ON outbox_events(aggregateType,aggregateId)');
    }

    await queryRunner.query(`
      ALTER TABLE notification_queue
        ADD COLUMN IF NOT EXISTS deduplicationKey VARCHAR(255) NULL AFTER queueId,
        ADD COLUMN IF NOT EXISTS status ENUM('pending','processing','failed','dead') NOT NULL DEFAULT 'pending' AFTER groupActorUserIds,
        ADD COLUMN IF NOT EXISTS attempts INT NOT NULL DEFAULT 0 AFTER status,
        ADD COLUMN IF NOT EXISTS nextAttemptAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER attempts,
        ADD COLUMN IF NOT EXISTS lockedAt DATETIME NULL AFTER nextAttemptAt,
        ADD COLUMN IF NOT EXISTS lockedBy VARCHAR(100) NULL AFTER lockedAt,
        ADD COLUMN IF NOT EXISTS lastError VARCHAR(1000) NULL AFTER lockedBy,
        ADD COLUMN IF NOT EXISTS deadAt DATETIME NULL AFTER lastError,
        ADD COLUMN IF NOT EXISTS updatedAt TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) AFTER createdAt
    `);

    const queueIndexes = await queryRunner.query(`
      SELECT INDEX_NAME AS indexName, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS columns
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notification_queue'
      GROUP BY INDEX_NAME
    `) as Array<{ indexName: string; columns: string }>;
    const queueIndexNames = new Set(queueIndexes.map(row => row.indexName));
    const queueIndexColumns = new Set(queueIndexes.map(row => row.columns));
    if (!queueIndexNames.has('uq_notification_queue_deduplication')) {
      await queryRunner.query('CREATE UNIQUE INDEX uq_notification_queue_deduplication ON notification_queue(deduplicationKey)');
    }
    if (!queueIndexColumns.has('status,nextAttemptAt,queueId')) {
      await queryRunner.query('CREATE INDEX idx_notification_queue_dispatch ON notification_queue(status,nextAttemptAt,queueId)');
    }

    await queryRunner.query(`
      ALTER TABLE task_images
        ADD COLUMN IF NOT EXISTS copiedFromImageId INT NULL AFTER imageId
    `);
    const taskImageIndexes = await queryRunner.query(`
      SELECT INDEX_NAME AS indexName, NON_UNIQUE AS nonUnique,
             GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS columns
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'task_images'
      GROUP BY INDEX_NAME,NON_UNIQUE
    `) as Array<{ indexName: string; nonUnique: number; columns: string }>;
    if (!taskImageIndexes.some(row => Number(row.nonUnique) === 0 && row.columns === 'taskId,copiedFromImageId')) {
      await queryRunner.query('CREATE UNIQUE INDEX uq_task_images_copy_source ON task_images(taskId,copiedFromImageId)');
    }
    const taskImageConstraints = await queryRunner.query(`
      SELECT CONSTRAINT_NAME AS constraintName
      FROM information_schema.REFERENTIAL_CONSTRAINTS
      WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'task_images'
    `) as Array<{ constraintName: string }>;
    if (!taskImageConstraints.some(row => row.constraintName === 'fk_task_images_copy_source')) {
      await queryRunner.query(`
        ALTER TABLE task_images ADD CONSTRAINT fk_task_images_copy_source
        FOREIGN KEY (copiedFromImageId) REFERENCES task_images(imageId) ON DELETE SET NULL
      `);
    }
  }

  public async down(): Promise<void> {
    // Forward-only reliability migration. Recovery uses a verified restore and
    // forward fix; it must not remove delivery state from a live database.
  }
}
