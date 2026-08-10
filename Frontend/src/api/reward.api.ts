import api from '../services/api';

export interface RewardWallet { availablePoints: number; reservedPoints: number; lifetimeEarned: number }
export interface RewardMission {
  missionId: number; templateKey: string; cadence: 'weekly' | 'monthly'; scope: 'shared' | 'personal';
  titleKey: string; descriptionKey: string; progress: number; target: number; rewardPoints: number; endsAt: string;
  completedAt?: string | null;
}
export interface RewardCatalogItem {
  itemId: number; name: string; description?: string; imageUrl?: string; pointsCost: number;
  availableStock: number; reservedStock: number; redeemedStock: number; perUserLimit?: number; isActive: boolean;
  startsAt?: string | null; endsAt?: string | null;
}
export interface RewardRedemption {
  redemptionId: number; itemId: number; itemName: string; userId: number; userName?: string; userLastName?: string;
  pointsCost: number; quantity: number; status: string; createdAt: string; expiresAt: string;
}
export interface RewardMissionTemplate {
  templateId: number; templateKey: string; category: string; cadence: 'weekly' | 'monthly'; scope: 'shared' | 'personal';
  titleKey: string; descriptionKey: string; defaultTarget: number; defaultRewardPoints: number; isActive: boolean;
}
export interface RewardSummary {
  season: { seasonId: number; seasonKey: string; name: string; startsAt: string; endsAt: string };
  wallet: RewardWallet; seasonScore: number; completedTasks: number; myRank: number | null;
  leaderboard: Array<{ userId: number; userName: string; userLastName: string; userImageUrl?: string; score: number; completedTasks: number }>;
  missions: RewardMission[];
  badges: Array<{ badgeKey: string; nameKey: string; descriptionKey: string; icon: string; auraKey?: string; rankValue?: number; seasonId?: number; awardedAt: string }>;
  latestAchievement?: { badgeKey: string; nameKey: string; auraKey?: string; awardedAt: string } | null;
  seasonPodium?: RewardSummary['leaderboard'];
  availableAuras?: string[];
  redemptions: RewardRedemption[];
}

const unwrap = <T>(response: { data: { data: T } }) => response.data.data;

export const rewardApi = {
  summary: async () => unwrap<RewardSummary>(await api.get('/rewards/summary')),
  seasons: async () => unwrap<Array<{ seasonId: number; seasonKey: string; name: string; startsAt: string; endsAt: string; status: string; participantCount: number }>>(await api.get('/rewards/seasons')),
  season: async (id: number) => unwrap<{ season: RewardSummary['season'] & { status: string }; results: Array<{ userId: number; rankValue: number; score: number; userName: string; userLastName: string; userImageUrl?: string; badgeKey?: string; auraKey?: string }> }>(await api.get(`/rewards/seasons/${id}`)),
  closeSeason: async (id: number) => unwrap(await api.post(`/admin/rewards/seasons/${id}/close`)),
  catalog: async () => unwrap<{ settings: { redemptionEnabled: boolean; requestExpiryHours: number }; items: RewardCatalogItem[] }>(await api.get('/rewards/catalog')),
  redeem: async (itemId: number, quantity = 1) => unwrap(await api.post('/rewards/redemptions', { itemId, quantity, requestKey: crypto.randomUUID() })),
  cancel: async (id: number) => unwrap(await api.post(`/rewards/redemptions/${id}/cancel`)),
  adminRedemptions: async () => unwrap<RewardRedemption[]>(await api.get('/admin/rewards/redemptions')),
  updateSettings: async (input: { redemptionEnabled?: boolean; requestExpiryHours?: number }) => unwrap(await api.put('/admin/rewards/settings', input)),
  approve: async (id: number) => unwrap(await api.post(`/admin/rewards/redemptions/${id}/approve`)),
  reject: async (id: number, reason?: string) => unwrap(await api.post(`/admin/rewards/redemptions/${id}/reject`, { reason })),
  fulfill: async (id: number) => unwrap(await api.post(`/admin/rewards/redemptions/${id}/fulfill`)),
  adminCatalog: async () => unwrap<RewardCatalogItem[]>(await api.get('/admin/rewards/catalog')),
  createItem: async (input: Partial<RewardCatalogItem>) => unwrap<RewardCatalogItem>(await api.post('/admin/rewards/catalog', input)),
  updateItem: async (id: number, input: Partial<RewardCatalogItem>) => unwrap<RewardCatalogItem>(await api.put(`/admin/rewards/catalog/${id}`, input)),
  deactivateItem: async (id: number) => unwrap(await api.delete(`/admin/rewards/catalog/${id}`)),
  missionTemplates: async () => unwrap<RewardMissionTemplate[]>(await api.get('/admin/rewards/missions')),
  updateMissionTemplate: async (id: number, input: Pick<RewardMissionTemplate, 'defaultTarget' | 'defaultRewardPoints' | 'isActive'>) =>
    unwrap<RewardMissionTemplate>(await api.put(`/admin/rewards/missions/${id}`, input)),
};
