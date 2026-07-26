import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreatePublicProfiles1791000000000 implements MigrationInterface {
  name = 'CreatePublicProfiles1791000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('public_profiles'))) {
      await queryRunner.createTable(
        new Table({
          name: 'public_profiles',
          columns: [
            { name: 'profileId', type: 'varchar', length: '36', isPrimary: true },
            { name: 'userId', type: 'int' },
            { name: 'customerId', type: 'varchar', length: '36', isNullable: true },
            { name: 'slug', type: 'varchar', length: '64' },
            { name: 'displayName', type: 'varchar', length: '100' },
            { name: 'headline', type: 'varchar', length: '140', isNullable: true },
            { name: 'bio', type: 'varchar', length: '500', isNullable: true },
            { name: 'avatarUrl', type: 'varchar', length: '512', isNullable: true },
            { name: 'templateKey', type: 'varchar', length: '32', default: "'soft-mint'" },
            { name: 'themeConfig', type: 'json', isNullable: true },
            {
              name: 'status',
              type: 'enum',
              enum: ['draft', 'published'],
              default: "'draft'",
            },
            {
              name: 'visibility',
              type: 'enum',
              enum: ['public', 'unlisted', 'private'],
              default: "'private'",
            },
            { name: 'primaryCtaLabel', type: 'varchar', length: '60', isNullable: true },
            { name: 'primaryCtaUrl', type: 'varchar', length: '512', isNullable: true },
            { name: 'secondaryCtaLabel', type: 'varchar', length: '60', isNullable: true },
            { name: 'secondaryCtaUrl', type: 'varchar', length: '512', isNullable: true },
            { name: 'showEmail', type: 'tinyint', width: 1, default: 0 },
            { name: 'showPhone', type: 'tinyint', width: 1, default: 0 },
            { name: 'showAddress', type: 'tinyint', width: 1, default: 0 },
            { name: 'seoTitle', type: 'varchar', length: '70', isNullable: true },
            { name: 'seoDescription', type: 'varchar', length: '160', isNullable: true },
            { name: 'viewCount', type: 'bigint', unsigned: true, default: 0 },
            { name: 'publishedAt', type: 'datetime', isNullable: true },
            { name: 'deletedAt', type: 'datetime', isNullable: true },
            { name: 'createdAt', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
            {
              name: 'updatedAt',
              type: 'datetime',
              default: 'CURRENT_TIMESTAMP',
              onUpdate: 'CURRENT_TIMESTAMP',
            },
          ],
        }),
        true
      );

    }

    await queryRunner.query(
      'ALTER TABLE `public_profiles` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'
    );
    let publicProfiles = await queryRunner.getTable('public_profiles');
    if (!publicProfiles) throw new Error('public_profiles table was not created');
    const profileIndexes = [
      new TableIndex({ name: 'UQ_public_profiles_slug', columnNames: ['slug'], isUnique: true }),
      new TableIndex({ name: 'UQ_public_profiles_customer', columnNames: ['customerId'], isUnique: true }),
      new TableIndex({ name: 'IDX_public_profiles_owner_status', columnNames: ['userId', 'status'] }),
    ];
    for (const index of profileIndexes) {
      if (!publicProfiles.indices.some((existing) => existing.name === index.name)) {
        await queryRunner.createIndex('public_profiles', index);
        publicProfiles = (await queryRunner.getTable('public_profiles'))!;
      }
    }
    const profileForeignKeys = [
      new TableForeignKey({
        name: 'FK_public_profiles_user',
        columnNames: ['userId'],
        referencedTableName: 'users',
        referencedColumnNames: ['userId'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
      new TableForeignKey({
        name: 'FK_public_profiles_customer',
        columnNames: ['customerId'],
        referencedTableName: 'customers',
        referencedColumnNames: ['customerId'],
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      }),
    ];
    for (const foreignKey of profileForeignKeys) {
      if (!publicProfiles.foreignKeys.some((existing) => existing.name === foreignKey.name)) {
        await queryRunner.createForeignKey('public_profiles', foreignKey);
        publicProfiles = (await queryRunner.getTable('public_profiles'))!;
      }
    }

    if (!(await queryRunner.hasTable('public_profile_links'))) {
      await queryRunner.createTable(
        new Table({
          name: 'public_profile_links',
          columns: [
            { name: 'linkId', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
            { name: 'profileId', type: 'varchar', length: '36' },
            { name: 'platform', type: 'varchar', length: '32' },
            { name: 'label', type: 'varchar', length: '60' },
            { name: 'url', type: 'varchar', length: '512' },
            { name: 'sortOrder', type: 'smallint', unsigned: true, default: 0 },
            { name: 'isVisible', type: 'tinyint', width: 1, default: 1 },
            { name: 'createdAt', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
            {
              name: 'updatedAt',
              type: 'datetime',
              default: 'CURRENT_TIMESTAMP',
              onUpdate: 'CURRENT_TIMESTAMP',
            },
          ],
        }),
        true
      );
    }

    await queryRunner.query(
      'ALTER TABLE `public_profile_links` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'
    );
    let publicProfileLinks = await queryRunner.getTable('public_profile_links');
    if (!publicProfileLinks) throw new Error('public_profile_links table was not created');
    if (!publicProfileLinks.indices.some((index) => index.name === 'IDX_public_profile_links_order')) {
      await queryRunner.createIndex(
        'public_profile_links',
        new TableIndex({
          name: 'IDX_public_profile_links_order',
          columnNames: ['profileId', 'sortOrder'],
        })
      );
      publicProfileLinks = (await queryRunner.getTable('public_profile_links'))!;
    }
    if (!publicProfileLinks.foreignKeys.some((key) => key.name === 'FK_public_profile_links_profile')) {
      await queryRunner.createForeignKey(
        'public_profile_links',
        new TableForeignKey({
          name: 'FK_public_profile_links_profile',
          columnNames: ['profileId'],
          referencedTableName: 'public_profiles',
          referencedColumnNames: ['profileId'],
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        })
      );
    }

    if (!(await queryRunner.hasTable('public_profile_events'))) {
      await queryRunner.createTable(
        new Table({
          name: 'public_profile_events',
          columns: [
            { name: 'eventId', type: 'bigint', unsigned: true, isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
            { name: 'profileId', type: 'varchar', length: '36' },
            { name: 'eventType', type: 'varchar', length: '32' },
            { name: 'target', type: 'varchar', length: '128', isNullable: true },
            { name: 'deviceType', type: 'varchar', length: '20', default: "'unknown'" },
            { name: 'ipHash', type: 'char', length: '64', isNullable: true },
            { name: 'userAgentHash', type: 'char', length: '64', isNullable: true },
            { name: 'referrer', type: 'varchar', length: '512', isNullable: true },
            { name: 'occurredAt', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
          ],
        }),
        true
      );
    }

    await queryRunner.query(
      'ALTER TABLE `public_profile_events` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'
    );
    let publicProfileEvents = await queryRunner.getTable('public_profile_events');
    if (!publicProfileEvents) throw new Error('public_profile_events table was not created');
    const eventIndexes = [
      new TableIndex({
        name: 'IDX_public_profile_events_profile_date',
        columnNames: ['profileId', 'occurredAt'],
      }),
      new TableIndex({
        name: 'IDX_public_profile_events_profile_type',
        columnNames: ['profileId', 'eventType'],
      }),
    ];
    for (const index of eventIndexes) {
      if (!publicProfileEvents.indices.some((existing) => existing.name === index.name)) {
        await queryRunner.createIndex('public_profile_events', index);
        publicProfileEvents = (await queryRunner.getTable('public_profile_events'))!;
      }
    }
    if (!publicProfileEvents.foreignKeys.some((key) => key.name === 'FK_public_profile_events_profile')) {
      await queryRunner.createForeignKey(
        'public_profile_events',
        new TableForeignKey({
          name: 'FK_public_profile_events_profile',
          columnNames: ['profileId'],
          referencedTableName: 'public_profiles',
          referencedColumnNames: ['profileId'],
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        })
      );
    }

    // Historical customer rows were created before ownership was wired through
    // the controller. Assign only unowned rows to the first active user so they
    // can be safely converted into private drafts instead of remaining public.
    await queryRunner.query(`
      UPDATE customers
      SET userId = (
        SELECT owner.userId
        FROM (SELECT MIN(userId) AS userId FROM users WHERE isActive = 1) owner
      )
      WHERE userId IS NULL
        AND EXISTS (SELECT 1 FROM users WHERE isActive = 1)
    `);

    await queryRunner.query(`
      INSERT INTO public_profiles (
        profileId, userId, customerId, slug, displayName, avatarUrl,
        templateKey, status, visibility, showEmail, showPhone, showAddress,
        viewCount, createdAt, updatedAt
      )
      SELECT
        UUID(),
        customer.userId,
        customer.customerId,
        CONCAT('profile-', LEFT(REPLACE(customer.customerId, '-', ''), 12)),
        TRIM(CONCAT(customer.customerName, ' ', COALESCE(customer.customerLastName, ''))),
        customer.customerImageUrl,
        'soft-mint',
        'draft',
        'private',
        0,
        0,
        0,
        0,
        NOW(),
        NOW()
      FROM customers customer
      WHERE customer.userId IS NOT NULL
        AND customer.deletedAt IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM public_profiles profile
          WHERE profile.customerId = customer.customerId
        )
    `);

    await queryRunner.query(`
      INSERT INTO public_profile_links (
        profileId, platform, label, url, sortOrder, isVisible, createdAt, updatedAt
      )
      SELECT profile.profileId, source.platform, source.label, source.url,
        source.sortOrder, 1, NOW(), NOW()
      FROM public_profiles profile
      INNER JOIN customers customer ON customer.customerId = profile.customerId
      INNER JOIN (
        SELECT customerId, 'facebook' AS platform, 'Facebook' AS label,
          customerFacebook AS url, 0 AS sortOrder FROM customers WHERE customerFacebook IS NOT NULL AND customerFacebook <> ''
        UNION ALL
        SELECT customerId, 'instagram', 'Instagram', customerInstagram, 1 FROM customers WHERE customerInstagram IS NOT NULL AND customerInstagram <> ''
        UNION ALL
        SELECT customerId, 'tiktok', 'TikTok', customerTikTok, 2 FROM customers WHERE customerTikTok IS NOT NULL AND customerTikTok <> ''
        UNION ALL
        SELECT customerId, 'line', 'LINE', customerLine, 3 FROM customers WHERE customerLine IS NOT NULL AND customerLine <> ''
        UNION ALL
        SELECT customerId, 'x', 'X', customerX, 4 FROM customers WHERE customerX IS NOT NULL AND customerX <> ''
      ) source ON source.customerId = customer.customerId
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('public_profile_events')) {
      await queryRunner.dropTable('public_profile_events', true);
    }
    if (await queryRunner.hasTable('public_profile_links')) {
      await queryRunner.dropTable('public_profile_links', true);
    }
    if (await queryRunner.hasTable('public_profiles')) {
      await queryRunner.dropTable('public_profiles', true);
    }
  }
}
