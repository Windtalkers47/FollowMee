import { useQuery } from '@tanstack/react-query';
import { rewardApi } from '../api/reward.api';
import { rewardQueryStrategy, type RewardTab } from '../utils/rewardQueryStrategy';

export const useRewardsQueries = (tab: RewardTab) => {
  const summaryQuery = useQuery({ queryKey: ['rewards', 'summary'], queryFn: rewardApi.summary, staleTime: 20_000 });
  const canManageRewards = Boolean(summaryQuery.data?.capabilities.canManageRewards);
  const strategy = rewardQueryStrategy(tab, canManageRewards);
  const achievementsQuery = useQuery({ queryKey: ['rewards', 'achievements'], queryFn: rewardApi.achievements, enabled: strategy.achievements, staleTime: 20_000 });
  const seasonsQuery = useQuery({ queryKey: ['rewards', 'seasons'], queryFn: rewardApi.seasons, enabled: strategy.seasons, staleTime: 20_000 });
  const catalogQuery = useQuery({ queryKey: ['rewards', 'catalog'], queryFn: rewardApi.catalog, enabled: strategy.catalog, staleTime: 20_000 });
  const adminQuery = useQuery({ queryKey: ['rewards', 'admin-redemptions'], queryFn: rewardApi.adminRedemptions, enabled: strategy.administration });
  const templateQuery = useQuery({ queryKey: ['rewards', 'mission-templates'], queryFn: rewardApi.missionTemplates, enabled: strategy.administration });
  const adminCatalogQuery = useQuery({ queryKey: ['rewards', 'admin-catalog'], queryFn: rewardApi.adminCatalog, enabled: strategy.administration });
  return { summaryQuery, canManageRewards, achievementsQuery, seasonsQuery, catalogQuery, adminQuery, templateQuery, adminCatalogQuery };
};
