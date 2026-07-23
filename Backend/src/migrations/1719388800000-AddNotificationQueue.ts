import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * Migration: Add Notification Queue Table
 * 
 * Creates the notification_queue table for persistent notification aggregation.
 * This ensures notifications are not lost on server restart.
 * 
 * W2-RATE-LIMIT: Database-backed queue for production readiness
 */
export class AddNotificationQueue1719388800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create notification_queue table
    await queryRunner.createTable(new Table({
      name: 'notification_queue',
      columns: [
        {
          name: 'queueId',
          type: 'int',
          isPrimary: true,
          isGenerated: true,
          generationStrategy: 'increment',
        },
        {
          name: 'notificationType',
          type: 'varchar',
          length: '50',
          isNullable: false,
        },
        {
          name: 'entityType',
          type: 'varchar',
          length: '50',
          isNullable: false,
        },
        {
          name: 'entityId',
          type: 'varchar',
          length: '100',
          isNullable: false,
        },
        {
          name: 'recipientUserId',
          type: 'int',
          isNullable: false,
        },
        {
          name: 'actorUserIds',
          type: 'text',
          isNullable: false,
          comment: 'JSON string of number[]',
        },
        {
          name: 'title',
          type: 'varchar',
          length: '255',
          isNullable: false,
        },
        {
          name: 'baseMessage',
          type: 'text',
          isNullable: false,
          comment: 'Base message template',
        },
        {
          name: 'actionUrl',
          type: 'varchar',
          length: '500',
          isNullable: true,
        },
        {
          name: 'imageUrl',
          type: 'varchar',
          length: '512',
          isNullable: true,
        },
        {
          name: 'isSystem',
          type: 'boolean',
          default: false,
          isNullable: false,
        },
        {
          name: 'isGlobal',
          type: 'boolean',
          default: false,
          isNullable: false,
        },
        {
          name: 'createdAt',
          type: 'timestamp',
          default: 'CURRENT_TIMESTAMP',
          isNullable: false,
        },
        {
          name: 'groupActorUserIds',
          type: 'text',
          isNullable: true,
          comment: 'JSON string of number[] for additional actors',
        },
      ],
    }), true);

    // Create composite index for key lookup
    await queryRunner.createIndex('notification_queue', new TableIndex({
      name: 'IDX_notification_queue_key',
      columnNames: ['notificationType', 'entityType', 'entityId', 'recipientUserId'],
    }));

    // Create index for createdAt (for cleanup and ordering)
    await queryRunner.createIndex('notification_queue', new TableIndex({
      name: 'IDX_notification_queue_createdAt',
      columnNames: ['createdAt'],
    }));

    console.log('Migration: notification_queue table created successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes first
    await queryRunner.dropIndex('notification_queue', 'IDX_notification_queue_key');
    await queryRunner.dropIndex('notification_queue', 'IDX_notification_queue_createdAt');

    // Drop table
    await queryRunner.dropTable('notification_queue');

    console.log('Migration: notification_queue table dropped successfully');
  }
}