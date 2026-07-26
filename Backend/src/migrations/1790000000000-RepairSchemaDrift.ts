import {
  MigrationInterface,
  QueryRunner,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class RepairSchemaDrift1790000000000 implements MigrationInterface {
  name = 'RepairSchemaDrift1790000000000';

  private async refreshTable(queryRunner: QueryRunner, tableName: string) {
    const table = await queryRunner.getTable(tableName);
    if (!table) {
      throw new Error(`Required table "${tableName}" does not exist`);
    }
    return table;
  }

  private async ensureIndex(
    queryRunner: QueryRunner,
    tableName: string,
    index: TableIndex
  ) {
    const table = await this.refreshTable(queryRunner, tableName);
    const sameColumns = table.indices.find(
      (candidate) =>
        candidate.columnNames.join(',') === index.columnNames.join(',') &&
        candidate.isUnique === index.isUnique
    );
    if (!sameColumns) {
      await queryRunner.createIndex(tableName, index);
    }
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    let taskLikes = await this.refreshTable(queryRunner, 'task_likes');

    for (const ghostColumn of ['taskTaskId', 'userUserId']) {
      const foreignKeys = taskLikes.foreignKeys.filter((foreignKey) =>
        foreignKey.columnNames.includes(ghostColumn)
      );
      for (const foreignKey of foreignKeys) {
        await queryRunner.dropForeignKey('task_likes', foreignKey);
      }
      taskLikes = await this.refreshTable(queryRunner, 'task_likes');
      if (taskLikes.findColumnByName(ghostColumn)) {
        await queryRunner.dropColumn('task_likes', ghostColumn);
      }
      taskLikes = await this.refreshTable(queryRunner, 'task_likes');
    }

    const taskLikeRelations = [
      {
        column: 'taskId',
        referencedTable: 'tasks',
        referencedColumn: 'taskId',
        name: 'FK_task_likes_task',
      },
      {
        column: 'userId',
        referencedTable: 'users',
        referencedColumn: 'userId',
        name: 'FK_task_likes_user',
      },
    ];

    for (const relation of taskLikeRelations) {
      taskLikes = await this.refreshTable(queryRunner, 'task_likes');
      if (!taskLikes.foreignKeys.some((foreignKey) => foreignKey.columnNames.includes(relation.column))) {
        await queryRunner.createForeignKey(
          'task_likes',
          new TableForeignKey({
            name: relation.name,
            columnNames: [relation.column],
            referencedTableName: relation.referencedTable,
            referencedColumnNames: [relation.referencedColumn],
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
          })
        );
      }
    }

    const customers = await this.refreshTable(queryRunner, 'customers');
    const customerEmailIndexes = customers.indices.filter(
      (index) => index.isUnique && index.columnNames.join(',') === 'customerEmail'
    );
    for (const duplicate of customerEmailIndexes.slice(1)) {
      await queryRunner.dropIndex('customers', duplicate);
    }

    const missingRelations = [
      {
        table: 'notification_metrics',
        column: 'recipientId',
        referencedTable: 'notification_recipients',
        referencedColumn: 'recipientId',
        name: 'FK_notification_metrics_recipient',
      },
      {
        table: 'notification_metrics',
        column: 'userId',
        referencedTable: 'users',
        referencedColumn: 'userId',
        name: 'FK_notification_metrics_user',
      },
      {
        table: 'notification_metrics',
        column: 'notificationId',
        referencedTable: 'notifications',
        referencedColumn: 'notificationId',
        name: 'FK_notification_metrics_notification',
      },
      {
        table: 'notification_queue',
        column: 'recipientUserId',
        referencedTable: 'users',
        referencedColumn: 'userId',
        name: 'FK_notification_queue_recipient',
      },
    ];

    for (const relation of missingRelations) {
      const table = await this.refreshTable(queryRunner, relation.table);
      if (!table.foreignKeys.some((foreignKey) => foreignKey.columnNames.includes(relation.column))) {
        await queryRunner.createForeignKey(
          relation.table,
          new TableForeignKey({
            name: relation.name,
            columnNames: [relation.column],
            referencedTableName: relation.referencedTable,
            referencedColumnNames: [relation.referencedColumn],
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
          })
        );
      }
    }

    const auditLogs = await this.refreshTable(queryRunner, 'user_audit_logs');
    const auditUserForeignKey = auditLogs.foreignKeys.find((foreignKey) =>
      foreignKey.columnNames.includes('userId')
    );
    if (auditUserForeignKey && auditUserForeignKey.onDelete !== 'SET NULL') {
      await queryRunner.dropForeignKey('user_audit_logs', auditUserForeignKey);
      await queryRunner.createForeignKey(
        'user_audit_logs',
        new TableForeignKey({
          name: 'FK_audit_logs_user',
          columnNames: ['userId'],
          referencedTableName: 'users',
          referencedColumnNames: ['userId'],
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
        })
      );
    }

    await this.ensureIndex(
      queryRunner,
      'tasks',
      new TableIndex({
        name: 'IDX_tasks_assignee_status_due',
        columnNames: ['assignedTo', 'status', 'dueDate'],
      })
    );
    await this.ensureIndex(
      queryRunner,
      'tasks',
      new TableIndex({
        name: 'IDX_tasks_status_deleted_due',
        columnNames: ['status', 'deletedAt', 'dueDate'],
      })
    );
    await this.ensureIndex(
      queryRunner,
      'notification_recipients',
      new TableIndex({
        name: 'IDX_notification_recipients_cleanup_deleted',
        columnNames: ['isDeleted', 'deletedAt'],
      })
    );
    await this.ensureIndex(
      queryRunner,
      'notification_recipients',
      new TableIndex({
        name: 'IDX_notification_recipients_cleanup_archive',
        columnNames: ['isRead', 'isArchived', 'readAt'],
      })
    );

    const tables = (await queryRunner.query(`
      SELECT TABLE_NAME
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'
    `)) as Array<{ TABLE_NAME: string }>;
    for (const row of tables) {
      // Converting existing string columns table-by-table can temporarily make
      // parent and child FK columns incompatible. The safe baseline here is to
      // set utf8mb4 for newly created columns; existing FK columns belong in a
      // separate coordinated conversion migration.
      await queryRunner.query(
        `ALTER TABLE \`${row.TABLE_NAME}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const indexes = [
      ['tasks', 'IDX_tasks_assignee_status_due'],
      ['tasks', 'IDX_tasks_status_deleted_due'],
      ['notification_recipients', 'IDX_notification_recipients_cleanup_deleted'],
      ['notification_recipients', 'IDX_notification_recipients_cleanup_archive'],
    ] as const;

    for (const [tableName, indexName] of indexes) {
      const table = await this.refreshTable(queryRunner, tableName);
      const index = table.indices.find((candidate) => candidate.name === indexName);
      if (index) await queryRunner.dropIndex(tableName, index);
    }
  }
}
