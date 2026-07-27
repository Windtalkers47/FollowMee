import { MigrationInterface, QueryRunner } from 'typeorm';

export class OptimizeNotificationInbox1794000000000 implements MigrationInterface {
  name = 'OptimizeNotificationInbox1794000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const indexes: Array<{ Key_name: string }> = await queryRunner.query(
      'SHOW INDEX FROM `notification_recipients`'
    );
    const names = new Set(indexes.map(index => index.Key_name));
    if (!names.has('uq_notification_recipients_notification_user')) {
      // Older installations could contain duplicate deliveries from reconnects.
      // Keep the oldest recipient row so the unique index can be applied safely.
      await queryRunner.query(
        `DELETE duplicateRecipient
         FROM notification_recipients duplicateRecipient
         INNER JOIN notification_recipients originalRecipient
           ON duplicateRecipient.notificationId = originalRecipient.notificationId
          AND duplicateRecipient.userId = originalRecipient.userId
          AND duplicateRecipient.recipientId > originalRecipient.recipientId`
      );
      await queryRunner.query(
        'ALTER TABLE `notification_recipients` ADD UNIQUE INDEX `uq_notification_recipients_notification_user` (`notificationId`, `userId`)'
      );
    }
    if (!names.has('idx_notification_recipients_inbox')) {
      await queryRunner.query(
        'ALTER TABLE `notification_recipients` ADD INDEX `idx_notification_recipients_inbox` (`userId`, `isDeleted`, `isArchived`, `isRead`, `deliveredAt`)'
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `notification_recipients` DROP INDEX `idx_notification_recipients_inbox`'
    );
    await queryRunner.query(
      'ALTER TABLE `notification_recipients` DROP INDEX `uq_notification_recipients_notification_user`'
    );
  }
}
