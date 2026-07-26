import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

export class AddVerifiedTaskScoring1793000000000 implements MigrationInterface {
  name = 'AddVerifiedTaskScoring1793000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('tasks');
    if (!table) return;

    if (!table.findColumnByName('completedAt')) {
      await queryRunner.addColumn('tasks', new TableColumn({
        name: 'completedAt',
        type: 'datetime',
        isNullable: true,
      }));
    }
    if (!table.findColumnByName('completionScore')) {
      await queryRunner.addColumn('tasks', new TableColumn({
        name: 'completionScore',
        type: 'int',
        default: 0,
      }));
    }
    if (!table.findColumnByName('reopenedCount')) {
      await queryRunner.addColumn('tasks', new TableColumn({
        name: 'reopenedCount',
        type: 'int',
        default: 0,
      }));
    }

    await queryRunner.query(`
      UPDATE tasks
      SET completedAt = COALESCE(completedAt, updatedAt),
          completionScore = CASE
            WHEN completionScore > 0 THEN completionScore
            WHEN dueDate IS NOT NULL AND updatedAt <= dueDate THEN 13
            ELSE 10
          END
      WHERE status = 'done' AND isActive = 1
    `);

    const refreshed = await queryRunner.getTable('tasks');
    if (refreshed && !refreshed.indices.some(index => index.name === 'idx_tasks_leaderboard')) {
      await queryRunner.createIndex('tasks', new TableIndex({
        name: 'idx_tasks_leaderboard',
        columnNames: ['status', 'assignedTo', 'completionScore', 'completedAt'],
      }));
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('tasks');
    if (!table) return;
    const index = table.indices.find(item => item.name === 'idx_tasks_leaderboard');
    if (index) await queryRunner.dropIndex('tasks', index);
    for (const column of ['reopenedCount', 'completionScore', 'completedAt']) {
      if ((await queryRunner.getTable('tasks'))?.findColumnByName(column)) {
        await queryRunner.dropColumn('tasks', column);
      }
    }
  }
}
