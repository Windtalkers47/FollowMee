import { MigrationInterface, QueryRunner, TableIndex } from 'typeorm';

/**
 * Migration: Add Notification Indexes
 * 
 * Adds indexes for better query performance on notification and notification_recipients tables.
 * 
 * P1-INDEXES: Performance optimization for notification queries
 */
export class AddNotificationIndexes1719388900000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Index on notification_recipients for userId + isRead + isDeleted (common query pattern)
    await queryRunner.createIndex('notification_recipients', new TableIndex({
      name: 'IDX_notification_recipients_user_read_deleted',
      columnNames: ['userId', 'isRead', 'isDeleted'],
    }));

    // Index on notification_recipients for notificationId (for joins)
    await queryRunner.createIndex('notification_recipients', new TableIndex({
      name: 'IDX_notification_recipients_notificationId',
      columnNames: ['notificationId'],
    }));

    // Index on notifications for notificationType + entityType + entityId (for deduplication)
    await queryRunner.createIndex('notifications', new TableIndex({
      name: 'IDX_notifications_type_entity',
      columnNames: ['notificationType', 'entityType', 'entityId'],
    }));

    // Index on notifications for actorUserId (for filtering by actor)
    await queryRunner.createIndex('notifications', new TableIndex({
      name: 'IDX_notifications_actorUserId',
      columnNames: ['actorUserId'],
    }));

    // Index on notifications for createdAt (for time-based queries)
    await queryRunner.createIndex('notifications', new TableIndex({
      name: 'IDX_notifications_createdAt',
      columnNames: ['createdAt'],
    }));

    console.log('Migration: notification indexes created successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('notification_recipients', 'IDX_notification_recipients_user_read_deleted');
    await queryRunner.dropIndex('notification_recipients', 'IDX_notification_recipients_notificationId');
    await queryRunner.dropIndex('notifications', 'IDX_notifications_type_entity');
    await queryRunner.dropIndex('notifications', 'IDX_notifications_actorUserId');
    await queryRunner.dropIndex('notifications', 'IDX_notifications_createdAt');

    console.log('Migration: notification indexes dropped successfully');
  }
}