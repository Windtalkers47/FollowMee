import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProductivityEngagementFoundation1810000000000 implements MigrationInterface {
  name = 'ProductivityEngagementFoundation1810000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const taskKeyRows = await queryRunner.query(
      `SELECT CHARACTER_SET_NAME AS charsetName, COLLATION_NAME AS collationName
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tasks' AND COLUMN_NAME = 'taskId'`
    ) as Array<{ charsetName: string; collationName: string }>;
    const taskCharset = String(taskKeyRows[0]?.charsetName || 'utf8mb4').replace(/[^a-zA-Z0-9_]/g, '');
    const taskCollation = String(taskKeyRows[0]?.collationName || 'utf8mb4_unicode_ci').replace(/[^a-zA-Z0-9_]/g, '');

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS outbox_events (
        eventId BIGINT NOT NULL AUTO_INCREMENT,
        eventType VARCHAR(100) NOT NULL,
        aggregateType VARCHAR(60) NULL,
        aggregateId VARCHAR(100) NULL,
        payload JSON NOT NULL,
        idempotencyKey VARCHAR(180) NOT NULL,
        status ENUM('pending','processing','processed','failed') NOT NULL DEFAULT 'pending',
        attempts INT NOT NULL DEFAULT 0,
        nextAttemptAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        lockedAt DATETIME NULL,
        processedAt DATETIME NULL,
        lastError VARCHAR(500) NULL,
        createdAt TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (eventId),
        UNIQUE KEY uq_outbox_idempotency (idempotencyKey),
        KEY idx_outbox_dispatch (status,nextAttemptAt,eventId),
        KEY idx_outbox_aggregate (aggregateType,aggregateId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS organization_invitations (
        invitationId BIGINT NOT NULL AUTO_INCREMENT,
        email VARCHAR(100) NOT NULL,
        tokenHash CHAR(64) NOT NULL,
        roleId INT NULL,
        invitedBy INT NOT NULL,
        status ENUM('pending','accepted','expired','revoked') NOT NULL DEFAULT 'pending',
        expiresAt DATETIME NOT NULL,
        acceptedAt DATETIME NULL,
        revokedAt DATETIME NULL,
        createdAt TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (invitationId),
        UNIQUE KEY uq_organization_invitation_token (tokenHash),
        KEY idx_organization_invitation_email (email,status,expiresAt),
        CONSTRAINT fk_organization_invitation_role FOREIGN KEY (roleId) REFERENCES roles(roleId) ON DELETE SET NULL,
        CONSTRAINT fk_organization_invitation_inviter FOREIGN KEY (invitedBy) REFERENCES users(userId) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_saved_views (
        viewId BIGINT NOT NULL AUTO_INCREMENT,
        userId INT NOT NULL,
        pageKey VARCHAR(40) NOT NULL,
        name VARCHAR(80) NOT NULL,
        filters JSON NOT NULL,
        isDefault TINYINT(1) NOT NULL DEFAULT 0,
        createdAt TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (viewId),
        UNIQUE KEY uq_saved_view_name (userId,pageKey,name),
        KEY idx_saved_view_page (userId,pageKey,isDefault),
        CONSTRAINT fk_saved_view_user FOREIGN KEY (userId) REFERENCES users(userId) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS task_templates (
        templateId BIGINT NOT NULL AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NULL,
        priority ENUM('low','normal','high','urgent') NOT NULL DEFAULT 'normal',
        defaultAssigneeId INT NULL,
        watcherIds JSON NULL,
        checklist JSON NULL,
        visibility ENUM('private','organization') NOT NULL DEFAULT 'private',
        createdBy INT NOT NULL,
        isActive TINYINT(1) NOT NULL DEFAULT 1,
        createdAt TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (templateId),
        KEY idx_task_templates_visibility (visibility,isActive,createdBy),
        CONSTRAINT fk_task_template_assignee FOREIGN KEY (defaultAssigneeId) REFERENCES users(userId) ON DELETE SET NULL,
        CONSTRAINT fk_task_template_creator FOREIGN KEY (createdBy) REFERENCES users(userId) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS task_recurrence_rules (
        recurrenceRuleId BIGINT NOT NULL AUTO_INCREMENT,
        templateId BIGINT NOT NULL,
        cadence ENUM('daily','weekly','monthly') NOT NULL,
        intervalValue INT NOT NULL DEFAULT 1,
        weekdays JSON NULL,
        dayOfMonth TINYINT NULL,
        \`localTime\` TIME NOT NULL DEFAULT '09:00:00',
        timezone VARCHAR(60) NOT NULL DEFAULT 'Asia/Bangkok',
        startsOn DATE NOT NULL,
        endsOn DATE NULL,
        nextRunAt DATETIME NOT NULL,
        status ENUM('active','paused','completed') NOT NULL DEFAULT 'active',
        createdBy INT NOT NULL,
        lastGeneratedAt DATETIME NULL,
        createdAt TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (recurrenceRuleId),
        KEY idx_recurrence_due (status,nextRunAt),
        CONSTRAINT fk_recurrence_template FOREIGN KEY (templateId) REFERENCES task_templates(templateId) ON DELETE CASCADE,
        CONSTRAINT fk_recurrence_creator FOREIGN KEY (createdBy) REFERENCES users(userId) ON DELETE CASCADE,
        CONSTRAINT chk_recurrence_interval CHECK (intervalValue BETWEEN 1 AND 365),
        CONSTRAINT chk_recurrence_month_day CHECK (dayOfMonth IS NULL OR dayOfMonth BETWEEN 1 AND 31)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS task_checklist_items (
        checklistItemId BIGINT NOT NULL AUTO_INCREMENT,
        taskId VARCHAR(36) CHARACTER SET ${taskCharset} COLLATE ${taskCollation} NOT NULL,
        label VARCHAR(255) NOT NULL,
        isRequired TINYINT(1) NOT NULL DEFAULT 0,
        isCompleted TINYINT(1) NOT NULL DEFAULT 0,
        sortOrder INT NOT NULL DEFAULT 0,
        completedBy INT NULL,
        completedAt DATETIME NULL,
        createdAt TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (checklistItemId),
        KEY idx_task_checklist (taskId,sortOrder),
        CONSTRAINT fk_task_checklist_task FOREIGN KEY (taskId) REFERENCES tasks(taskId) ON DELETE CASCADE,
        CONSTRAINT fk_task_checklist_completer FOREIGN KEY (completedBy) REFERENCES users(userId) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS customer_activities (
        activityId BIGINT NOT NULL AUTO_INCREMENT,
        customerId CHAR(36) NOT NULL,
        actorUserId INT NULL,
        activityType VARCHAR(60) NOT NULL,
        metadata JSON NULL,
        createdAt TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (activityId),
        KEY idx_customer_activity (customerId,createdAt),
        CONSTRAINT fk_customer_activity_customer FOREIGN KEY (customerId) REFERENCES customers(customerId) ON DELETE CASCADE,
        CONSTRAINT fk_customer_activity_actor FOREIGN KEY (actorUserId) REFERENCES users(userId) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS reward_season_results (
        resultId BIGINT NOT NULL AUTO_INCREMENT,
        seasonId INT NOT NULL,
        userId INT NOT NULL,
        rankValue INT NOT NULL,
        score INT NOT NULL,
        completedTasks INT NOT NULL DEFAULT 0,
        onTimeTasks INT NOT NULL DEFAULT 0,
        firstPassTasks INT NOT NULL DEFAULT 0,
        lastScoredAt DATETIME NULL,
        finalizedAt DATETIME NOT NULL,
        PRIMARY KEY (resultId),
        UNIQUE KEY uq_season_result_user (seasonId,userId),
        UNIQUE KEY uq_season_result_rank (seasonId,rankValue),
        CONSTRAINT fk_season_result_season FOREIGN KEY (seasonId) REFERENCES reward_seasons(seasonId) ON DELETE CASCADE,
        CONSTRAINT fk_season_result_user FOREIGN KEY (userId) REFERENCES users(userId) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    const taskColumns: Array<[string, string]> = [
      ['duplicatedFromTaskId', `VARCHAR(36) CHARACTER SET ${taskCharset} COLLATE ${taskCollation} NULL`],
      ['templateId', 'BIGINT NULL'],
      ['recurrenceRuleId', 'BIGINT NULL'],
      ['scheduledFor', 'DATETIME NULL'],
      ['occurrenceKey', 'VARCHAR(180) NULL'],
      ['blockedReason', 'VARCHAR(500) NULL'],
      ['blockedAt', 'DATETIME NULL'],
      ['blockedBy', 'INT NULL'],
      ['completedBy', 'INT NULL'],
      ['approvedBy', 'INT NULL'],
    ];
    for (const [name, definition] of taskColumns) {
      if (!(await queryRunner.hasColumn('tasks', name))) {
        await queryRunner.query(`ALTER TABLE tasks ADD COLUMN ${name} ${definition}`);
      }
    }
    // The legacy tasks table uses utf8/utf8_unicode_ci while clean schemas use
    // utf8mb4. Match the legacy parent key before adding self-referencing FK.
    await queryRunner.query(`ALTER TABLE tasks MODIFY COLUMN duplicatedFromTaskId VARCHAR(36) CHARACTER SET ${taskCharset} COLLATE ${taskCollation} NULL`);
    const indexRows = await queryRunner.query(
      `SELECT DISTINCT INDEX_NAME FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tasks'`
    );
    const indexes = new Set((indexRows as Array<{ INDEX_NAME: string }>).map((row) => row.INDEX_NAME));
    const constraintRows = await queryRunner.query(
      `SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS
       WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'tasks'`
    );
    const constraints = new Set((constraintRows as Array<{ CONSTRAINT_NAME: string }>).map((row) => row.CONSTRAINT_NAME));
    const additions: string[] = [];
    if (!indexes.has('uq_tasks_occurrence_key')) additions.push('ADD UNIQUE KEY uq_tasks_occurrence_key (occurrenceKey)');
    if (!indexes.has('idx_tasks_duplicate_source')) additions.push('ADD KEY idx_tasks_duplicate_source (duplicatedFromTaskId)');
    if (!indexes.has('idx_tasks_blocked')) additions.push('ADD KEY idx_tasks_blocked (blockedAt,status)');
    if (!constraints.has('fk_tasks_duplicate_source')) additions.push('ADD CONSTRAINT fk_tasks_duplicate_source FOREIGN KEY (duplicatedFromTaskId) REFERENCES tasks(taskId) ON DELETE SET NULL');
    if (!constraints.has('fk_tasks_template')) additions.push('ADD CONSTRAINT fk_tasks_template FOREIGN KEY (templateId) REFERENCES task_templates(templateId) ON DELETE SET NULL');
    if (!constraints.has('fk_tasks_recurrence')) additions.push('ADD CONSTRAINT fk_tasks_recurrence FOREIGN KEY (recurrenceRuleId) REFERENCES task_recurrence_rules(recurrenceRuleId) ON DELETE SET NULL');
    if (!constraints.has('fk_tasks_blocked_by')) additions.push('ADD CONSTRAINT fk_tasks_blocked_by FOREIGN KEY (blockedBy) REFERENCES users(userId) ON DELETE SET NULL');
    if (!constraints.has('fk_tasks_completed_by')) additions.push('ADD CONSTRAINT fk_tasks_completed_by FOREIGN KEY (completedBy) REFERENCES users(userId) ON DELETE SET NULL');
    if (!constraints.has('fk_tasks_approved_by')) additions.push('ADD CONSTRAINT fk_tasks_approved_by FOREIGN KEY (approvedBy) REFERENCES users(userId) ON DELETE SET NULL');
    if (additions.length) await queryRunner.query(`ALTER TABLE tasks ${additions.join(', ')}`);

    for (const table of ['users', 'customers', 'public_profiles']) {
      if (!(await queryRunner.hasColumn(table, 'imageCrop'))) {
        await queryRunner.query(`ALTER TABLE ${table} ADD COLUMN imageCrop JSON NULL`);
      }
    }

    const preferenceColumns: Array<[string, string]> = [
      ['selectedAuraKey', 'VARCHAR(60) NULL'],
      ['profileCardMotion', "ENUM('full','subtle','off') NOT NULL DEFAULT 'subtle'"],
      ['shareDefaults', 'JSON NULL'],
      ['privacyDefaults', 'JSON NULL'],
    ];
    for (const [name, definition] of preferenceColumns) {
      if (!(await queryRunner.hasColumn('user_preferences', name))) {
        await queryRunner.query(`ALTER TABLE user_preferences ADD COLUMN ${name} ${definition}`);
      }
    }

    const digestColumns: Array<[string, string]> = [
      ['digestDay', 'TINYINT NULL'],
      ['digestTime', "CHAR(5) NOT NULL DEFAULT '08:00'"],
      ['timezone', "VARCHAR(60) NOT NULL DEFAULT 'Asia/Bangkok'"],
      ['lastDigestAt', 'DATETIME NULL'],
    ];
    for (const [name, definition] of digestColumns) {
      if (!(await queryRunner.hasColumn('user_notification_settings', name))) {
        await queryRunner.query(`ALTER TABLE user_notification_settings ADD COLUMN ${name} ${definition}`);
      }
    }

    if (!(await queryRunner.hasColumn('reward_badges', 'auraKey'))) {
      await queryRunner.query(`ALTER TABLE reward_badges ADD COLUMN auraKey VARCHAR(60) NULL, ADD COLUMN rankValue TINYINT NULL`);
    }
    await queryRunner.query(`
      INSERT INTO reward_badges (badgeKey, nameKey, descriptionKey, icon, auraKey, rankValue) VALUES
        ('season-champion','rewards.badge.champion','rewards.badge.championDescription','emoji_events','champion-gold',1),
        ('season-runner-up','rewards.badge.runnerUp','rewards.badge.runnerUpDescription','military_tech','runner-silver',2),
        ('season-third-place','rewards.badge.thirdPlace','rewards.badge.thirdPlaceDescription','workspace_premium','third-bronze',3)
      ON DUPLICATE KEY UPDATE auraKey = VALUES(auraKey), rankValue = VALUES(rankValue)
    `);
    await queryRunner.query(`INSERT INTO permissions(permissionName,description)
      VALUES ('VIEW_ORGANIZATION_ANALYTICS','View organization-wide work, customer and profile analytics')
      ON DUPLICATE KEY UPDATE description=VALUES(description)`);
    await queryRunner.query(`INSERT IGNORE INTO role_permissions(roleId,permissionId)
      SELECT r.roleId,p.permissionId FROM roles r CROSS JOIN permissions p
      WHERE r.roleName='Owner' AND p.permissionName='VIEW_ORGANIZATION_ANALYTICS'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE rp FROM role_permissions rp INNER JOIN permissions p ON p.permissionId=rp.permissionId WHERE p.permissionName='VIEW_ORGANIZATION_ANALYTICS'`);
    await queryRunner.query(`DELETE FROM permissions WHERE permissionName='VIEW_ORGANIZATION_ANALYTICS'`);
    for (const table of ['users', 'customers', 'public_profiles']) {
      if (await queryRunner.hasColumn(table, 'imageCrop')) await queryRunner.query(`ALTER TABLE ${table} DROP COLUMN imageCrop`);
    }
    for (const name of ['selectedAuraKey', 'profileCardMotion', 'shareDefaults', 'privacyDefaults']) {
      if (await queryRunner.hasColumn('user_preferences', name)) await queryRunner.query(`ALTER TABLE user_preferences DROP COLUMN ${name}`);
    }
    for (const name of ['digestDay', 'digestTime', 'timezone', 'lastDigestAt']) {
      if (await queryRunner.hasColumn('user_notification_settings', name)) await queryRunner.query(`ALTER TABLE user_notification_settings DROP COLUMN ${name}`);
    }
    if (await queryRunner.hasColumn('reward_badges', 'auraKey')) {
      await queryRunner.query(`ALTER TABLE reward_badges DROP COLUMN auraKey, DROP COLUMN rankValue`);
    }
    for (const table of ['reward_season_results','customer_activities','task_checklist_items']) await queryRunner.query(`DROP TABLE IF EXISTS ${table}`);
    const taskColumns = ['approvedBy','completedBy','blockedBy','blockedAt','blockedReason','occurrenceKey','scheduledFor','recurrenceRuleId','templateId','duplicatedFromTaskId'];
    for (const name of taskColumns) if (await queryRunner.hasColumn('tasks', name)) await queryRunner.query(`ALTER TABLE tasks DROP COLUMN ${name}`);
    for (const table of ['task_recurrence_rules','task_templates','user_saved_views','organization_invitations','outbox_events']) await queryRunner.query(`DROP TABLE IF EXISTS ${table}`);
  }
}
