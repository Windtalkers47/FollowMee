import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Restores the database-generated identity expected by User.userId.
 *
 * Some legacy FollowMee databases had a primary users.userId column without
 * AUTO_INCREMENT. TypeORM could insert the row, but MySQL returned no generated
 * id and registration failed before a session could be created.
 */
export class RepairUserIdentity1792000000000 implements MigrationInterface {
  name = 'RepairUserIdentity1792000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const rows = await queryRunner.query(`
      SELECT EXTRA
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'users'
        AND COLUMN_NAME = 'userId'
    `);
    const extra = String(rows?.[0]?.EXTRA || '').toLowerCase();
    if (!extra.includes('auto_increment')) {
      await queryRunner.query(`
        ALTER TABLE users
        MODIFY userId INT NOT NULL AUTO_INCREMENT
      `);
    }
  }

  public async down(): Promise<void> {
    // Deliberately irreversible: removing AUTO_INCREMENT would break registration.
  }
}
