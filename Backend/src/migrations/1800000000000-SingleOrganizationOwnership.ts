import { MigrationInterface, QueryRunner } from 'typeorm';

export class SingleOrganizationOwnership1800000000000 implements MigrationInterface {
  name = 'SingleOrganizationOwnership1800000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('customers', 'assignedTo'))) {
      await queryRunner.query(`ALTER TABLE customers ADD COLUMN assignedTo INT NULL AFTER userId`);
    }
    await queryRunner.query(`UPDATE customers SET assignedTo=COALESCE(assignedTo,userId,createdBy) WHERE assignedTo IS NULL`);

    let customers = await queryRunner.getTable('customers');
    if (customers && !customers.indices.some(index => index.name === 'idx_customers_assigned_to')) {
      await queryRunner.query(`ALTER TABLE customers ADD KEY idx_customers_assigned_to (assignedTo)`);
    }
    customers = await queryRunner.getTable('customers');
    if (customers && !customers.foreignKeys.some(key => key.name === 'fk_customers_assigned_to')) {
      await queryRunner.query(`ALTER TABLE customers ADD CONSTRAINT fk_customers_assigned_to FOREIGN KEY (assignedTo) REFERENCES users(userId) ON DELETE SET NULL`);
    }

    if (await queryRunner.hasColumn('tasks', 'teamId')) {
      const tasks = await queryRunner.getTable('tasks');
      const teamForeignKey = tasks?.foreignKeys.find(key => key.columnNames.includes('teamId'));
      if (teamForeignKey) await queryRunner.dropForeignKey('tasks', teamForeignKey);
      const teamIndex = tasks?.indices.find(index => index.name === 'idx_tasks_team_status_due');
      if (teamIndex) await queryRunner.dropIndex('tasks', teamIndex);
      await queryRunner.query(`ALTER TABLE tasks DROP COLUMN teamId`);
    }

    await queryRunner.query(`DROP TABLE IF EXISTS team_members`);
    await queryRunner.query(`DROP TABLE IF EXISTS teams`);
    await queryRunner.query(`DELETE rp FROM role_permissions rp INNER JOIN permissions p ON p.permissionId=rp.permissionId WHERE p.permissionName='MANAGE_TEAMS'`);
    await queryRunner.query(`DELETE FROM permissions WHERE permissionName='MANAGE_TEAMS'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
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
      SELECT ?,u.userId,CASE WHEN MAX(CASE WHEN r.roleName IN ('Owner','Superadmin') THEN 1 ELSE 0 END)=1 THEN 'manager' ELSE 'member' END
      FROM users u LEFT JOIN user_roles ur ON ur.userId=u.userId LEFT JOIN roles r ON r.roleId=ur.roleId
      WHERE u.isActive=1 GROUP BY u.userId`, [teamId]);

    if (!(await queryRunner.hasColumn('tasks', 'teamId'))) {
      await queryRunner.query(`ALTER TABLE tasks ADD COLUMN teamId INT NULL AFTER createdBy`);
      await queryRunner.query(`UPDATE tasks SET teamId=? WHERE teamId IS NULL`, [teamId]);
      await queryRunner.query(`ALTER TABLE tasks MODIFY teamId INT NOT NULL, ADD KEY idx_tasks_team_status_due (teamId,status,dueDate), ADD CONSTRAINT fk_tasks_team FOREIGN KEY (teamId) REFERENCES teams(teamId) ON DELETE RESTRICT`);
    }

    await queryRunner.query(`INSERT INTO permissions(permissionName,description) VALUES ('MANAGE_TEAMS','Create and manage organization teams') ON DUPLICATE KEY UPDATE description=VALUES(description)`);
    await queryRunner.query(`INSERT IGNORE INTO role_permissions(roleId,permissionId)
      SELECT r.roleId,p.permissionId FROM roles r CROSS JOIN permissions p
      WHERE p.permissionName='MANAGE_TEAMS' AND r.roleName IN ('Owner','Admin')`);

    if (await queryRunner.hasColumn('customers', 'assignedTo')) {
      const customers = await queryRunner.getTable('customers');
      const assignedForeignKey = customers?.foreignKeys.find(key => key.columnNames.includes('assignedTo'));
      if (assignedForeignKey) await queryRunner.dropForeignKey('customers', assignedForeignKey);
      const assignedIndex = customers?.indices.find(index => index.name === 'idx_customers_assigned_to');
      if (assignedIndex) await queryRunner.dropIndex('customers', assignedIndex);
      await queryRunner.query(`ALTER TABLE customers DROP COLUMN assignedTo`);
    }
  }
}
