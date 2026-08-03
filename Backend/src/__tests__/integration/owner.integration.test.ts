import dataSource from '../../config/database';
import { OwnerService } from '../../services/owner.service';
import { webSocketService } from '../../services/websocket.service';

describe('Owner singleton transfer integration', () => {
  const password = process.env.E2E_QA_PASSWORD || 'FollowMee-QA-2026!';
  let creatorId: number;
  let assigneeId: number;
  let reviewerId: number;

  beforeAll(async () => {
    await dataSource.initialize();
    const rows = await dataSource.query("SELECT userId,userEmail FROM users WHERE userEmail IN ('qa-creator@example.test','qa-assignee@example.test','qa-reviewer@example.test')");
    creatorId = Number(rows.find((row: any) => row.userEmail === 'qa-creator@example.test').userId);
    assigneeId = Number(rows.find((row: any) => row.userEmail === 'qa-assignee@example.test').userId);
    reviewerId = Number(rows.find((row: any) => row.userEmail === 'qa-reviewer@example.test').userId);
    jest.spyOn(webSocketService, 'emitDomainEvent').mockImplementation(() => undefined);
  });

  beforeEach(async () => {
    const roles = await dataSource.query("SELECT roleId,roleName FROM roles WHERE roleName IN ('Owner','Admin')");
    const ownerRoleId = Number(roles.find((row: any) => row.roleName === 'Owner').roleId);
    const adminRoleId = Number(roles.find((row: any) => row.roleName === 'Admin').roleId);
    await dataSource.transaction(async manager => {
      await manager.query('DELETE FROM user_roles WHERE userId IN (?,?,?)', [creatorId, assigneeId, reviewerId]);
      await manager.query('INSERT INTO user_roles (userId,roleId) VALUES (?,?),(?,?),(?,?)', [creatorId, ownerRoleId, assigneeId, adminRoleId, reviewerId, adminRoleId]);
      await manager.query('UPDATE system_owner SET userId = ? WHERE singletonId = 1', [creatorId]);
    });
  });

  afterAll(async () => {
    if (dataSource.isInitialized) await dataSource.destroy();
  });

  it('allows only one of two concurrent transfers from the same Owner', async () => {
    const service = new OwnerService();
    const outcomes = await Promise.allSettled([
      service.transferOwner(creatorId, assigneeId, password),
      service.transferOwner(creatorId, reviewerId, password),
    ]);
    expect(outcomes.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect(outcomes.filter(result => result.status === 'rejected')).toHaveLength(1);

    const ownerRows = await dataSource.query(`
      SELECT so.userId, COUNT(*) OVER () AS total
      FROM system_owner so
      JOIN user_roles ur ON ur.userId = so.userId
      JOIN roles r ON r.roleId = ur.roleId AND r.roleName = 'Owner'
    `);
    expect(ownerRows).toHaveLength(1);
    expect([assigneeId, reviewerId]).toContain(Number(ownerRows[0].userId));
  });
});
