import { resolveAnalyticsDateRange } from '../../services/analytics.service';

describe('resolveAnalyticsDateRange', () => {
  const now = new Date('2026-08-10T12:00:00+07:00');

  it('creates an inclusive 30-day Bangkok range by default', () => {
    const range = resolveAnalyticsDateRange(undefined, undefined, now);
    expect(range.startDate).toBe('2026-07-12');
    expect(range.endDate).toBe('2026-08-10');
    expect(range.rangeDays).toBe(30);
    expect(range.end.toISOString()).toBe('2026-08-10T17:00:00.000Z');
  });

  it('rejects reversed, future and overly long ranges', () => {
    expect(() => resolveAnalyticsDateRange('2026-08-10', '2026-08-01', now)).toThrow('Start date');
    expect(() => resolveAnalyticsDateRange('2026-08-01', '2026-08-11', now)).toThrow('future');
    expect(() => resolveAnalyticsDateRange('2025-01-01', '2026-08-10', now)).toThrow('366');
  });
});
