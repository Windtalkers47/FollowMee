import { MigrationInterface, QueryRunner, TableIndex } from "typeorm";

/**
 * Migration to add missing columns to notification_recipients table.
 * 
 * This migration adds the following columns required by NotificationCleanupService:
 * - isRead (boolean, default false)
 * - readAt (timestamp, nullable)
 * - isSeen (boolean, default false)
 * - seenAt (timestamp, nullable)
 * - isArchived (boolean, default false)
 * - archivedAt (timestamp, nullable)
 * - isDeleted (boolean, default false)
 * - deletedAt (timestamp, nullable)
 */
export class AddNotificationRecipientColumns1785000000000 implements MigrationInterface {
    name = 'AddNotificationRecipientColumns1785000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Check if columns exist before adding them
        const columns = await queryRunner.query(`SHOW COLUMNS FROM notification_recipients`);
        const columnNames = columns.map((col: any) => col.Field);

        // Add isRead column
        if (!columnNames.includes('isRead')) {
            await queryRunner.query(`ALTER TABLE \`notification_recipients\` ADD COLUMN \`isRead\` boolean NOT NULL DEFAULT false`);
            console.log('[Migration] Added isRead column to notification_recipients');
        }

        // Add readAt column
        if (!columnNames.includes('readAt')) {
            await queryRunner.query(`ALTER TABLE \`notification_recipients\` ADD COLUMN \`readAt\` timestamp NULL`);
            console.log('[Migration] Added readAt column to notification_recipients');
        }

        // Add isSeen column
        if (!columnNames.includes('isSeen')) {
            await queryRunner.query(`ALTER TABLE \`notification_recipients\` ADD COLUMN \`isSeen\` boolean NOT NULL DEFAULT false`);
            console.log('[Migration] Added isSeen column to notification_recipients');
        }

        // Add seenAt column
        if (!columnNames.includes('seenAt')) {
            await queryRunner.query(`ALTER TABLE \`notification_recipients\` ADD COLUMN \`seenAt\` timestamp NULL`);
            console.log('[Migration] Added seenAt column to notification_recipients');
        }

        // Add isArchived column
        if (!columnNames.includes('isArchived')) {
            await queryRunner.query(`ALTER TABLE \`notification_recipients\` ADD COLUMN \`isArchived\` boolean NOT NULL DEFAULT false`);
            console.log('[Migration] Added isArchived column to notification_recipients');
        }

        // Add archivedAt column
        if (!columnNames.includes('archivedAt')) {
            await queryRunner.query(`ALTER TABLE \`notification_recipients\` ADD COLUMN \`archivedAt\` timestamp NULL`);
            console.log('[Migration] Added archivedAt column to notification_recipients');
        }

        // Add isDeleted column
        if (!columnNames.includes('isDeleted')) {
            await queryRunner.query(`ALTER TABLE \`notification_recipients\` ADD COLUMN \`isDeleted\` boolean NOT NULL DEFAULT false`);
            console.log('[Migration] Added isDeleted column to notification_recipients');
        }

        // Add deletedAt column
        if (!columnNames.includes('deletedAt')) {
            await queryRunner.query(`ALTER TABLE \`notification_recipients\` ADD COLUMN \`deletedAt\` timestamp NULL`);
            console.log('[Migration] Added deletedAt column to notification_recipients');
        }

        // Create indexes for better query performance
        await queryRunner.createIndex(
            'notification_recipients',
            new TableIndex({
                name: 'IDX_notification_recipients_user_read',
                columnNames: ['userId', 'isRead'],
            })
        );
        console.log('[Migration] Created index IDX_notification_recipients_user_read');

        await queryRunner.createIndex(
            'notification_recipients',
            new TableIndex({
                name: 'IDX_notification_recipients_user_seen',
                columnNames: ['userId', 'isSeen'],
            })
        );
        console.log('[Migration] Created index IDX_notification_recipients_user_seen');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes
        await queryRunner.dropIndex('notification_recipients', 'IDX_notification_recipients_user_read');
        await queryRunner.dropIndex('notification_recipients', 'IDX_notification_recipients_user_seen');

        // Drop columns
        await queryRunner.query(`ALTER TABLE \`notification_recipients\` DROP COLUMN \`isRead\``);
        await queryRunner.query(`ALTER TABLE \`notification_recipients\` DROP COLUMN \`readAt\``);
        await queryRunner.query(`ALTER TABLE \`notification_recipients\` DROP COLUMN \`isSeen\``);
        await queryRunner.query(`ALTER TABLE \`notification_recipients\` DROP COLUMN \`seenAt\``);
        await queryRunner.query(`ALTER TABLE \`notification_recipients\` DROP COLUMN \`isArchived\``);
        await queryRunner.query(`ALTER TABLE \`notification_recipients\` DROP COLUMN \`archivedAt\``);
        await queryRunner.query(`ALTER TABLE \`notification_recipients\` DROP COLUMN \`isDeleted\``);
        await queryRunner.query(`ALTER TABLE \`notification_recipients\` DROP COLUMN \`deletedAt\``);
    }
}