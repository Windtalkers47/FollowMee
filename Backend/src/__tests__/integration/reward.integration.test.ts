import dataSource from '../../config/database';
import { User } from '../../entities/User';
import { rewardService } from '../../services/reward.service';
import { webSocketService } from '../../services/websocket.service';
import { NotificationHelper } from '../../utils/notification.util';

describe('Rewards economy integration', () => {
  let ownerId: number;
  let firstUserId: number;
  let secondUserId: number;

  beforeAll(async () => {
    await dataSource.initialize();
    const users = dataSource.getRepository(User);
    ownerId = (await users.findOneByOrFail({ userEmail: 'qa-creator@example.test' })).userId;
    firstUserId = (await users.findOneByOrFail({ userEmail: 'qa-assignee@example.test' })).userId;
    secondUserId = (await users.findOneByOrFail({ userEmail: 'qa-reviewer@example.test' })).userId;
    jest.spyOn(webSocketService, 'emitDomainEvent').mockImplementation(() => undefined);
    jest.spyOn(NotificationHelper, 'notifyRewardRedemption').mockResolvedValue(undefined);
  });

  beforeEach(async () => {
    await dataSource.query('DELETE FROM reward_redemptions');
    await dataSource.query('DELETE FROM reward_point_ledger');
    await dataSource.query('DELETE FROM reward_catalog_items');
    await dataSource.query('DELETE FROM reward_wallets');
    await dataSource.query('DELETE FROM mission_progress_events');
    await dataSource.query('DELETE FROM user_mission_progress');
    await dataSource.query('DELETE FROM mission_instances');
    await dataSource.query('DELETE FROM mission_templates');
    await dataSource.query('DELETE FROM user_badges');
    await dataSource.query('DELETE FROM reward_badges');
    await dataSource.query('DELETE FROM reward_seasons');
    await dataSource.query('UPDATE reward_settings SET redemptionEnabled = 1, requestExpiryHours = 72 WHERE singletonId = 1');
  });

  afterAll(async () => {
    if (dataSource.isInitialized) await dataSource.destroy();
  });

  it('credits a completed task exactly once', async () => {
    const input = {
      taskId: 'reward-idempotency-e2e',
      userId: firstUserId,
      score: 13,
      completedAt: new Date(),
      dueDate: new Date(Date.now() + 60_000),
      reopenedCount: 0,
    };
    await rewardService.awardTaskCompletion(input);
    await rewardService.awardTaskCompletion(input);

    const wallet = (await dataSource.query('SELECT * FROM reward_wallets WHERE userId = ?', [firstUserId]))[0];
    const ledger = await dataSource.query("SELECT * FROM reward_point_ledger WHERE idempotencyKey = 'task:reward-idempotency-e2e:completion'");
    expect(Number(wallet.availablePoints)).toBe(13);
    expect(Number(wallet.lifetimeEarned)).toBe(13);
    expect(ledger).toHaveLength(1);
  });

  it('generates the current mission set idempotently without multiplying missions', async () => {
    await rewardService.ensureDevelopmentSeed();
    await rewardService.ensureCurrentSeasonAndMissions();
    await rewardService.ensureCurrentSeasonAndMissions();

    const rows = await dataSource.query(`
      SELECT mt.cadence, mt.scope, COUNT(*) AS total
      FROM mission_instances mi JOIN mission_templates mt ON mt.templateId = mi.templateId
      WHERE NOW() >= mi.startsAt AND NOW() < mi.endsAt
      GROUP BY mt.cadence, mt.scope
    `);
    const count = (cadence: string, scope: string) => Number(rows.find((row: any) => row.cadence === cadence && row.scope === scope)?.total || 0);
    expect(count('weekly', 'shared')).toBe(2);
    expect(count('weekly', 'personal')).toBe(1);
    expect(count('monthly', 'shared')).toBe(1);
  });

  it('reserves the last catalog item for only one concurrent requester', async () => {
    await dataSource.query('INSERT INTO reward_wallets (userId, availablePoints, lifetimeEarned) VALUES (?,100,100),(?,100,100)', [firstUserId, secondUserId]);
    const item = await rewardService.upsertCatalogItem(ownerId, null, {
      name: 'Last item concurrency test', pointsCost: 40, availableStock: 1, perUserLimit: 1, isActive: true,
    });

    const results = await Promise.allSettled([
      rewardService.requestRedemption(firstUserId, Number(item.itemId), 1, 'concurrent-first'),
      rewardService.requestRedemption(secondUserId, Number(item.itemId), 1, 'concurrent-second'),
    ]);
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter(result => result.status === 'rejected')).toHaveLength(1);

    const stock = (await dataSource.query('SELECT availableStock, reservedStock FROM reward_catalog_items WHERE itemId = ?', [item.itemId]))[0];
    expect(Number(stock.availableStock)).toBe(0);
    expect(Number(stock.reservedStock)).toBe(1);
    expect(Number((await dataSource.query("SELECT COUNT(*) AS total FROM reward_redemptions WHERE status = 'pending'"))[0].total)).toBe(1);
  });

  it('validates catalog active dates and does not deactivate an item with a pending request', async () => {
    await expect(rewardService.upsertCatalogItem(ownerId, null, {
      name: 'Invalid period', pointsCost: 40, availableStock: 1,
      startsAt: '2026-08-10T10:00:00+07:00', endsAt: '2026-08-09T10:00:00+07:00',
    })).rejects.toMatchObject({ code: 'REWARD_ITEM_INVALID', statusCode: 400 });

    await dataSource.query('INSERT INTO reward_wallets (userId, availablePoints, lifetimeEarned) VALUES (?,100,100)', [firstUserId]);
    const item = await rewardService.upsertCatalogItem(ownerId, null, {
      name: 'Pending request item', pointsCost: 40, availableStock: 1, perUserLimit: 1,
      startsAt: '2026-08-01T00:00:00+07:00', endsAt: '2026-09-01T00:00:00+07:00',
    });
    await rewardService.requestRedemption(firstUserId, Number(item.itemId), 1, 'deactivate-protection');

    await expect(rewardService.deactivateCatalogItem(ownerId, Number(item.itemId)))
      .rejects.toMatchObject({ code: 'REWARD_ITEM_HAS_PENDING_REQUESTS', statusCode: 409 });
  });
});
