import { describe, expect, it } from 'vitest';
import type { Task } from '../../api/task.api';
import type { Customer } from '../../types/customer.types';
import { getCustomerEngagementScore } from '../../utils/customerEngagement';
import { getEmbeddedLikeSummary } from '../../utils/taskLikeSummary';

describe('page extraction helpers', () => {
  it('keeps the customer engagement scoring contract', () => {
    const customer = {
      customerFacebook: 'facebook',
      customerInstagram: 'instagram',
      customerTikTok: 'tiktok',
      customerLine: 'line',
      customerX: 'x',
    } as Customer;

    expect(getCustomerEngagementScore(customer)).toBe(100);
    expect(getCustomerEngagementScore({} as Customer)).toBe(0);
  });

  it('keeps embedded reaction totals and the current reaction', () => {
    const task = {
      _count: { likes: 2, love: 1, laugh: 0, angry: 0, wow: 3, sad: 1, userLike: 'wow' },
    } as unknown as Task;

    expect(getEmbeddedLikeSummary(task)).toEqual({
      like: 2,
      love: 1,
      laugh: 0,
      angry: 0,
      wow: 3,
      sad: 1,
      userLike: 'wow',
      total: 7,
    });
    expect(getEmbeddedLikeSummary({} as Task)).toBeUndefined();
  });
});
