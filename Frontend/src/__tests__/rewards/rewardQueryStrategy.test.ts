import { describe, expect, it } from 'vitest';
import { rewardQueryStrategy } from '../../utils/rewardQueryStrategy';

describe('reward query strategy', () => {
  it('loads only summary-backed mission data on the initial tab', () => {
    expect(rewardQueryStrategy(0, true)).toEqual({
      summary: true, catalog: false, seasons: false, achievements: false, administration: false,
    });
  });

  it('loads each expensive resource only for its owning tab', () => {
    expect(rewardQueryStrategy(1, false).catalog).toBe(true);
    expect(rewardQueryStrategy(2, false).seasons).toBe(true);
    expect(rewardQueryStrategy(3, false).achievements).toBe(true);
    expect(rewardQueryStrategy(4, true).administration).toBe(true);
  });

  it('does not load administration resources without backend capability', () => {
    expect(rewardQueryStrategy(4, false)).toMatchObject({ catalog: false, administration: false });
  });
});
