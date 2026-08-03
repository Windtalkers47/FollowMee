import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class OwnerOrganizationRewards1798000000000 implements MigrationInterface {
  name = 'OwnerOrganizationRewards1798000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const userCountRows = await queryRunner.query('SELECT COUNT(*) AS total FROM users WHERE isActive = 1');
    const activeUserCount = Number(userCountRows[0]?.total || 0);
    const legacyOwnerRows = await queryRunner.query(`
      SELECT DISTINCT ur.userId
      FROM user_roles ur
      INNER JOIN roles r ON r.roleId = ur.roleId
      WHERE r.roleName IN ('Superadmin', 'Owner')
    `);

    if (activeUserCount > 0 && legacyOwnerRows.length !== 1) {
      throw new Error(
        `Owner migration requires exactly one existing Superadmin/Owner when users exist; found ${legacyOwnerRows.length}. ` +
        'Resolve user_roles before running the migration.'
      );
    }

    await queryRunner.query(`
      UPDATE roles
      SET roleName = 'Owner',
          description = 'System owner with full access and ownership transfer authority',
          roleLevel = 999
      WHERE roleName = 'Superadmin'
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS system_owner (
        singletonId TINYINT NOT NULL DEFAULT 1,
        userId INT NOT NULL,
        createdAt TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (singletonId),
        UNIQUE KEY uq_system_owner_user (userId),
        CONSTRAINT fk_system_owner_user FOREIGN KEY (userId) REFERENCES users(userId)
          ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT chk_system_owner_singleton CHECK (singletonId = 1)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    if (legacyOwnerRows.length === 1) {
      await queryRunner.query(
        `INSERT INTO system_owner (singletonId, userId) VALUES (1, ?)
         ON DUPLICATE KEY UPDATE userId = VALUES(userId)`,
        [Number(legacyOwnerRows[0].userId)]
      );
    }

    for (const [tableName, legacyColumn] of [['customers', 'userId'], ['public_profiles', 'userId']] as const) {
      if (!(await queryRunner.hasColumn(tableName, 'createdBy'))) {
        await queryRunner.addColumn(tableName, new TableColumn({
          name: 'createdBy', type: 'int', isNullable: true,
        }));
      }
      if (!(await queryRunner.hasColumn(tableName, 'updatedBy'))) {
        await queryRunner.addColumn(tableName, new TableColumn({
          name: 'updatedBy', type: 'int', isNullable: true,
        }));
      }
      await queryRunner.query(`
        UPDATE ${tableName}
        SET createdBy = COALESCE(createdBy, ${legacyColumn}),
            updatedBy = COALESCE(updatedBy, ${legacyColumn})
      `);
    }

    await queryRunner.query(`
      CREATE TABLE reward_settings (
        singletonId TINYINT NOT NULL DEFAULT 1,
        redemptionEnabled TINYINT(1) NOT NULL DEFAULT 0,
        requestExpiryHours INT NOT NULL DEFAULT 72,
        updatedBy INT NULL,
        createdAt TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (singletonId),
        CONSTRAINT fk_reward_settings_user FOREIGN KEY (updatedBy) REFERENCES users(userId)
          ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT chk_reward_settings_singleton CHECK (singletonId = 1),
        CONSTRAINT chk_reward_expiry_hours CHECK (requestExpiryHours BETWEEN 1 AND 720)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await queryRunner.query('INSERT INTO reward_settings (singletonId) VALUES (1)');

    await queryRunner.query(`
      CREATE TABLE reward_seasons (
        seasonId INT NOT NULL AUTO_INCREMENT,
        seasonKey VARCHAR(7) NOT NULL,
        name VARCHAR(100) NOT NULL,
        startsAt DATETIME NOT NULL,
        endsAt DATETIME NOT NULL,
        status ENUM('upcoming','active','closed') NOT NULL DEFAULT 'active',
        createdAt TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (seasonId),
        UNIQUE KEY uq_reward_season_key (seasonKey),
        KEY idx_reward_season_dates (startsAt, endsAt, status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE reward_wallets (
        userId INT NOT NULL,
        availablePoints INT NOT NULL DEFAULT 0,
        reservedPoints INT NOT NULL DEFAULT 0,
        lifetimeEarned INT NOT NULL DEFAULT 0,
        updatedAt TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (userId),
        CONSTRAINT fk_reward_wallet_user FOREIGN KEY (userId) REFERENCES users(userId)
          ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT chk_reward_wallet_available CHECK (availablePoints >= 0),
        CONSTRAINT chk_reward_wallet_reserved CHECK (reservedPoints >= 0)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE reward_point_ledger (
        ledgerId BIGINT NOT NULL AUTO_INCREMENT,
        userId INT NOT NULL,
        seasonId INT NULL,
        entryType ENUM('credit','reserve','release','redeem','adjustment') NOT NULL,
        amount INT NOT NULL,
        sourceType VARCHAR(40) NOT NULL,
        sourceId VARCHAR(100) NOT NULL,
        idempotencyKey VARCHAR(180) NOT NULL,
        metadata JSON NULL,
        createdAt TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (ledgerId),
        UNIQUE KEY uq_reward_ledger_idempotency (idempotencyKey),
        KEY idx_reward_ledger_user_created (userId, createdAt),
        KEY idx_reward_ledger_season_user (seasonId, userId),
        CONSTRAINT fk_reward_ledger_user FOREIGN KEY (userId) REFERENCES users(userId)
          ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT fk_reward_ledger_season FOREIGN KEY (seasonId) REFERENCES reward_seasons(seasonId)
          ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT chk_reward_ledger_amount CHECK (amount > 0)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE reward_badges (
        badgeId INT NOT NULL AUTO_INCREMENT,
        badgeKey VARCHAR(60) NOT NULL,
        nameKey VARCHAR(120) NOT NULL,
        descriptionKey VARCHAR(120) NOT NULL,
        icon VARCHAR(40) NOT NULL,
        isActive TINYINT(1) NOT NULL DEFAULT 1,
        PRIMARY KEY (badgeId),
        UNIQUE KEY uq_reward_badge_key (badgeKey)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await queryRunner.query(`
      CREATE TABLE user_badges (
        userBadgeId BIGINT NOT NULL AUTO_INCREMENT,
        userId INT NOT NULL,
        badgeId INT NOT NULL,
        seasonId INT NULL,
        sourceId VARCHAR(100) NOT NULL,
        awardedAt TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (userBadgeId),
        UNIQUE KEY uq_user_badge_source (userId, badgeId, sourceId),
        CONSTRAINT fk_user_badge_user FOREIGN KEY (userId) REFERENCES users(userId) ON DELETE CASCADE,
        CONSTRAINT fk_user_badge_badge FOREIGN KEY (badgeId) REFERENCES reward_badges(badgeId) ON DELETE CASCADE,
        CONSTRAINT fk_user_badge_season FOREIGN KEY (seasonId) REFERENCES reward_seasons(seasonId) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE mission_templates (
        templateId INT NOT NULL AUTO_INCREMENT,
        templateKey VARCHAR(80) NOT NULL,
        category ENUM('quality','on_time','recovery','consistency') NOT NULL,
        cadence ENUM('weekly','monthly') NOT NULL,
        scope ENUM('shared','personal') NOT NULL,
        titleKey VARCHAR(120) NOT NULL,
        descriptionKey VARCHAR(120) NOT NULL,
        defaultTarget INT NOT NULL,
        defaultRewardPoints INT NOT NULL,
        isActive TINYINT(1) NOT NULL DEFAULT 1,
        updatedBy INT NULL,
        createdAt TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (templateId),
        UNIQUE KEY uq_mission_template_key (templateKey),
        CONSTRAINT fk_mission_template_user FOREIGN KEY (updatedBy) REFERENCES users(userId) ON DELETE SET NULL,
        CONSTRAINT chk_mission_target CHECK (defaultTarget > 1),
        CONSTRAINT chk_mission_reward CHECK (defaultRewardPoints > 0)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await queryRunner.query(`
      CREATE TABLE mission_instances (
        missionId BIGINT NOT NULL AUTO_INCREMENT,
        templateId INT NOT NULL,
        periodKey VARCHAR(20) NOT NULL,
        startsAt DATETIME NOT NULL,
        endsAt DATETIME NOT NULL,
        target INT NOT NULL,
        rewardPoints INT NOT NULL,
        generatedBy ENUM('owner','automatic') NOT NULL DEFAULT 'automatic',
        isActive TINYINT(1) NOT NULL DEFAULT 1,
        createdAt TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (missionId),
        UNIQUE KEY uq_mission_instance_period (templateId, periodKey),
        KEY idx_mission_instance_active_dates (isActive, startsAt, endsAt),
        CONSTRAINT fk_mission_instance_template FOREIGN KEY (templateId) REFERENCES mission_templates(templateId) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await queryRunner.query(`
      CREATE TABLE user_mission_progress (
        progressId BIGINT NOT NULL AUTO_INCREMENT,
        missionId BIGINT NOT NULL,
        userId INT NOT NULL,
        progress INT NOT NULL DEFAULT 0,
        target INT NOT NULL,
        completedAt DATETIME NULL,
        rewardClaimedAt DATETIME NULL,
        lastSourceId VARCHAR(100) NULL,
        updatedAt TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (progressId),
        UNIQUE KEY uq_user_mission_progress (missionId, userId),
        CONSTRAINT fk_user_mission_mission FOREIGN KEY (missionId) REFERENCES mission_instances(missionId) ON DELETE CASCADE,
        CONSTRAINT fk_user_mission_user FOREIGN KEY (userId) REFERENCES users(userId) ON DELETE CASCADE,
        CONSTRAINT chk_user_mission_progress CHECK (progress >= 0)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE mission_progress_events (
        eventId BIGINT NOT NULL AUTO_INCREMENT,
        missionId BIGINT NOT NULL,
        userId INT NOT NULL,
        cadence ENUM('weekly','monthly') NOT NULL,
        periodKey VARCHAR(20) NOT NULL,
        sourceId VARCHAR(100) NOT NULL,
        createdAt TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (eventId),
        UNIQUE KEY uq_mission_event_cadence_source (userId, cadence, periodKey, sourceId),
        CONSTRAINT fk_mission_event_mission FOREIGN KEY (missionId) REFERENCES mission_instances(missionId) ON DELETE CASCADE,
        CONSTRAINT fk_mission_event_user FOREIGN KEY (userId) REFERENCES users(userId) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE reward_catalog_items (
        itemId INT NOT NULL AUTO_INCREMENT,
        catalogKey VARCHAR(80) NULL,
        name VARCHAR(120) NOT NULL,
        description VARCHAR(500) NULL,
        imageUrl VARCHAR(512) NULL,
        pointsCost INT NOT NULL,
        availableStock INT NOT NULL DEFAULT 0,
        reservedStock INT NOT NULL DEFAULT 0,
        redeemedStock INT NOT NULL DEFAULT 0,
        perUserLimit INT NULL,
        startsAt DATETIME NULL,
        endsAt DATETIME NULL,
        isActive TINYINT(1) NOT NULL DEFAULT 1,
        createdBy INT NULL,
        updatedBy INT NULL,
        createdAt TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (itemId),
        UNIQUE KEY uq_reward_catalog_key (catalogKey),
        KEY idx_reward_catalog_active (isActive, startsAt, endsAt),
        CONSTRAINT fk_reward_catalog_created FOREIGN KEY (createdBy) REFERENCES users(userId) ON DELETE SET NULL,
        CONSTRAINT fk_reward_catalog_updated FOREIGN KEY (updatedBy) REFERENCES users(userId) ON DELETE SET NULL,
        CONSTRAINT chk_reward_catalog_cost CHECK (pointsCost > 0),
        CONSTRAINT chk_reward_catalog_stock CHECK (availableStock >= 0 AND reservedStock >= 0 AND redeemedStock >= 0)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await queryRunner.query(`
      CREATE TABLE reward_redemptions (
        redemptionId BIGINT NOT NULL AUTO_INCREMENT,
        userId INT NOT NULL,
        itemId INT NOT NULL,
        pointsCost INT NOT NULL,
        quantity INT NOT NULL DEFAULT 1,
        status ENUM('pending','approved','rejected','cancelled','expired','fulfilled') NOT NULL DEFAULT 'pending',
        expiresAt DATETIME NOT NULL,
        decidedBy INT NULL,
        decisionReason VARCHAR(500) NULL,
        decidedAt DATETIME NULL,
        fulfilledAt DATETIME NULL,
        idempotencyKey VARCHAR(180) NOT NULL,
        createdAt TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (redemptionId),
        UNIQUE KEY uq_reward_redemption_idempotency (idempotencyKey),
        KEY idx_reward_redemption_user_status (userId, status, createdAt),
        KEY idx_reward_redemption_status_expiry (status, expiresAt),
        CONSTRAINT fk_reward_redemption_user FOREIGN KEY (userId) REFERENCES users(userId) ON DELETE RESTRICT,
        CONSTRAINT fk_reward_redemption_item FOREIGN KEY (itemId) REFERENCES reward_catalog_items(itemId) ON DELETE RESTRICT,
        CONSTRAINT fk_reward_redemption_decider FOREIGN KEY (decidedBy) REFERENCES users(userId) ON DELETE SET NULL,
        CONSTRAINT chk_reward_redemption_cost CHECK (pointsCost > 0),
        CONSTRAINT chk_reward_redemption_quantity CHECK (quantity > 0)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      INSERT INTO permissions (permissionName, description) VALUES
        ('PUBLISH_PROFILES', 'Publish, unpublish and delete organization profiles'),
        ('MANAGE_REWARDS', 'Manage reward settings, catalog, missions and redemptions')
      ON DUPLICATE KEY UPDATE description = VALUES(description)
    `);
    await queryRunner.query(`
      INSERT IGNORE INTO role_permissions (roleId, permissionId)
      SELECT r.roleId, p.permissionId
      FROM roles r CROSS JOIN permissions p
      WHERE (r.roleName = 'Owner')
         OR (r.roleName = 'Admin' AND p.permissionName IN ('PUBLISH_PROFILES'))
         OR (r.roleName = 'Moderator' AND p.permissionName IN ('VIEW_CUSTOMERS','MANAGE_CUSTOMERS'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of [
      'reward_redemptions', 'reward_catalog_items', 'mission_progress_events', 'user_mission_progress', 'mission_instances',
      'mission_templates', 'user_badges', 'reward_badges', 'reward_point_ledger', 'reward_wallets',
      'reward_seasons', 'reward_settings', 'system_owner',
    ]) {
      await queryRunner.query(`DROP TABLE IF EXISTS ${table}`);
    }
    for (const table of ['customers', 'public_profiles']) {
      if (await queryRunner.hasColumn(table, 'updatedBy')) await queryRunner.dropColumn(table, 'updatedBy');
      if (await queryRunner.hasColumn(table, 'createdBy')) await queryRunner.dropColumn(table, 'createdBy');
    }
    await queryRunner.query(`UPDATE roles SET roleName = 'Superadmin' WHERE roleName = 'Owner'`);
  }
}
