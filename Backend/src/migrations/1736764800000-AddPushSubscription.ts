import { MigrationInterface, QueryRunner, Table, TableIndex } from "typeorm";

export class AddPushSubscription1736764800000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create push_subscriptions table
        await queryRunner.createTable(new Table({
            name: 'push_subscriptions',
            columns: [
                {
                    name: 'subscriptionId',
                    type: 'int',
                    isPrimary: true,
                    isGenerated: true,
                    generationStrategy: 'increment',
                },
                {
                    name: 'userId',
                    type: 'int',
                    isNullable: false,
                },
                {
                    name: 'endpoint',
                    type: 'varchar',
                    length: '500',
                    isNullable: false,
                },
                {
                    name: 'p256dh',
                    type: 'varchar',
                    length: '255',
                    isNullable: false,
                },
                {
                    name: 'auth',
                    type: 'varchar',
                    length: '255',
                    isNullable: false,
                },
                {
                    name: 'expirationTime',
                    type: 'datetime',
                    isNullable: true,
                },
                {
                    name: 'deviceName',
                    type: 'varchar',
                    length: '100',
                    isNullable: true,
                },
                {
                    name: 'isActive',
                    type: 'boolean',
                    default: true,
                    isNullable: false,
                },
                {
                    name: 'createdAt',
                    type: 'datetime',
                    default: 'CURRENT_TIMESTAMP',
                },
                {
                    name: 'updatedAt',
                    type: 'datetime',
                    default: 'CURRENT_TIMESTAMP',
                    onUpdate: 'CURRENT_TIMESTAMP',
                },
            ],
            foreignKeys: [
                {
                    name: 'FK_push_subscriptions_user',
                    columnNames: ['userId'],
                    referencedTableName: 'users',
                    referencedColumnNames: ['userId'],
                    onDelete: 'CASCADE',
                },
            ],
        }), true);

        // Create index for userId and endpoint
        await queryRunner.createIndex(
            'push_subscriptions',
            new TableIndex({
                name: 'IDX_push_subscriptions_user_endpoint',
                columnNames: ['userId', 'endpoint'],
            })
        );

        // Create index for isActive
        await queryRunner.createIndex(
            'push_subscriptions',
            new TableIndex({
                name: 'IDX_push_subscriptions_isActive',
                columnNames: ['isActive'],
            })
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropIndex('push_subscriptions', 'IDX_push_subscriptions_isActive');
        await queryRunner.dropIndex('push_subscriptions', 'IDX_push_subscriptions_user_endpoint');
        await queryRunner.dropTable('push_subscriptions');
    }
}