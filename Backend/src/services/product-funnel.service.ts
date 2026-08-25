import crypto from 'crypto';
import AppDataSource from '../config/database';
import { ProductFunnelEvent } from '../entities/ProductFunnelEvent';
import { ApplicationError } from '../errors/application.error';
const allowed = ['landing_view','demo_open','registration_started','registration_submitted','registration_verified','registration_approved','draft_created','published','shared'] as const;
export type ProductFunnelEventType = typeof allowed[number];
const stages: ProductFunnelEventType[] = ['landing_view','demo_open','registration_submitted','draft_created','published','shared'];
class ProductFunnelService {
  private repo = AppDataSource.getRepository(ProductFunnelEvent);
  hashSession(sessionId: string) { return crypto.createHmac('sha256', process.env.PROFILE_ANALYTICS_SALT || 'followmee-development-salt').update(sessionId).digest('hex'); }
  async record(eventType: string, sessionId: string, userId: number | null = null, metadata?: Record<string, unknown>) {
    if (!allowed.includes(eventType as ProductFunnelEventType)) throw new ApplicationError('Invalid funnel event', 'FUNNEL_EVENT_INVALID', 400);
    if (!sessionId || sessionId.length > 128) throw new ApplicationError('Session ID is required', 'FUNNEL_SESSION_INVALID', 400);
    await this.recordHashed(eventType, this.hashSession(sessionId), userId, metadata);
  }
  async recordHashed(eventType: string, sessionHash: string, userId: number | null = null, metadata?: Record<string, unknown>) { if (!allowed.includes(eventType as ProductFunnelEventType)) throw new ApplicationError('Invalid funnel event', 'FUNNEL_EVENT_INVALID', 400); await this.repo.save({ eventType, sessionHash, userId, metadata: metadata || null }); }
  async report(from?: string, to?: string) {
    const end = to ? new Date(`${to}T23:59:59.999Z`) : new Date(); const start = from ? new Date(`${from}T00:00:00.000Z`) : new Date(end.getTime() - 29 * 86400000);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start > end) throw new ApplicationError('Invalid analytics range', 'ANALYTICS_RANGE_INVALID', 400);
    const rows = await this.repo.createQueryBuilder('event').where('event.occurredAt BETWEEN :start AND :end', { start, end }).orderBy('event.occurredAt','ASC').take(100000).getMany();
    const unique = new Map<string, Set<string>>(); rows.forEach(row => { if (!unique.has(row.eventType)) unique.set(row.eventType, new Set()); unique.get(row.eventType)!.add(row.sessionHash); });
    const funnel = stages.map((stage, index) => { const count = unique.get(stage)?.size || 0; const previous = index ? unique.get(stages[index - 1])?.size || 0 : count; return { stage, count, conversionFromPrevious: previous ? count / previous : 0, dropOff: Math.max(0, previous - count) }; });
    const sessions = new Map<string, ProductFunnelEvent[]>(); rows.forEach(row => { const list = sessions.get(row.sessionHash) || []; list.push(row); sessions.set(row.sessionHash, list); });
    const durations: Record<string, number[]> = {}; sessions.forEach(events => { stages.slice(1).forEach((stage, index) => { const before = events.find(event => event.eventType === stages[index]); const after = events.find(event => event.eventType === stage && (!before || event.occurredAt >= before.occurredAt)); if (before && after) (durations[stage] ||= []).push((after.occurredAt.getTime() - before.occurredAt.getTime()) / 1000); }); });
    return { range: { from: start.toISOString(), to: end.toISOString() }, funnel, averageSecondsToStage: Object.fromEntries(Object.entries(durations).map(([stage, values]) => [stage, Math.round(values.reduce((a,b) => a + b, 0) / values.length)])), failures: rows.filter(row => row.metadata?.reason).slice(-20).map(row => ({ stage: row.eventType, reason: row.metadata?.reason })) };
  }
}
export const productFunnelService = new ProductFunnelService();
