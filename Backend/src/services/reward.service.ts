import crypto from 'crypto';
import AppDataSource from '../config/database';
import { ApplicationError } from '../errors/application.error';
import { webSocketService } from './websocket.service';
import { NotificationHelper } from '../utils/notification.util';
import { outboxService } from './outbox.service';

type MissionCadence = 'weekly' | 'monthly';
type RedemptionDecision = 'approved' | 'rejected' | 'fulfilled';

interface TaskRewardInput {
  taskId: string;
  userId: number;
  score: number;
  completedAt: Date;
  dueDate?: Date | null;
  reopenedCount: number;
}

const bangkokDateParts = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const value = (type: string) => parts.find(part => part.type === type)?.value || '';
  return { year: Number(value('year')), month: Number(value('month')), day: Number(value('day')) };
};

const dateAtBangkok = (year: number, month: number, day: number) =>
  new Date(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00+07:00`);

const getPeriods = (now = new Date()) => {
  const { year, month, day } = bangkokDateParts(now);
  const monthStart = dateAtBangkok(year, month, 1);
  const nextMonthStart = month === 12 ? dateAtBangkok(year + 1, 1, 1) : dateAtBangkok(year, month + 1, 1);
  const localDate = dateAtBangkok(year, month, day);
  const localWeekday = new Date(localDate.getTime() + 7 * 3_600_000).getUTCDay();
  const weekday = (localWeekday + 6) % 7; // Monday = 0 in the Bangkok calendar.
  const monday = new Date(localDate.getTime() - weekday * 86_400_000);
  const nextMonday = new Date(monday.getTime() + 7 * 86_400_000);
  const mondayParts = bangkokDateParts(monday);
  const weekKey = `week-${mondayParts.year}-${String(mondayParts.month).padStart(2, '0')}-${String(mondayParts.day).padStart(2, '0')}`;
  return {
    monthly: { key: `${year}-${String(month).padStart(2, '0')}`, start: monthStart, end: nextMonthStart },
    weekly: { key: weekKey, start: monday, end: nextMonday },
  };
};

export class RewardService {
  private expiryTimer: NodeJS.Timeout | null = null;

  constructor() {
    outboxService.register('reward.season.achievement', async payload => {
      const userId = Number(payload.userId);
      const seasonId = Number(payload.seasonId);
      const existing = await AppDataSource.query(`
        SELECT n.notificationId FROM notifications n
        INNER JOIN notification_recipients nr ON nr.notificationId=n.notificationId
        WHERE n.notificationType='SYSTEM_ANNOUNCEMENT' AND n.entityType='reward_season'
          AND n.entityId=? AND n.titleKey='notification.reward.seasonRank.title' AND nr.userId=?
        LIMIT 1
      `, [String(seasonId), userId]);
      if (!existing.length) {
        await NotificationHelper.notifyRewardAchievement(userId, seasonId, Number(payload.rank));
      }
    });
  }

  startExpiryWorker(): void {
    if (this.expiryTimer) return;
    void this.releaseExpiredRedemptions();
    void this.closeExpiredSeasons();
    this.expiryTimer = setInterval(() => { void this.releaseExpiredRedemptions(); void this.closeExpiredSeasons(); }, 15 * 60 * 1000);
    this.expiryTimer.unref?.();
  }

  stopExpiryWorker(): void {
    if (this.expiryTimer) clearInterval(this.expiryTimer);
    this.expiryTimer = null;
  }

  async ensureDevelopmentSeed(): Promise<void> {
    if (process.env.NODE_ENV === 'production' || process.env.REWARD_DEV_SEED === 'false') return;
    await AppDataSource.query('UPDATE reward_settings SET redemptionEnabled = 1 WHERE singletonId = 1');
    await AppDataSource.query(`
      INSERT INTO reward_badges (badgeKey, nameKey, descriptionKey, icon) VALUES
        ('on-time-star','rewards.badge.onTime','rewards.badge.onTimeDescription','schedule'),
        ('first-pass-quality','rewards.badge.firstPass','rewards.badge.firstPassDescription','verified'),
        ('consistency','rewards.badge.consistency','rewards.badge.consistencyDescription','streak'),
        ('top-three','rewards.badge.topThree','rewards.badge.topThreeDescription','trophy'),
        ('comeback','rewards.badge.comeback','rewards.badge.comebackDescription','comeback')
      ON DUPLICATE KEY UPDATE nameKey = VALUES(nameKey), descriptionKey = VALUES(descriptionKey)
    `);
    await AppDataSource.query(`
      INSERT INTO reward_badges (badgeKey, nameKey, descriptionKey, icon, auraKey, rankValue) VALUES
        ('season-champion','rewards.badge.champion','rewards.badge.championDescription','emoji_events','champion-gold',1),
        ('season-runner-up','rewards.badge.runnerUp','rewards.badge.runnerUpDescription','military_tech','runner-silver',2),
        ('season-third-place','rewards.badge.thirdPlace','rewards.badge.thirdPlaceDescription','workspace_premium','third-bronze',3)
      ON DUPLICATE KEY UPDATE auraKey = VALUES(auraKey), rankValue = VALUES(rankValue)
    `);
    await AppDataSource.query(`
      INSERT INTO mission_templates
        (templateKey, category, cadence, scope, titleKey, descriptionKey, defaultTarget, defaultRewardPoints)
      VALUES
        ('weekly-first-pass','quality','weekly','shared','rewards.mission.firstPass','rewards.mission.firstPassDescription',3,8),
        ('weekly-quality-review','quality','weekly','shared','rewards.mission.firstPass','rewards.mission.firstPassDescription',4,9),
        ('weekly-on-time','on_time','weekly','shared','rewards.mission.onTime','rewards.mission.onTimeDescription',3,8),
        ('weekly-deadline-guard','on_time','weekly','shared','rewards.mission.onTime','rewards.mission.onTimeDescription',4,9),
        ('weekly-recovery','recovery','weekly','shared','rewards.mission.recovery','rewards.mission.recoveryDescription',2,6),
        ('weekly-comeback','recovery','weekly','shared','rewards.mission.recovery','rewards.mission.recoveryDescription',3,7),
        ('weekly-consistency','consistency','weekly','shared','rewards.mission.consistency','rewards.mission.consistencyDescription',4,9),
        ('weekly-steady-finish','consistency','weekly','shared','rewards.mission.consistency','rewards.mission.consistencyDescription',5,10),
        ('monthly-consistency','consistency','monthly','shared','rewards.mission.consistency','rewards.mission.consistencyDescription',8,20),
        ('monthly-quality','quality','monthly','shared','rewards.mission.firstPass','rewards.mission.firstPassDescription',8,20),
        ('personal-quality','quality','weekly','personal','rewards.mission.personalQuality','rewards.mission.personalQualityDescription',2,5),
        ('personal-on-time','on_time','weekly','personal','rewards.mission.onTime','rewards.mission.onTimeDescription',2,5),
        ('personal-recovery','recovery','weekly','personal','rewards.mission.recovery','rewards.mission.recoveryDescription',2,5),
        ('personal-consistency','consistency','weekly','personal','rewards.mission.consistency','rewards.mission.consistencyDescription',3,6)
      ON DUPLICATE KEY UPDATE isActive = VALUES(isActive)
    `);
    const ownerRows = await AppDataSource.query('SELECT userId FROM system_owner WHERE singletonId = 1');
    const ownerId = Number(ownerRows[0]?.userId || 0) || null;
    await AppDataSource.query(`
      INSERT INTO reward_catalog_items
        (catalogKey, name, description, pointsCost, availableStock, perUserLimit, isActive, createdBy, updatedBy)
      VALUES
        ('dev-coffee','Coffee Treat','A small coffee reward for consistent work',40,20,2,1,?,?),
        ('dev-lunch','Team Lunch Voucher','A lunch voucher for a strong monthly contribution',120,8,1,1,?,?),
        ('dev-flex','Flex Time Coupon','Redeem for one approved flexible-hour request',180,4,1,1,?,?)
      ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description)
    `, [ownerId, ownerId, ownerId, ownerId, ownerId, ownerId]);
    await this.ensureCurrentSeasonAndMissions();
  }

  private async ensureSeason(manager: { query: (sql: string, params?: unknown[]) => Promise<any> }, now = new Date()) {
    const period = getPeriods(now).monthly;
    await manager.query(`
      INSERT IGNORE INTO reward_seasons (seasonKey, name, startsAt, endsAt, status)
      VALUES (?, ?, ?, ?, 'active')
    `, [period.key, `Season ${period.key}`, period.start, period.end]);
    const rows = await manager.query('SELECT * FROM reward_seasons WHERE seasonKey = ? LIMIT 1', [period.key]);
    return rows[0];
  }

  async ensureCurrentSeasonAndMissions(now = new Date()): Promise<void> {
    await this.ensureSeason(AppDataSource, now);
    const periods = getPeriods(now);
    for (const cadence of ['weekly', 'monthly'] as MissionCadence[]) {
      const period = periods[cadence];
      const limit = cadence === 'weekly' ? 2 : 1;
      const existingRows = await AppDataSource.query(`
        SELECT COUNT(*) AS total FROM mission_instances mi
        INNER JOIN mission_templates mt ON mt.templateId = mi.templateId
        WHERE mi.periodKey = ? AND mt.cadence = ? AND mt.scope = 'shared'
      `, [period.key, cadence]);
      const needed = Math.max(0, limit - Number(existingRows[0]?.total || 0));
      if (!needed) continue;
      const previousCategories = await AppDataSource.query(`
        SELECT DISTINCT mt.category
        FROM mission_instances mi
        INNER JOIN mission_templates mt ON mt.templateId = mi.templateId
        WHERE mt.cadence = ? AND mt.scope = 'shared' AND mi.endsAt <= ?
        ORDER BY mi.endsAt DESC LIMIT ?
      `, [cadence, period.start, limit]);
      const excluded = previousCategories.map((row: any) => row.category);
      const categoryClause = excluded.length ? `AND mt.category NOT IN (${excluded.map(() => '?').join(',')})` : '';
      let templates = await AppDataSource.query(`
        SELECT mt.*
        FROM mission_templates mt
        WHERE mt.isActive = 1 AND mt.cadence = ? AND mt.scope = 'shared'
          AND NOT EXISTS (
            SELECT 1 FROM mission_instances recent
            WHERE recent.templateId = mt.templateId AND recent.startsAt >= DATE_SUB(?, INTERVAL 28 DAY)
          )
          ${categoryClause}
        ORDER BY mt.templateId
        LIMIT ?
      `, [cadence, period.start, ...excluded, needed]);
      if (templates.length < needed) {
        const selectedIds = templates.map((row: any) => Number(row.templateId));
        const idClause = selectedIds.length ? `AND mt.templateId NOT IN (${selectedIds.map(() => '?').join(',')})` : '';
        const fill = await AppDataSource.query(`
          SELECT mt.* FROM mission_templates mt
          WHERE mt.isActive = 1 AND mt.cadence = ? AND mt.scope = 'shared'
            AND NOT EXISTS (
              SELECT 1 FROM mission_instances recent
              WHERE recent.templateId = mt.templateId AND recent.startsAt >= DATE_SUB(?, INTERVAL 28 DAY)
            )
            ${idClause}
          ORDER BY mt.templateId LIMIT ?
        `, [cadence, period.start, ...selectedIds, needed - templates.length]);
        templates = [...templates, ...fill];
      }
      for (const template of templates) {
        await AppDataSource.query(`
          INSERT IGNORE INTO mission_instances
            (templateId, periodKey, startsAt, endsAt, target, rewardPoints, generatedBy)
          VALUES (?, ?, ?, ?, ?, ?, 'automatic')
        `, [template.templateId, period.key, period.start, period.end, template.defaultTarget, template.defaultRewardPoints]);
      }
    }
    const existingPersonal = await AppDataSource.query(`
      SELECT COUNT(*) AS total FROM mission_instances mi
      INNER JOIN mission_templates mt ON mt.templateId = mi.templateId
      WHERE mi.periodKey = ? AND mt.cadence = 'weekly' AND mt.scope = 'personal'
    `, [periods.weekly.key]);
    const personal = Number(existingPersonal[0]?.total || 0) > 0 ? [] : await AppDataSource.query(`
      SELECT mt.* FROM mission_templates mt
      WHERE mt.isActive = 1 AND mt.cadence = 'weekly' AND mt.scope = 'personal'
        AND NOT EXISTS (
          SELECT 1 FROM mission_instances recent
          WHERE recent.templateId = mt.templateId AND recent.startsAt >= DATE_SUB(?, INTERVAL 28 DAY)
        )
      ORDER BY mt.templateId LIMIT 1
    `, [periods.weekly.start]);
    if (personal[0]) {
      const period = periods.weekly;
      await AppDataSource.query(`
        INSERT IGNORE INTO mission_instances
          (templateId, periodKey, startsAt, endsAt, target, rewardPoints, generatedBy)
        VALUES (?, ?, ?, ?, ?, ?, 'automatic')
      `, [personal[0].templateId, period.key, period.start, period.end, personal[0].defaultTarget, personal[0].defaultRewardPoints]);
    }
  }

  private async ensureUserMissionProgress(userId: number): Promise<void> {
    await this.ensureCurrentSeasonAndMissions();
    const missions = await AppDataSource.query(`
      SELECT mi.*, mt.scope
      FROM mission_instances mi
      INNER JOIN mission_templates mt ON mt.templateId = mi.templateId
      WHERE mi.isActive = 1 AND NOW() >= mi.startsAt AND NOW() < mi.endsAt
    `);
    for (const mission of missions) {
      const workloadRows = await AppDataSource.query(`
        SELECT COUNT(*) AS total FROM tasks
        WHERE assignedTo = ? AND isActive = 1 AND status NOT IN ('draft','cancelled')
          AND COALESCE(endDate, dueDate, updatedAt) < ?
      `, [userId, mission.endsAt]);
      const workload = Number(workloadRows[0]?.total || 0);
      if (workload < 2) continue;
      const target = Math.min(Number(mission.target), Math.max(2, workload));
      await AppDataSource.query(`
        INSERT IGNORE INTO user_mission_progress (missionId, userId, target)
        VALUES (?, ?, ?)
      `, [mission.missionId, userId, target]);
    }
  }

  private missionMatches(templateKey: string, task: TaskRewardInput): boolean {
    if (templateKey.includes('first-pass') || templateKey.includes('quality')) return task.reopenedCount === 0;
    if (templateKey.includes('on-time')) return Boolean(task.dueDate && task.completedAt <= new Date(task.dueDate));
    if (templateKey.includes('recovery')) return task.reopenedCount > 0;
    return true;
  }

  async awardTaskCompletion(input: TaskRewardInput): Promise<void> {
    if (!input.userId || input.score <= 0) return;
    await this.ensureUserMissionProgress(input.userId);
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const season = await this.ensureSeason(queryRunner.manager, input.completedAt);
      await queryRunner.query('INSERT IGNORE INTO reward_wallets (userId) VALUES (?)', [input.userId]);
      const result = await queryRunner.query(`
        INSERT IGNORE INTO reward_point_ledger
          (userId, seasonId, entryType, amount, sourceType, sourceId, idempotencyKey, metadata)
        VALUES (?, ?, 'credit', ?, 'task', ?, ?, ?)
      `, [input.userId, season.seasonId, input.score, input.taskId, `task:${input.taskId}:completion`, JSON.stringify({ reopenedCount: input.reopenedCount })]);
      if (Number(result?.affectedRows || 0) > 0) {
        await queryRunner.query(`
          UPDATE reward_wallets
          SET availablePoints = availablePoints + ?, lifetimeEarned = lifetimeEarned + ?
          WHERE userId = ?
        `, [input.score, input.score, input.userId]);
      }
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
    await this.progressMissions(input);
    await this.awardTaskBadges(input);
    webSocketService.emitDomainEvent('reward:points-updated', {
      userId: input.userId, sourceId: input.taskId, revision: input.completedAt.toISOString(),
    }, [input.userId]);
    webSocketService.emitDomainEvent('reward:mission-progress', {
      userId: input.userId, sourceId: input.taskId, revision: input.completedAt.toISOString(),
    }, [input.userId]);
  }

  private async progressMissions(input: TaskRewardInput): Promise<void> {
    const missions = await AppDataSource.query(`
      SELECT ump.*, mi.periodKey, mi.rewardPoints, mt.templateKey, mt.cadence
      FROM user_mission_progress ump
      INNER JOIN mission_instances mi ON mi.missionId = ump.missionId
      INNER JOIN mission_templates mt ON mt.templateId = mi.templateId
      WHERE ump.userId = ? AND ump.completedAt IS NULL
        AND ? >= mi.startsAt AND ? < mi.endsAt
      ORDER BY mi.rewardPoints DESC, mi.missionId ASC
    `, [input.userId, input.completedAt, input.completedAt]);
    for (const cadence of ['weekly', 'monthly'] as MissionCadence[]) {
      const eligible = missions.find((mission: any) => mission.cadence === cadence && this.missionMatches(mission.templateKey, input));
      if (!eligible) continue;
      const queryRunner = AppDataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      try {
        const event = await queryRunner.query(`
          INSERT IGNORE INTO mission_progress_events
            (missionId, userId, cadence, periodKey, sourceId)
          VALUES (?, ?, ?, ?, ?)
        `, [eligible.missionId, input.userId, cadence, eligible.periodKey, input.taskId]);
        if (Number(event?.affectedRows || 0) > 0) {
          await queryRunner.query(`
            UPDATE user_mission_progress
            SET progress = LEAST(target, progress + 1), lastSourceId = ?,
                completedAt = CASE WHEN progress + 1 >= target THEN CURRENT_TIMESTAMP ELSE completedAt END
            WHERE progressId = ?
          `, [input.taskId, eligible.progressId]);
        }
        await queryRunner.commitTransaction();
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }
      await this.claimCompletedMission(Number(eligible.progressId), input.userId);
    }
  }

  private async claimCompletedMission(progressId: number, userId: number): Promise<void> {
    const rows = await AppDataSource.query(`
      SELECT ump.*, mi.rewardPoints, mi.missionId, rs.seasonId
      FROM user_mission_progress ump
      INNER JOIN mission_instances mi ON mi.missionId = ump.missionId
      LEFT JOIN reward_seasons rs ON mi.startsAt >= rs.startsAt AND mi.startsAt < rs.endsAt
      WHERE ump.progressId = ? AND ump.userId = ? AND ump.completedAt IS NOT NULL AND ump.rewardClaimedAt IS NULL
    `, [progressId, userId]);
    if (!rows[0]) return;
    const mission = rows[0];
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const locked = await queryRunner.query(`
        SELECT rewardClaimedAt FROM user_mission_progress WHERE progressId = ? FOR UPDATE
      `, [progressId]);
      if (locked[0]?.rewardClaimedAt) {
        await queryRunner.rollbackTransaction();
        return;
      }
      const ledger = await queryRunner.query(`
        INSERT IGNORE INTO reward_point_ledger
          (userId, seasonId, entryType, amount, sourceType, sourceId, idempotencyKey)
        VALUES (?, ?, 'credit', ?, 'mission', ?, ?)
      `, [userId, mission.seasonId || null, mission.rewardPoints, String(mission.missionId), `mission:${mission.missionId}:user:${userId}`]);
      if (Number(ledger?.affectedRows || 0) > 0) {
        await queryRunner.query('INSERT IGNORE INTO reward_wallets (userId) VALUES (?)', [userId]);
        await queryRunner.query(`
          UPDATE reward_wallets SET availablePoints = availablePoints + ?, lifetimeEarned = lifetimeEarned + ? WHERE userId = ?
        `, [mission.rewardPoints, mission.rewardPoints, userId]);
      }
      await queryRunner.query('UPDATE user_mission_progress SET rewardClaimedAt = CURRENT_TIMESTAMP WHERE progressId = ?', [progressId]);
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async awardTaskBadges(input: TaskRewardInput): Promise<void> {
    const keys: string[] = [];
    if (input.reopenedCount === 0) keys.push('first-pass-quality');
    if (input.dueDate && input.completedAt <= new Date(input.dueDate)) keys.push('on-time-star');
    if (input.reopenedCount > 0) keys.push('comeback');
    for (const key of keys) {
      await AppDataSource.query(`
        INSERT IGNORE INTO user_badges (userId, badgeId, sourceId)
        SELECT ?, badgeId, ? FROM reward_badges WHERE badgeKey = ?
      `, [input.userId, `task:${input.taskId}`, key]);
    }
  }

  async getSummary(userId: number) {
    await this.releaseExpiredRedemptions();
    const missingCredits = await AppDataSource.query(`
      SELECT t.taskId, t.assignedTo AS userId, t.completionScore AS score, t.completedAt,
             t.dueDate, t.reopenedCount
      FROM tasks t
      WHERE t.assignedTo = ? AND t.status = 'done' AND t.completionScore > 0 AND t.completedAt IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM reward_point_ledger ledger
          WHERE ledger.idempotencyKey = CONCAT('task:', t.taskId, ':completion')
        )
      LIMIT 200
    `, [userId]);
    for (const task of missingCredits) {
      await this.awardTaskCompletion({
        taskId: task.taskId,
        userId: Number(task.userId),
        score: Number(task.score),
        completedAt: new Date(task.completedAt),
        dueDate: task.dueDate ? new Date(task.dueDate) : null,
        reopenedCount: Number(task.reopenedCount || 0),
      });
    }
    await this.ensureUserMissionProgress(userId);
    await AppDataSource.query('INSERT IGNORE INTO reward_wallets (userId) VALUES (?)', [userId]);
    const season = await this.ensureSeason(AppDataSource);
    const [walletRows, scoreRows, missions, badges, redemptions, leaderboard] = await Promise.all([
      AppDataSource.query('SELECT availablePoints, reservedPoints, lifetimeEarned FROM reward_wallets WHERE userId = ?', [userId]),
      AppDataSource.query(`SELECT COALESCE(SUM(completionScore),0) AS score, COUNT(*) AS completedTasks FROM tasks WHERE assignedTo = ? AND status = 'done' AND completedAt >= ? AND completedAt < ?`, [userId, season.startsAt, season.endsAt]),
      this.getMissions(userId),
      AppDataSource.query(`SELECT rb.badgeKey, rb.nameKey, rb.descriptionKey, rb.icon, rb.auraKey, rb.rankValue, ub.seasonId, ub.awardedAt FROM user_badges ub INNER JOIN reward_badges rb ON rb.badgeId = ub.badgeId WHERE ub.userId = ? ORDER BY ub.awardedAt DESC`, [userId]),
      AppDataSource.query(`SELECT rr.*, rci.name AS itemName FROM reward_redemptions rr INNER JOIN reward_catalog_items rci ON rci.itemId = rr.itemId WHERE rr.userId = ? ORDER BY rr.createdAt DESC LIMIT 20`, [userId]),
      this.getLeaderboard(season.seasonId, season.startsAt, season.endsAt),
    ]);
    const myRank = leaderboard.findIndex((entry: any) => Number(entry.userId) === userId) + 1;
    return {
      season,
      wallet: walletRows[0],
      seasonScore: Number(scoreRows[0]?.score || 0),
      completedTasks: Number(scoreRows[0]?.completedTasks || 0),
      myRank: myRank || null,
      leaderboard,
      missions,
      badges,
      latestAchievement: badges[0] || null,
      seasonPodium: leaderboard.slice(0, 3),
      availableAuras: badges.filter((badge: any) => badge.auraKey).map((badge: any) => badge.auraKey),
      redemptions,
    };
  }

  private async getLeaderboard(_seasonId: number, startsAt: Date, endsAt: Date) {
    return AppDataSource.query(`
      SELECT u.userId, u.userName, u.userLastName, u.userImageUrl,
             COALESCE(SUM(t.completionScore),0) AS score,
             COUNT(t.taskId) AS completedTasks,
             SUM(CASE WHEN t.reopenedCount = 0 THEN 1 ELSE 0 END) AS firstPassTasks,
             SUM(CASE WHEN t.dueDate IS NOT NULL AND t.completedAt <= t.dueDate THEN 1 ELSE 0 END) AS onTimeTasks,
             MAX(t.completedAt) AS lastScoredAt
      FROM users u
      LEFT JOIN tasks t ON t.assignedTo = u.userId AND t.status = 'done' AND t.completedAt >= ? AND t.completedAt < ?
      WHERE u.isActive = 1
      GROUP BY u.userId
      ORDER BY score DESC, onTimeTasks DESC, firstPassTasks DESC, lastScoredAt ASC
      LIMIT 20
    `, [startsAt, endsAt]);
  }

  async listSeasons() {
    return AppDataSource.query(`
      SELECT rs.*, COUNT(rsr.resultId) AS participantCount
      FROM reward_seasons rs
      LEFT JOIN reward_season_results rsr ON rsr.seasonId = rs.seasonId
      GROUP BY rs.seasonId
      ORDER BY rs.startsAt DESC
    `);
  }

  private async closeExpiredSeasons() {
    const rows = await AppDataSource.query("SELECT seasonId FROM reward_seasons WHERE status <> 'closed' AND endsAt <= NOW() ORDER BY endsAt LIMIT 10");
    for (const row of rows) await this.closeSeason(Number(row.seasonId)).catch(error => console.error('reward_season_close_failed', { seasonId: row.seasonId, error: error instanceof Error ? error.message : String(error) }));
  }

  async getSeason(seasonId: number) {
    const seasons = await AppDataSource.query('SELECT * FROM reward_seasons WHERE seasonId = ? LIMIT 1', [seasonId]);
    if (!seasons[0]) throw new ApplicationError('Reward season not found', 'REWARD_SEASON_NOT_FOUND', 404);
    const results = await AppDataSource.query(`
      SELECT rsr.*, u.userName, u.userLastName, u.userImageUrl, rb.badgeKey, rb.auraKey
      FROM reward_season_results rsr
      INNER JOIN users u ON u.userId = rsr.userId
      LEFT JOIN reward_badges rb ON rb.rankValue = rsr.rankValue
      WHERE rsr.seasonId = ? ORDER BY rsr.rankValue
    `, [seasonId]);
    return { season: seasons[0], results };
  }

  async closeSeason(seasonId: number) {
    const runner = AppDataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      const season = (await runner.query('SELECT * FROM reward_seasons WHERE seasonId = ? FOR UPDATE', [seasonId]))[0];
      if (!season) throw new ApplicationError('Reward season not found', 'REWARD_SEASON_NOT_FOUND', 404);
      const existing = await runner.query('SELECT COUNT(*) AS total FROM reward_season_results WHERE seasonId = ?', [seasonId]);
      if (season.status === 'closed' && Number(existing[0]?.total || 0) > 0) {
        await runner.commitTransaction();
        return this.getSeason(seasonId);
      }
      const leaderboard = await runner.query(`
        SELECT u.userId, COALESCE(SUM(t.completionScore),0) AS score, COUNT(t.taskId) AS completedTasks,
               SUM(CASE WHEN t.dueDate IS NOT NULL AND t.completedAt <= t.dueDate THEN 1 ELSE 0 END) AS onTimeTasks,
               SUM(CASE WHEN t.reopenedCount = 0 THEN 1 ELSE 0 END) AS firstPassTasks, MAX(t.completedAt) AS lastScoredAt
        FROM users u
        INNER JOIN tasks t ON t.assignedTo = u.userId AND t.status = 'done' AND t.completedAt >= ? AND t.completedAt < ?
        GROUP BY u.userId
        ORDER BY score DESC, onTimeTasks DESC, firstPassTasks DESC, lastScoredAt ASC, u.userId ASC
      `, [season.startsAt, season.endsAt]);
      for (let index = 0; index < leaderboard.length; index += 1) {
        const result = leaderboard[index];
        const rank = index + 1;
        await runner.query(`
          INSERT IGNORE INTO reward_season_results
            (seasonId,userId,rankValue,score,completedTasks,onTimeTasks,firstPassTasks,lastScoredAt,finalizedAt)
          VALUES (?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
        `, [seasonId, result.userId, rank, result.score, result.completedTasks, result.onTimeTasks, result.firstPassTasks, result.lastScoredAt]);
        if (rank <= 3) {
          await runner.query(`
            INSERT IGNORE INTO user_badges (userId,badgeId,seasonId,sourceId)
            SELECT ?, badgeId, ?, ? FROM reward_badges WHERE rankValue = ? LIMIT 1
          `, [result.userId, seasonId, `season:${seasonId}:rank:${rank}`, rank]);
          await outboxService.enqueue({ eventType: 'reward.season.achievement', aggregateType: 'reward_season', aggregateId: seasonId, payload: { userId: Number(result.userId), seasonId, rank }, idempotencyKey: `reward-season:${seasonId}:user:${result.userId}:achievement` }, runner.manager);
        }
      }
      await runner.query("UPDATE reward_seasons SET status = 'closed' WHERE seasonId = ?", [seasonId]);
      await runner.commitTransaction();
      return this.getSeason(seasonId);
    } catch (error) {
      await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
  }

  async getMissions(userId: number) {
    await this.ensureUserMissionProgress(userId);
    return AppDataSource.query(`
      SELECT mi.missionId, mi.periodKey, mi.startsAt, mi.endsAt, mi.rewardPoints,
             mt.templateKey, mt.category, mt.cadence, mt.scope, mt.titleKey, mt.descriptionKey,
             ump.progress, ump.target, ump.completedAt, ump.rewardClaimedAt
      FROM user_mission_progress ump
      INNER JOIN mission_instances mi ON mi.missionId = ump.missionId
      INNER JOIN mission_templates mt ON mt.templateId = mi.templateId
      WHERE ump.userId = ? AND mi.isActive = 1 AND NOW() < mi.endsAt
      ORDER BY mt.cadence, mt.scope, mi.missionId
    `, [userId]);
  }

  async getCatalog() {
    const [settings, items] = await Promise.all([
      AppDataSource.query('SELECT redemptionEnabled, requestExpiryHours FROM reward_settings WHERE singletonId = 1'),
      AppDataSource.query(`SELECT * FROM reward_catalog_items WHERE isActive = 1 AND (startsAt IS NULL OR startsAt <= NOW()) AND (endsAt IS NULL OR endsAt > NOW()) ORDER BY pointsCost, itemId`),
    ]);
    return { settings: settings[0], items };
  }

  async requestRedemption(userId: number, itemId: number, quantity: number, requestKey: string) {
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10 || !requestKey) {
      throw new ApplicationError('A valid quantity and request key are required', 'REDEMPTION_INVALID', 400);
    }
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const settings = (await queryRunner.query('SELECT * FROM reward_settings WHERE singletonId = 1 FOR UPDATE'))[0];
      if (!settings?.redemptionEnabled) throw new ApplicationError('Reward redemption is not open yet', 'REDEMPTION_DISABLED', 409);
      await queryRunner.query('INSERT IGNORE INTO reward_wallets (userId) VALUES (?)', [userId]);
      const wallet = (await queryRunner.query('SELECT * FROM reward_wallets WHERE userId = ? FOR UPDATE', [userId]))[0];
      const item = (await queryRunner.query(`SELECT * FROM reward_catalog_items WHERE itemId = ? AND isActive = 1 FOR UPDATE`, [itemId]))[0];
      if (!item) throw new ApplicationError('Reward item was not found', 'REWARD_ITEM_NOT_FOUND', 404);
      const totalCost = Number(item.pointsCost) * quantity;
      if (Number(wallet.availablePoints) < totalCost) throw new ApplicationError('Not enough available points', 'REWARD_POINTS_INSUFFICIENT', 409);
      if (Number(item.availableStock) < quantity) throw new ApplicationError('Reward is out of stock', 'REWARD_OUT_OF_STOCK', 409);
      if (item.perUserLimit) {
        const used = await queryRunner.query(`SELECT COALESCE(SUM(quantity),0) AS total FROM reward_redemptions WHERE userId = ? AND itemId = ? AND status IN ('pending','approved','fulfilled')`, [userId, itemId]);
        if (Number(used[0]?.total || 0) + quantity > Number(item.perUserLimit)) {
          throw new ApplicationError('Per-user reward limit reached', 'REWARD_LIMIT_REACHED', 409);
        }
      }
      const expiresAt = new Date(Date.now() + Number(settings.requestExpiryHours) * 3_600_000);
      const result = await queryRunner.query(`
        INSERT INTO reward_redemptions (userId, itemId, pointsCost, quantity, expiresAt, idempotencyKey)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [userId, itemId, totalCost, quantity, expiresAt, requestKey]);
      const redemptionId = Number(result.insertId);
      await queryRunner.query(`UPDATE reward_wallets SET availablePoints = availablePoints - ?, reservedPoints = reservedPoints + ? WHERE userId = ?`, [totalCost, totalCost, userId]);
      await queryRunner.query(`UPDATE reward_catalog_items SET availableStock = availableStock - ?, reservedStock = reservedStock + ? WHERE itemId = ?`, [quantity, quantity, itemId]);
      await queryRunner.query(`
        INSERT INTO reward_point_ledger (userId, entryType, amount, sourceType, sourceId, idempotencyKey)
        VALUES (?, 'reserve', ?, 'redemption', ?, ?)
      `, [userId, totalCost, String(redemptionId), `redemption:${redemptionId}:reserve`]);
      await queryRunner.commitTransaction();
      webSocketService.emitDomainEvent('reward:redemption-updated', { redemptionId, userId, status: 'pending', revision: new Date().toISOString() }, [userId]);
      const owner = await AppDataSource.query('SELECT userId FROM system_owner WHERE singletonId = 1');
      const ownerId = Number(owner[0]?.userId || 0);
      if (ownerId && ownerId !== userId) {
        await NotificationHelper.notifyRewardRedemption('Reward request received', 'A new reward request is waiting for your decision.', userId, [ownerId], redemptionId)
          .catch(error => console.error('reward_redemption_notification_failed', error instanceof Error ? error.message : error));
      }
      return { redemptionId, status: 'pending', expiresAt };
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      if (String(error?.code) === 'ER_DUP_ENTRY') {
        const existing = await AppDataSource.query('SELECT * FROM reward_redemptions WHERE idempotencyKey = ? LIMIT 1', [requestKey]);
        if (existing[0]) return existing[0];
      }
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async cancelRedemption(userId: number, redemptionId: number) {
    return this.releaseRedemption(redemptionId, 'cancelled', userId, null);
  }

  async decideRedemption(ownerUserId: number, redemptionId: number, decision: RedemptionDecision, reason?: string) {
    if (decision === 'fulfilled') {
      const result = await AppDataSource.query(`UPDATE reward_redemptions SET status = 'fulfilled', fulfilledAt = CURRENT_TIMESTAMP, decidedBy = ? WHERE redemptionId = ? AND status = 'approved'`, [ownerUserId, redemptionId]);
      if (!Number(result.affectedRows || 0)) throw new ApplicationError('Only an approved request can be fulfilled', 'REDEMPTION_STATE_INVALID', 409);
      const rows = await AppDataSource.query('SELECT userId FROM reward_redemptions WHERE redemptionId = ?', [redemptionId]);
      const recipientId = Number(rows[0]?.userId || 0);
      if (recipientId && recipientId !== ownerUserId) {
        await NotificationHelper.notifyRewardRedemption('Reward fulfilled', 'Your reward has been marked as fulfilled.', ownerUserId, [recipientId], redemptionId)
          .catch(error => console.error('reward_redemption_notification_failed', error instanceof Error ? error.message : error));
      }
      return { redemptionId, status: 'fulfilled' };
    }
    if (decision === 'rejected') return this.releaseRedemption(redemptionId, 'rejected', null, ownerUserId, reason);
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const redemption = (await queryRunner.query(`SELECT * FROM reward_redemptions WHERE redemptionId = ? FOR UPDATE`, [redemptionId]))[0];
      if (!redemption || redemption.status !== 'pending' || new Date(redemption.expiresAt) <= new Date()) throw new ApplicationError('Redemption is not pending or has expired', 'REDEMPTION_STATE_INVALID', 409);
      await queryRunner.query(`UPDATE reward_wallets SET reservedPoints = reservedPoints - ? WHERE userId = ?`, [redemption.pointsCost, redemption.userId]);
      await queryRunner.query(`UPDATE reward_catalog_items SET reservedStock = reservedStock - ?, redeemedStock = redeemedStock + ? WHERE itemId = ?`, [redemption.quantity, redemption.quantity, redemption.itemId]);
      await queryRunner.query(`UPDATE reward_redemptions SET status = 'approved', decidedBy = ?, decidedAt = CURRENT_TIMESTAMP, decisionReason = ? WHERE redemptionId = ?`, [ownerUserId, reason || null, redemptionId]);
      await queryRunner.query(`INSERT INTO reward_point_ledger (userId, entryType, amount, sourceType, sourceId, idempotencyKey) VALUES (?, 'redeem', ?, 'redemption', ?, ?)`, [redemption.userId, redemption.pointsCost, String(redemptionId), `redemption:${redemptionId}:redeem`]);
      await queryRunner.commitTransaction();
      webSocketService.emitDomainEvent('reward:redemption-updated', { redemptionId, userId: redemption.userId, status: 'approved', revision: new Date().toISOString() }, [redemption.userId, ownerUserId]);
      await NotificationHelper.notifyRewardRedemption('Reward request approved', 'Your reserved points have been redeemed. The reward is awaiting fulfillment.', ownerUserId, [Number(redemption.userId)], redemptionId)
        .catch(error => console.error('reward_redemption_notification_failed', error instanceof Error ? error.message : error));
      return { redemptionId, status: 'approved' };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async releaseRedemption(redemptionId: number, status: 'rejected' | 'cancelled' | 'expired', requestingUserId: number | null, deciderUserId: number | null, reason?: string) {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const redemption = (await queryRunner.query('SELECT * FROM reward_redemptions WHERE redemptionId = ? FOR UPDATE', [redemptionId]))[0];
      if (!redemption || redemption.status !== 'pending' || (requestingUserId && Number(redemption.userId) !== requestingUserId)) throw new ApplicationError('Pending redemption was not found', 'REDEMPTION_STATE_INVALID', 409);
      await queryRunner.query(`UPDATE reward_wallets SET availablePoints = availablePoints + ?, reservedPoints = reservedPoints - ? WHERE userId = ?`, [redemption.pointsCost, redemption.pointsCost, redemption.userId]);
      await queryRunner.query(`UPDATE reward_catalog_items SET availableStock = availableStock + ?, reservedStock = reservedStock - ? WHERE itemId = ?`, [redemption.quantity, redemption.quantity, redemption.itemId]);
      await queryRunner.query(`UPDATE reward_redemptions SET status = ?, decidedBy = ?, decidedAt = CURRENT_TIMESTAMP, decisionReason = ? WHERE redemptionId = ?`, [status, deciderUserId, reason || null, redemptionId]);
      await queryRunner.query(`INSERT IGNORE INTO reward_point_ledger (userId, entryType, amount, sourceType, sourceId, idempotencyKey) VALUES (?, 'release', ?, 'redemption', ?, ?)`, [redemption.userId, redemption.pointsCost, String(redemptionId), `redemption:${redemptionId}:${status}`]);
      await queryRunner.commitTransaction();
      webSocketService.emitDomainEvent('reward:redemption-updated', { redemptionId, userId: redemption.userId, status, revision: new Date().toISOString() }, [redemption.userId, ...(deciderUserId ? [deciderUserId] : [])]);
      if (deciderUserId && Number(redemption.userId) !== deciderUserId) {
        await NotificationHelper.notifyRewardRedemption('Reward request updated', `Your reward request was ${status}. Reserved points were returned.`, deciderUserId, [Number(redemption.userId)], redemptionId)
          .catch(error => console.error('reward_redemption_notification_failed', error instanceof Error ? error.message : error));
      }
      return { redemptionId, status };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async releaseExpiredRedemptions() {
    const expired = await AppDataSource.query(`SELECT redemptionId FROM reward_redemptions WHERE status = 'pending' AND expiresAt <= NOW() LIMIT 100`);
    for (const row of expired) await this.releaseRedemption(Number(row.redemptionId), 'expired', null, null).catch(() => undefined);
  }

  async updateSettings(ownerUserId: number, input: { redemptionEnabled?: boolean; requestExpiryHours?: number }) {
    const expiry = input.requestExpiryHours === undefined ? null : Number(input.requestExpiryHours);
    if (expiry !== null && (!Number.isInteger(expiry) || expiry < 1 || expiry > 720)) throw new ApplicationError('Expiry must be between 1 and 720 hours', 'REWARD_SETTINGS_INVALID', 400);
    await AppDataSource.query(`
      UPDATE reward_settings SET
        redemptionEnabled = COALESCE(?, redemptionEnabled),
        requestExpiryHours = COALESCE(?, requestExpiryHours), updatedBy = ?
      WHERE singletonId = 1
    `, [input.redemptionEnabled === undefined ? null : Number(input.redemptionEnabled), expiry, ownerUserId]);
    return (await AppDataSource.query('SELECT * FROM reward_settings WHERE singletonId = 1'))[0];
  }

  async listPendingRedemptions() {
    await this.releaseExpiredRedemptions();
    return AppDataSource.query(`
      SELECT rr.*, rci.name AS itemName, u.userName, u.userLastName, u.userImageUrl
      FROM reward_redemptions rr
      INNER JOIN reward_catalog_items rci ON rci.itemId = rr.itemId
      INNER JOIN users u ON u.userId = rr.userId
      ORDER BY FIELD(rr.status,'pending','approved','fulfilled','rejected','cancelled','expired'), rr.createdAt DESC
      LIMIT 200
    `);
  }

  async upsertCatalogItem(ownerUserId: number, itemId: number | null, input: any) {
    const name = String(input.name || '').trim().slice(0, 120);
    const pointsCost = Number(input.pointsCost);
    const availableStock = Number(input.availableStock);
    const perUserLimit = input.perUserLimit == null || input.perUserLimit === '' ? null : Number(input.perUserLimit);
    const startsAt = input.startsAt ? new Date(input.startsAt) : null;
    const endsAt = input.endsAt ? new Date(input.endsAt) : null;
    const invalidDates = (startsAt && Number.isNaN(startsAt.getTime()))
      || (endsAt && Number.isNaN(endsAt.getTime()))
      || (startsAt && endsAt && startsAt >= endsAt);
    if (!name || !Number.isInteger(pointsCost) || pointsCost <= 0
      || !Number.isInteger(availableStock) || availableStock < 0
      || (perUserLimit !== null && (!Number.isInteger(perUserLimit) || perUserLimit <= 0))
      || invalidDates) {
      throw new ApplicationError('Enter a name, valid points and stock, and an active period whose end is after its start', 'REWARD_ITEM_INVALID', 400);
    }
    if (itemId) {
      const result = await AppDataSource.query(`UPDATE reward_catalog_items SET name=?, description=?, imageUrl=?, pointsCost=?, availableStock=?, perUserLimit=?, startsAt=?, endsAt=?, isActive=?, updatedBy=? WHERE itemId=?`, [name, input.description || null, input.imageUrl || null, pointsCost, availableStock, perUserLimit, startsAt, endsAt, input.isActive !== false, ownerUserId, itemId]);
      if (!Number(result.affectedRows || 0)) throw new ApplicationError('Reward item was not found', 'REWARD_ITEM_NOT_FOUND', 404);
      return (await AppDataSource.query('SELECT * FROM reward_catalog_items WHERE itemId = ?', [itemId]))[0];
    }
    const result = await AppDataSource.query(`INSERT INTO reward_catalog_items (name, description, imageUrl, pointsCost, availableStock, perUserLimit, startsAt, endsAt, isActive, createdBy, updatedBy) VALUES (?,?,?,?,?,?,?,?,?,?,?)`, [name, input.description || null, input.imageUrl || null, pointsCost, availableStock, perUserLimit, startsAt, endsAt, input.isActive !== false, ownerUserId, ownerUserId]);
    return (await AppDataSource.query('SELECT * FROM reward_catalog_items WHERE itemId = ?', [result.insertId]))[0];
  }

  async deactivateCatalogItem(ownerUserId: number, itemId: number) {
    const pending = await AppDataSource.query("SELECT COUNT(*) AS total FROM reward_redemptions WHERE itemId = ? AND status IN ('pending','approved')", [itemId]);
    if (Number(pending[0]?.total || 0) > 0) throw new ApplicationError('Resolve pending redemptions before deactivating this item', 'REWARD_ITEM_HAS_PENDING_REQUESTS', 409);
    const result = await AppDataSource.query('UPDATE reward_catalog_items SET isActive = 0, updatedBy = ? WHERE itemId = ?', [ownerUserId, itemId]);
    if (!Number(result.affectedRows || 0)) throw new ApplicationError('Reward item was not found', 'REWARD_ITEM_NOT_FOUND', 404);
    return { itemId, isActive: false };
  }

  async listCatalogItemsAdmin() {
    return AppDataSource.query('SELECT * FROM reward_catalog_items ORDER BY isActive DESC, updatedAt DESC, itemId DESC');
  }

  async listMissionTemplates() {
    return AppDataSource.query(`
      SELECT templateId, templateKey, category, cadence, scope, titleKey, descriptionKey,
             defaultTarget, defaultRewardPoints, isActive, updatedAt
      FROM mission_templates
      ORDER BY cadence, scope, templateId
    `);
  }

  async updateMissionTemplate(ownerUserId: number, templateId: number, input: any) {
    const target = Number(input.defaultTarget);
    const reward = Number(input.defaultRewardPoints);
    if (!Number.isInteger(templateId) || templateId <= 0 || !Number.isInteger(target) || target < 2 || target > 100 || !Number.isInteger(reward) || reward < 1 || reward > 1000) {
      throw new ApplicationError('Mission target must be 2-100 and reward must be 1-1000 points', 'MISSION_TEMPLATE_INVALID', 400);
    }
    const result = await AppDataSource.query(`
      UPDATE mission_templates
      SET defaultTarget = ?, defaultRewardPoints = ?, isActive = ?, updatedBy = ?
      WHERE templateId = ?
    `, [target, reward, input.isActive === false ? 0 : 1, ownerUserId, templateId]);
    if (!Number(result.affectedRows || 0)) throw new ApplicationError('Mission template was not found', 'MISSION_TEMPLATE_NOT_FOUND', 404);
    return (await AppDataSource.query('SELECT * FROM mission_templates WHERE templateId = ?', [templateId]))[0];
  }
}

export const rewardService = new RewardService();
