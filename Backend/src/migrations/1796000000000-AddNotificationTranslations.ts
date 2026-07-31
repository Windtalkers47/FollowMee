import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotificationTranslations1796000000000 implements MigrationInterface {
  name = 'AddNotificationTranslations1796000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`notifications\`
        ADD COLUMN \`titleKey\` VARCHAR(120) NULL AFTER \`message\`,
        ADD COLUMN \`messageKey\` VARCHAR(120) NULL AFTER \`titleKey\`,
        ADD COLUMN \`translationParams\` JSON NULL AFTER \`messageKey\`
    `);
    await queryRunner.query(`
      ALTER TABLE \`notification_queue\`
        ADD COLUMN \`titleKey\` VARCHAR(120) NULL AFTER \`baseMessage\`,
        ADD COLUMN \`messageKey\` VARCHAR(120) NULL AFTER \`titleKey\`,
        ADD COLUMN \`translationParams\` JSON NULL AFTER \`messageKey\`
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`notification_queue\`
        DROP COLUMN \`translationParams\`,
        DROP COLUMN \`messageKey\`,
        DROP COLUMN \`titleKey\`
    `);
    await queryRunner.query(`
      ALTER TABLE \`notifications\`
        DROP COLUMN \`translationParams\`,
        DROP COLUMN \`messageKey\`,
        DROP COLUMN \`titleKey\`
    `);
  }
}
