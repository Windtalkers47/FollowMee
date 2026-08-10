import { MigrationInterface, QueryRunner } from 'typeorm';

export class OptimizeWorkLists1820000000000 implements MigrationInterface {
  name = 'OptimizeWorkLists1820000000000';

  private async addIndex(queryRunner: QueryRunner, table: string, name: string, columns: string) {
    const rows = await queryRunner.query(
      `SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND INDEX_NAME=? LIMIT 1`,
      [table, name],
    );
    if (!rows.length) await queryRunner.query(`ALTER TABLE \`${table}\` ADD INDEX \`${name}\` (${columns})`);
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.addIndex(queryRunner, 'tasks', 'idx_tasks_active_updated', '`isActive`,`updatedAt`,`taskId`');
    await this.addIndex(queryRunner, 'tasks', 'idx_tasks_assignee_active_status_updated', '`assignedTo`,`isActive`,`status`,`updatedAt`,`taskId`');
    await this.addIndex(queryRunner, 'customers', 'idx_customers_status_created', '`status`,`createdAt`,`customerId`');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const [table, name] of [
      ['tasks', 'idx_tasks_active_updated'],
      ['tasks', 'idx_tasks_assignee_active_status_updated'],
      ['customers', 'idx_customers_status_created'],
    ]) {
      const rows = await queryRunner.query(
        `SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND INDEX_NAME=? LIMIT 1`,
        [table, name],
      );
      if (rows.length) await queryRunner.query(`ALTER TABLE \`${table}\` DROP INDEX \`${name}\``);
    }
  }
}
