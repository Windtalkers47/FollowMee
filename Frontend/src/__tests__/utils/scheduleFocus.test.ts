import { describe, expect, it } from 'vitest';
import { resolveScheduleFocus } from '../../utils/scheduleFocus';

describe('resolveScheduleFocus', () => {
  it('keeps controls and API parameters aligned during overdue focus', () => {
    expect(resolveScheduleFocus(0, 'all', 'overdue')).toEqual({
      effectiveDateFilter: 'overdue',
      effectiveStatus: 'all',
      displayedTab: 0,
      query: { status: undefined, dueFilter: 'overdue' },
    });
  });

  it('omits stale overdue parameters after All tasks takes over', () => {
    expect(resolveScheduleFocus(0, 'all', null).query).toEqual({
      status: undefined,
      dueFilter: undefined,
    });
  });

  it('shows the Review tab for review and approval focus', () => {
    expect(resolveScheduleFocus(0, 'all', 'review').displayedTab).toBe(4);
    expect(resolveScheduleFocus(0, 'all', 'approval').query.status).toBe('review');
  });

  it('keeps backward-compatible week focus aligned with the due-date control', () => {
    expect(resolveScheduleFocus(0, 'all', 'week').effectiveDateFilter).toBe('week');
  });
});
