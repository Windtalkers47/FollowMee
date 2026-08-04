import { MigrationInterface, QueryRunner } from 'typeorm';
import crypto from 'crypto';

export class TeamsAndTaskHardening1799000000000 implements MigrationInterface {
  name = 'TeamsAndTaskHardening1799000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS teams (
      teamId INT NOT NULL AUTO_INCREMENT, name VARCHAR(100) NOT NULL, isActive TINYINT(1) NOT NULL DEFAULT 1,
      createdAt TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), updatedAt TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
      PRIMARY KEY (teamId), UNIQUE KEY uq_teams_name (name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS team_members (
      teamMemberId INT NOT NULL AUTO_INCREMENT, teamId INT NOT NULL, userId INT NOT NULL,
      role ENUM('manager','member') NOT NULL DEFAULT 'member', createdAt TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
      PRIMARY KEY (teamMemberId), UNIQUE KEY uq_team_member (teamId,userId), KEY idx_team_members_user (userId,teamId),
      CONSTRAINT fk_team_member_team FOREIGN KEY (teamId) REFERENCES teams(teamId) ON DELETE CASCADE,
      CONSTRAINT fk_team_member_user FOREIGN KEY (userId) REFERENCES users(userId) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await queryRunner.query(`INSERT IGNORE INTO teams (name) VALUES ('General')`);
    const teamRows = await queryRunner.query(`SELECT teamId FROM teams WHERE name='General' LIMIT 1`);
    const teamId = Number(teamRows[0].teamId);
    await queryRunner.query(`INSERT IGNORE INTO team_members (teamId,userId,role)
      SELECT ?, u.userId, CASE WHEN r.roleName IN ('Owner','Superadmin') THEN 'manager' ELSE 'member' END
      FROM users u LEFT JOIN user_roles ur ON ur.userId=u.userId LEFT JOIN roles r ON r.roleId=ur.roleId
      WHERE u.isActive=1 GROUP BY u.userId`, [teamId]);

    if (!(await queryRunner.hasColumn('tasks', 'teamId'))) {
      await queryRunner.query(`ALTER TABLE tasks ADD COLUMN teamId INT NULL AFTER createdBy, ADD COLUMN priority ENUM('low','normal','high','urgent') NOT NULL DEFAULT 'normal' AFTER teamId, ADD COLUMN version INT NOT NULL DEFAULT 1 AFTER priority`);
      await queryRunner.query(`UPDATE tasks SET teamId=? WHERE teamId IS NULL`, [teamId]);
      await queryRunner.query(`ALTER TABLE tasks MODIFY teamId INT NOT NULL, ADD KEY idx_tasks_team_status_due (teamId,status,dueDate), ADD CONSTRAINT fk_tasks_team FOREIGN KEY (teamId) REFERENCES teams(teamId) ON DELETE RESTRICT`);
    }
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS task_watchers (
      taskId VARCHAR(36) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL, userId INT NOT NULL, createdAt TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
      PRIMARY KEY(taskId,userId), KEY idx_task_watchers_user(userId,taskId),
      CONSTRAINT fk_task_watcher_task FOREIGN KEY(taskId) REFERENCES tasks(taskId) ON DELETE CASCADE,
      CONSTRAINT fk_task_watcher_user FOREIGN KEY(userId) REFERENCES users(userId) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS task_activities (
      activityId BIGINT NOT NULL AUTO_INCREMENT, taskId VARCHAR(36) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL, actorUserId INT NULL,
      action VARCHAR(50) NOT NULL, metadata JSON NULL, createdAt TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
      PRIMARY KEY(activityId), KEY idx_task_activity_task_created(taskId,createdAt),
      CONSTRAINT fk_task_activity_task FOREIGN KEY(taskId) REFERENCES tasks(taskId) ON DELETE CASCADE,
      CONSTRAINT fk_task_activity_actor FOREIGN KEY(actorUserId) REFERENCES users(userId) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

    if (!(await queryRunner.hasColumn('user_sessions', 'refreshTokenHash'))) {
      await queryRunner.query(`ALTER TABLE user_sessions ADD COLUMN refreshTokenHash CHAR(64) NULL AFTER refreshToken`);
      const sessions = await queryRunner.query(`SELECT id,refreshToken FROM user_sessions WHERE refreshToken IS NOT NULL`);
      for (const session of sessions) {
        const hash = crypto.createHash('sha256').update(String(session.refreshToken)).digest('hex');
        await queryRunner.query(`UPDATE user_sessions SET refreshTokenHash=? WHERE id=?`, [hash, session.id]);
      }
      await queryRunner.query(`ALTER TABLE user_sessions ADD UNIQUE KEY uq_user_sessions_token_hash(refreshTokenHash)`);
      await queryRunner.query(`ALTER TABLE user_sessions MODIFY refreshToken VARCHAR(255) NULL`);
      await queryRunner.query(`UPDATE user_sessions SET refreshToken=NULL WHERE refreshTokenHash IS NOT NULL`);
    }

    const legacyRole = await queryRunner.query(`SELECT roleId FROM roles WHERE roleName='Customer' LIMIT 1`);
    const memberRole = await queryRunner.query(`SELECT roleId FROM roles WHERE roleName='Member' LIMIT 1`);
    if (legacyRole.length && memberRole.length) {
      await queryRunner.query(`INSERT IGNORE INTO user_roles(userId,roleId) SELECT userId,? FROM user_roles WHERE roleId=?`, [memberRole[0].roleId, legacyRole[0].roleId]);
      await queryRunner.query(`DELETE FROM user_roles WHERE roleId=?`, [legacyRole[0].roleId]);
      await queryRunner.query(`DELETE FROM roles WHERE roleId=?`, [legacyRole[0].roleId]);
    } else if (legacyRole.length) {
      await queryRunner.query(`UPDATE roles SET roleName='Member', description='Organization member' WHERE roleId=?`, [legacyRole[0].roleId]);
    }
    await queryRunner.query(`INSERT INTO permissions(permissionName,description) VALUES
      ('VIEW_NOTIFICATION_ANALYTICS','View organization notification analytics'),
      ('MANAGE_NOTIFICATION_SYSTEM','Manage notification delivery and retention'),
      ('MANAGE_TEAMS','Create and manage organization teams')
      ON DUPLICATE KEY UPDATE description=VALUES(description)`);
    await queryRunner.query(`INSERT IGNORE INTO role_permissions(roleId,permissionId)
      SELECT r.roleId,p.permissionId FROM roles r CROSS JOIN permissions p
      WHERE r.roleName='Owner' OR (r.roleName='Admin' AND p.permissionName IN ('VIEW_NOTIFICATION_ANALYTICS','MANAGE_TEAMS'))`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE user_sessions SET refreshToken=CONCAT('revoked-',id), isActive=0 WHERE refreshToken IS NULL`);
    await queryRunner.query(`ALTER TABLE user_sessions DROP INDEX uq_user_sessions_token_hash, DROP COLUMN refreshTokenHash, MODIFY refreshToken VARCHAR(255) NOT NULL`);
    await queryRunner.query(`DROP TABLE IF EXISTS task_activities`);
    await queryRunner.query(`DROP TABLE IF EXISTS task_watchers`);
    await queryRunner.query(`ALTER TABLE tasks DROP FOREIGN KEY fk_tasks_team, DROP INDEX idx_tasks_team_status_due, DROP COLUMN version, DROP COLUMN priority, DROP COLUMN teamId`);
    await queryRunner.query(`DROP TABLE IF EXISTS team_members`);
    await queryRunner.query(`DROP TABLE IF EXISTS teams`);
    await queryRunner.query(`UPDATE roles SET roleName='Customer' WHERE roleName='Member'`);
  }
}
