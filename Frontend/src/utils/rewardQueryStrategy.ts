export type RewardTab = 0 | 1 | 2 | 3 | 4;

export const rewardQueryStrategy = (tab: RewardTab, canManageRewards: boolean) => ({
  summary: true,
  catalog: tab === 1 || (tab === 4 && canManageRewards),
  seasons: tab === 2,
  achievements: tab === 3,
  administration: tab === 4 && canManageRewards,
});
