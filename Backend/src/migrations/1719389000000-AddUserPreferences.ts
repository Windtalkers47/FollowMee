import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * Migration to add user preferences columns to user_notification_settings table
 * U4-PREFERENCES: Do Not Disturb, Digest mode, Quiet hours, Priority filtering
 */
export class AddUserPreferences1719389000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add doNotDisturbEnabled column
    await queryRunner.addColumn(
      'user_notification_settings',
      new TableColumn({
        name: 'doNotDisturbEnabled',
        type: 'boolean',
        default: false,
      })
    );

    // Add digestMode column
    await queryRunner.addColumn(
      'user_notification_settings',
      new TableColumn({
        name: 'digestMode',
        type: 'varchar',
        length: '20',
        default: "'none'",
      })
    );

    // Add quietHoursStart column
    await queryRunner.addColumn(
      'user_notification_settings',
      new TableColumn({
        name: 'quietHoursStart',
        type: 'int',
        default: 22,
        isNullable: true,
      })
    );

    // Add quietHoursEnd column
    await queryRunner.addColumn(
      'user_notification_settings',
      new TableColumn({
        name: 'quietHoursEnd',
        type: 'int',
        default: 7,
        isNullable: true,
      })
    );

    // Add priorityFilter column
    await queryRunner.addColumn(
      'user_notification_settings',
      new TableColumn({
        name: 'priorityFilter',
        type: 'varchar',
        length: '20',
        default: "'all'",
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('user_notification_settings', 'doNotDisturbEnabled');
    await queryRunner.dropColumn('user_notification_settings', 'digestMode');
    await queryRunner.dropColumn('user_notification_settings', 'quietHoursStart');
    await queryRunner.dropColumn('user_notification_settings', 'quietHoursEnd');
    await queryRunner.dropColumn('user_notification_settings', 'priorityFilter');
  }
}