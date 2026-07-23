import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * Migration: AddNotificationMetrics
 * 
 * สร้างตาราง notification_metrics สำหรับ tracking analytics
 * 
 * Design Considerations:
 * 1. Performance: เพิ่ม indexes สำหรับ queries ที่ใช้บ่อย
 * 2. Scalability: ใช้ bigint สำหรับ primary key
 * 3. Privacy: เก็บ ipHash แทน IP address จริง
 * 4. Cost-effective: เก็บเฉพาะข้อมูลที่จำเป็น
 */
export class AddNotificationMetrics1719389100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create notification_metrics table
    await queryRunner.createTable(
      new Table({
        name: 'notification_metrics',
        columns: [
          {
            name: 'metricId',
            type: 'bigint',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
            comment: 'Primary key - auto increment',
          },
          {
            name: 'recipientId',
            type: 'int',
            isNullable: false,
            comment: 'FK to notification_recipients',
          },
          {
            name: 'userId',
            type: 'int',
            isNullable: false,
            comment: 'FK to users',
          },
          {
            name: 'notificationId',
            type: 'bigint',
            isNullable: false,
            comment: 'FK to notifications',
          },
          {
            name: 'openedAt',
            type: 'timestamp',
            isNullable: true,
            comment: 'Timestamp when notification was opened',
          },
          {
            name: 'clickedAt',
            type: 'timestamp',
            isNullable: true,
            comment: 'Timestamp when actionUrl was clicked',
          },
          {
            name: 'deviceType',
            type: 'varchar',
            length: '20',
            default: "'unknown'",
            comment: 'Device type: mobile, tablet, desktop, unknown',
          },
          {
            name: 'browserType',
            type: 'varchar',
            length: '20',
            default: "'unknown'",
            comment: 'Browser type: chrome, firefox, safari, edge, other',
          }, {
            name: 'osType',
            type: 'varchar',
            length: '20',
            default: "'unknown'",
            comment: 'OS type: windows, macos, linux, ios, android, other',
          },
          {
            name: 'sessionId',
            type: 'varchar',
            length: '100',
            isNullable: true,
            comment: 'Session ID for grouping events',
          },
          {
            name: 'ipHash',
            type: 'varchar',
            length: '64',
            isNullable: true,
            comment: 'SHA256 hash of IP address for privacy',
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            comment: 'Record creation timestamp',
          },
        ],
        foreignKeys: [
          {
            name: 'FK_notification_metrics_recipient',
            columnNames: ['recipientId'],
            referencedTableName: 'notification_recipients',
            referencedColumnNames: ['recipientId'],
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
          },
          {
            name: 'FK_notification_metrics_user',
            columnNames: ['userId'],
            referencedTableName: 'users',
            referencedColumnNames: ['userId'],
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
          },
          {
            name: 'FK_notification_metrics_notification',
            columnNames: ['notificationId'],
            referencedTableName: 'notifications',
            referencedColumnNames: ['notificationId'],
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
          },
        ],
        comment: 'Notification analytics tracking - open/click events',
      }),
      true
    );

    // Create indexes for performance
    await queryRunner.createIndices('notification_metrics', [
      new TableIndex({
        name: 'IDX_notification_metrics_user_created',
        columnNames: ['userId', 'createdAt'],
      }),
      new TableIndex({
        name: 'IDX_notification_metrics_notification_created',
        columnNames: ['notificationId', 'createdAt'],
      }),
      new TableIndex({
        name: 'IDX_notification_metrics_recipient',
        columnNames: ['recipientId'],
      }),
      new TableIndex({
        name: 'IDX_notification_metrics_opened',
        columnNames: ['openedAt'],
      }),
      new TableIndex({
        name: 'IDX_notification_metrics_clicked',
        columnNames: ['clickedAt'],
      }),
      new TableIndex({
        name: 'IDX_notification_metrics_device_type',
        columnNames: ['deviceType'],
      }),
    ]);

    // Add comment to table
    await queryRunner.query(`
      ALTER TABLE notification_metrics 
      COMMENT = 'Notification analytics tracking - stores open/click events for engagement analysis'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the table (foreign keys will be automatically dropped)
    await queryRunner.dropTable('notification_metrics', true);
  }
}