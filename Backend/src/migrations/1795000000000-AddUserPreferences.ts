import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserPreferences1795000000000 implements MigrationInterface {
  name = 'AddUserPreferences1795000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`user_preferences\` (
        \`preferenceId\` INT NOT NULL AUTO_INCREMENT,
        \`userId\` INT NOT NULL,
        \`locale\` ENUM('en', 'th') NOT NULL DEFAULT 'en',
        \`brandTheme\` ENUM('purple', 'green') NOT NULL DEFAULT 'purple',
        \`colorMode\` ENUM('light', 'dark', 'system') NOT NULL DEFAULT 'system',
        \`createdAt\` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
          ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`preferenceId\`),
        UNIQUE KEY \`uq_user_preferences_user\` (\`userId\`),
        CONSTRAINT \`fk_user_preferences_user\`
          FOREIGN KEY (\`userId\`) REFERENCES \`users\` (\`userId\`)
          ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `user_preferences`');
  }
}
