import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddProfileChangedNotificationPreference1797000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('user_notification_settings');
    if (table && !table.findColumnByName('notifyProfileChanged')) {
      await queryRunner.addColumn('user_notification_settings', new TableColumn({
        name: 'notifyProfileChanged',
        type: 'boolean',
        default: true,
        isNullable: false,
      }));
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('user_notification_settings');
    if (table?.findColumnByName('notifyProfileChanged')) {
      await queryRunner.dropColumn('user_notification_settings', 'notifyProfileChanged');
    }
  }
}
