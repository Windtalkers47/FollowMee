import { messages } from '../../i18n/messages';
import { translateRewardKey } from '../../utils/rewardPresentation';

const translate = (key: keyof typeof messages.en) => messages.en[key] || key;

describe('reward presentation', () => {
  it('resolves every season podium badge without leaking backend keys', () => {
    for (const key of ['rewards.badge.champion', 'rewards.badge.runnerUp', 'rewards.badge.thirdPlace'] as const) {
      expect(translateRewardKey(translate, key)).not.toBe(key);
    }
  });

  it('humanizes an unknown reward key as a safe fallback', () => {
    expect(translateRewardKey(translate, 'rewards.badge.futureWinner')).toBe('Future Winner');
  });
});
