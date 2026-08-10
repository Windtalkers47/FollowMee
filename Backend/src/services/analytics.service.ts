import AppDataSource from '../config/database';
import { ApplicationError } from '../errors/application.error';
import { UserService } from './user.service';

export const resolveAnalyticsDateRange = (startDate?: string, endDate?: string, now = new Date()) => {
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  const todayParts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const today = `${todayParts.find(part => part.type === 'year')?.value}-${todayParts.find(part => part.type === 'month')?.value}-${todayParts.find(part => part.type === 'day')?.value}`;
  const resolvedEnd = endDate || today;
  const fallbackStart = new Date(`${resolvedEnd}T00:00:00+07:00`); fallbackStart.setDate(fallbackStart.getDate() - 29);
  const resolvedStart = startDate || `${fallbackStart.getFullYear()}-${String(fallbackStart.getMonth() + 1).padStart(2, '0')}-${String(fallbackStart.getDate()).padStart(2, '0')}`;
  if (!datePattern.test(resolvedStart) || !datePattern.test(resolvedEnd)) throw new ApplicationError('A valid date range is required', 'ANALYTICS_DATE_INVALID', 400);
  const start = new Date(`${resolvedStart}T00:00:00+07:00`);
  const endInclusive = new Date(`${resolvedEnd}T00:00:00+07:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(endInclusive.getTime()) || start > endInclusive) throw new ApplicationError('Start date must be before end date', 'ANALYTICS_DATE_ORDER_INVALID', 400);
  if (resolvedEnd > today) throw new ApplicationError('End date cannot be in the future', 'ANALYTICS_FUTURE_DATE', 400);
  const rangeDays = Math.floor((endInclusive.getTime() - start.getTime()) / 86400000) + 1;
  if (rangeDays > 366) throw new ApplicationError('Date range cannot exceed 366 days', 'ANALYTICS_RANGE_TOO_LONG', 400);
  const end = new Date(endInclusive); end.setDate(end.getDate() + 1);
  return { start, end, startDate: resolvedStart, endDate: resolvedEnd, rangeDays };
};

export class AnalyticsService {
  async overview(userId: number, roles: string[], scope: 'personal' | 'organization', startDate?: string, endDate?: string) {
    if (scope === 'organization') {
      const user = await new UserService().getUserWithRoles(userId);
      if (!roles.includes('Owner') && !user.permissions.includes('VIEW_ORGANIZATION_ANALYTICS')) {
        throw new ApplicationError('Organization analytics permission is required', 'ORGANIZATION_ANALYTICS_FORBIDDEN', 403);
      }
    }
    const { start, end } = resolveAnalyticsDateRange(startDate, endDate);
    const personal = scope === 'personal';
    const [work, customers, profiles] = await Promise.all([
      AppDataSource.query(`SELECT COUNT(*) AS total, SUM(t.status = 'done') AS completed,
        SUM(t.status = 'done' AND t.dueDate IS NOT NULL AND t.completedAt <= t.dueDate) AS onTime,
        SUM(t.status = 'done' AND t.reopenedCount = 0) AS firstPass, SUM(t.blockedAt IS NOT NULL) AS blocked,
        ROUND(AVG(CASE WHEN t.completedAt IS NOT NULL THEN TIMESTAMPDIFF(HOUR,t.createdAt,t.completedAt) END),1) AS cycleHours
        FROM tasks t WHERE t.createdAt >= ? AND t.createdAt < ?${personal ? ' AND t.assignedTo = ?' : ''}`, personal ? [start, end, userId] : [start, end]),
      AppDataSource.query(`SELECT COUNT(*) AS total, SUM(c.status = 'active') AS active,
        SUM(c.customerImageUrl IS NULL OR c.customerImageUrl = '') AS missingImage,
        SUM(p.profileId IS NOT NULL AND p.status = 'published') AS profilesReady
        FROM customers c LEFT JOIN public_profiles p ON p.customerId = c.customerId AND p.deletedAt IS NULL
        WHERE c.createdAt >= ? AND c.createdAt < ?${personal ? ' AND (c.assignedTo = ? OR c.createdBy = ?)' : ''}`, personal ? [start, end, userId, userId] : [start, end]),
      AppDataSource.query(`SELECT COUNT(DISTINCT p.profileId) AS total, SUM(e.eventType = 'view') AS views,
        SUM(e.eventType IN ('link_click','cta_click')) AS clicks, SUM(e.eventType = 'share') AS shares
        FROM public_profiles p LEFT JOIN public_profile_events e ON e.profileId = p.profileId AND e.occurredAt >= ? AND e.occurredAt < ?
        WHERE p.deletedAt IS NULL${personal ? ' AND (p.userId = ? OR p.createdBy = ?)' : ''}`, personal ? [start, end, userId, userId] : [start, end]),
    ]);
    const profile = profiles[0] || {};
    return { range: { start, end, scope }, work: work[0] || {}, customers: customers[0] || {}, profiles: { ...profile, conversion: Number(profile.views || 0) ? Number(((Number(profile.clicks || 0) / Number(profile.views)) * 100).toFixed(1)) : 0 } };
  }
}
export const analyticsService = new AnalyticsService();
