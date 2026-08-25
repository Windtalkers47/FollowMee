/* Dynamic server-owned translation keys are narrowed at runtime by the presentation fallback. */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Alert, Avatar, Box, Button, Card, CardContent, Chip, Dialog, DialogActions,
  DialogContent, DialogTitle, Grid, LinearProgress, Stack, Switch, Tab, Tabs, TextField, Typography,
} from '@mui/material';
import { EmojiEvents, Settings, WorkspacePremium } from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { rewardApi, RewardCatalogItem, RewardMissionTemplate } from '../../api/reward.api';
import { useAppSelector } from '../../store/store';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import feedback from '../../services/feedback.service';
import { translateRewardKey } from '../../utils/rewardPresentation';
import AchievementCollection from '../../components/AchievementCollection';
import type { RewardTab } from '../../utils/rewardQueryStrategy';
import { useRewardsQueries } from '../../hooks/useRewardsQueries';
import { PageError, PageHeader, PageLoading, PageShell } from '../../components/PageState';

const surface = { borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none' };

export default function RewardsPage() {
  const { t, locale } = useUserPreferences();
  const user = useAppSelector(state => state.auth.user);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams,setSearchParams]=useSearchParams();
  const tabNames=['missions','redeem','leaderboard','achievements','manage'] as const;
  const tab=Math.max(0,tabNames.indexOf(searchParams.get('tab') as typeof tabNames[number])) as RewardTab;
  const setTab=(value:number)=>setSearchParams(current=>{const next=new URLSearchParams(current);next.set('tab',tabNames[value]);return next;},{replace:true});
  const [catalogOpen, setCatalogOpen] = useState(false);
  const emptyItem = { name: '', description: '', imageUrl: '', pointsCost: 40, availableStock: 10, perUserLimit: 1, startsAt: '', endsAt: '', isActive: true };
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [itemForm, setItemForm] = useState(emptyItem);
  const number = useMemo(() => new Intl.NumberFormat(locale === 'th' ? 'th-TH-u-nu-latn' : 'en-US'), [locale]);

  const { summaryQuery, canManageRewards, achievementsQuery, seasonsQuery, catalogQuery, adminQuery, templateQuery, adminCatalogQuery } = useRewardsQueries(tab);
  const refreshKeys = (...keys: ReadonlyArray<ReadonlyArray<unknown>>) => Promise.all(
    keys.map(queryKey => queryClient.invalidateQueries({ queryKey })),
  );
  const refreshSummary = () => refreshKeys(['rewards', 'summary'], ['dashboard', 'achievement']);
  const redeemMutation = useMutation({
    mutationFn: (item: RewardCatalogItem) => rewardApi.redeem(item.itemId),
    onSuccess: async () => { await refreshKeys(['rewards', 'summary'], ['rewards', 'catalog'], ['rewards', 'admin-redemptions'], ['dashboard', 'achievement']); await feedback.success({ title: t('rewards.requested'), message: t('rewards.requestedMessage'), importance: 'milestone' }); },
    onError: async () => feedback.error({ title: t('rewards.requestFailed'), message: t('common.tryAgain') }),
  });
  const settingMutation = useMutation({ mutationFn: rewardApi.updateSettings, onSuccess: refreshSummary });
  const decisionMutation = useMutation({
    mutationFn: ({ id, action }: { id: number; action: 'approve' | 'reject' | 'fulfill' }) => action === 'approve' ? rewardApi.approve(id) : action === 'reject' ? rewardApi.reject(id) : rewardApi.fulfill(id),
    onSuccess: () => refreshKeys(['rewards', 'summary'], ['rewards', 'catalog'], ['rewards', 'admin-redemptions'], ['dashboard', 'achievement']),
  });
  const createMutation = useMutation({
    mutationFn: () => editingItemId ? rewardApi.updateItem(editingItemId, itemForm) : rewardApi.createItem(itemForm),
    onSuccess: async () => { setCatalogOpen(false); setEditingItemId(null); setItemForm(emptyItem); await refreshKeys(['rewards', 'catalog'], ['rewards', 'admin-catalog']); },
  });
  const deactivateMutation = useMutation({ mutationFn: rewardApi.deactivateItem, onSuccess: () => refreshKeys(['rewards', 'catalog'], ['rewards', 'admin-catalog']) });
  const deactivateItem = async (item: RewardCatalogItem) => {
    const result = await feedback.confirm({
      title: t('rewards.deactivateTitle'),
      message: t('rewards.deactivateMessage', { name: item.name }),
      consequence: t('rewards.deactivateConsequence'),
      confirmLabel: t('rewards.deactivate'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (result.isConfirmed) deactivateMutation.mutate(item.itemId);
  };
  const editItem = (item: RewardCatalogItem) => {
    setEditingItemId(item.itemId);
    setItemForm({ name: item.name, description: item.description || '', imageUrl: item.imageUrl || '', pointsCost: item.pointsCost, availableStock: item.availableStock, perUserLimit: item.perUserLimit || 1, startsAt: item.startsAt?.slice(0, 16) || '', endsAt: item.endsAt?.slice(0, 16) || '', isActive: Boolean(item.isActive) });
    setCatalogOpen(true);
  };
  const templateMutation = useMutation({
    mutationFn: (template: RewardMissionTemplate) => rewardApi.updateMissionTemplate(template.templateId, template),
    onSuccess: () => refreshKeys(['rewards', 'mission-templates']),
  });
  const closeSeasonMutation = useMutation({ mutationFn: rewardApi.closeSeason, onSuccess: () => refreshKeys(['rewards', 'summary'], ['rewards', 'seasons'], ['rewards', 'achievements'], ['dashboard', 'achievement']) });

  if (summaryQuery.isLoading) return <PageShell maxWidth={1440}><PageLoading label={t('feedback.loadingPage')} /></PageShell>;
  if (!summaryQuery.data) return <PageShell maxWidth={1440}><PageError title={t('common.loadFailed')} message={t('feedback.networkHelp')} retryLabel={t('feedback.retry')} onRetry={() => void summaryQuery.refetch()} /></PageShell>;
  const tabLoading = (tab === 1 && catalogQuery.isLoading)
    || (tab === 2 && seasonsQuery.isLoading)
    || (tab === 3 && achievementsQuery.isLoading)
    || (tab === 4 && canManageRewards && [catalogQuery, adminQuery, templateQuery, adminCatalogQuery].some(query => query.isLoading));
  if (tabLoading) return <PageShell maxWidth={1440}><PageLoading label={t('feedback.loadingPage')} /></PageShell>;
  const tabError = tab === 1 ? catalogQuery.isError
    : tab === 2 ? seasonsQuery.isError
      : tab === 3 ? achievementsQuery.isError
        : tab === 4 && canManageRewards ? [catalogQuery, adminQuery, templateQuery, adminCatalogQuery].some(query => query.isError)
          : false;
  if (tabError) return <PageShell maxWidth={1440}><PageError title={t('common.loadFailed')} message={t('feedback.networkHelp')} retryLabel={t('feedback.retry')} onRetry={() => {
    if (tab === 1) void catalogQuery.refetch();
    if (tab === 2) void seasonsQuery.refetch();
    if (tab === 3) void achievementsQuery.refetch();
    if (tab === 4) void Promise.all([catalogQuery.refetch(), adminQuery.refetch(), templateQuery.refetch(), adminCatalogQuery.refetch()]);
  }} /></PageShell>;
  const { wallet, missions, badges, leaderboard, redemptions, seasonScore, myRank, season } = summaryQuery.data;
  const nextMission=[...missions].filter(item=>!item.completedAt).sort((a,b)=>(b.progress/b.target)-(a.progress/a.target))[0];
  const catalog = catalogQuery.data!;

  return <PageShell maxWidth={1440} sx={tab === 0 && missions.length === 0 ? { '& > .MuiGrid-root': { display: 'none' } } : undefined}>
    <PageHeader eyebrow={t('rewards.community')} title={t('rewards.title')} subtitle={t('rewards.subtitle')} actions={<><Chip icon={<EmojiEvents/>} label={t('rewards.season',{season:season.seasonKey})} sx={{height:44,px:1,borderRadius:2}}/>{canManageRewards&&<Button startIcon={<Settings/>} variant="outlined" onClick={()=>setTab(4)} sx={{height:44,borderRadius:2}}>{t('rewards.manage')}</Button>}</>} />
    <Card variant="outlined" sx={{borderRadius:3,boxShadow:'none',mb:2}}><CardContent sx={{py:2}}><Stack direction={{xs:'column',sm:'row'}} gap={{xs:1.5,sm:3}} alignItems={{sm:'center'}}><Box flex={1}><Typography variant="overline" color="primary.main">{t('rewards.nextMission')}</Typography><Typography variant="h5" fontWeight={850}>{nextMission?translateRewardKey(t,nextMission.titleKey):t('rewards.noMissionsTitle')}</Typography><Typography color="text.secondary">{nextMission?translateRewardKey(t,nextMission.descriptionKey):t('rewards.noMissionsGuide')}</Typography>{nextMission&&<><LinearProgress variant="determinate" value={Math.min(100,nextMission.progress/nextMission.target*100)} sx={{mt:1.5,height:7,borderRadius:4}}/><Typography variant="caption">{number.format(nextMission.progress)} / {number.format(nextMission.target)} · +{number.format(nextMission.rewardPoints)} {t('rewards.points')}</Typography></>}</Box><Stack direction="row" gap={2} flexWrap="wrap"><Box><Typography variant="caption" color="text.secondary">{t('rewards.availablePoints')}</Typography><Typography variant="h5" fontWeight={850}>{number.format(wallet.availablePoints)}</Typography></Box><Box><Typography variant="caption" color="text.secondary">{t('rewards.currentRank')}</Typography><Typography variant="h5" fontWeight={850}>{myRank?`#${myRank}`:'—'}</Typography></Box><Box><Typography variant="caption" color="text.secondary">{t('rewards.seasonScore')}</Typography><Typography variant="h5" fontWeight={850}>{number.format(seasonScore)}</Typography></Box></Stack></Stack></CardContent></Card>
    <Tabs value={canManageRewards ? tab : tab < 4 ? tab : false} onChange={(_, value) => setTab(value)} variant="scrollable" sx={{ mb: 3 }}>
      <Tab label={t('rewards.earn')} /><Tab label={t('rewards.redeemTab')} /><Tab label={t('rewards.leaderboard')} /><Tab label={t('achievement.title')} />{canManageRewards && <Tab label={t('rewards.manage')} />}
    </Tabs>

    {tab === 0 && <Grid container spacing={2}>{missions.length ? missions.filter(mission => mission.missionId !== nextMission?.missionId).map(mission => <Grid key={mission.missionId} size={{ xs: 12, md: 6 }}><Card sx={surface}><CardContent><Stack direction="row" justifyContent="space-between" gap={1}><Box><Chip size="small" label={mission.cadence === 'weekly' ? t('rewards.weekly') : t('rewards.monthly')} /><Typography variant="h6" mt={1}>{translateRewardKey(t, mission.titleKey)}</Typography><Typography color="text.secondary">{translateRewardKey(t, mission.descriptionKey)}</Typography></Box><Chip color="primary" label={`+${mission.rewardPoints}`} /></Stack><LinearProgress variant="determinate" value={Math.min(100, mission.progress / mission.target * 100)} sx={{ mt: 3, height: 9, borderRadius: 9 }} /><Typography mt={1} variant="body2">{number.format(mission.progress)} / {number.format(mission.target)}</Typography></CardContent></Card></Grid>) : <Grid size={12}><Card variant="outlined" sx={{ borderRadius: 4 }}><CardContent sx={{ py: 5, textAlign: 'center' }}><Typography variant="h5" fontWeight={800}>{t('rewards.noMissionsTitle')}</Typography><Typography color="text.secondary" sx={{ maxWidth: 620, mx: 'auto', mt: 1, mb: 3 }}>{t('rewards.noMissionsGuide')}</Typography><Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="center" gap={1}><Button variant="contained" onClick={() => navigate('/my-work')}>{t('rewards.openMyWork')}</Button>{canManageRewards && <Button variant="outlined" onClick={() => setTab(4)}>{t('rewards.manage')}</Button>}</Stack></CardContent></Card></Grid>}</Grid>}

    {tab === 1 && <><Alert severity={catalog.settings.redemptionEnabled ? 'success' : 'info'} sx={{ mb: 2 }}>{catalog.settings.redemptionEnabled ? t('rewards.redemptionOpen') : t('rewards.redemptionClosed')}</Alert><Grid container spacing={2}>{catalog.items.map(item => <Grid key={item.itemId} size={{ xs: 12, sm: 6, lg: 4 }}><Card sx={{ ...surface, height: '100%' }}><CardContent>{item.imageUrl && <Box component="img" src={item.imageUrl} alt="" loading="lazy" sx={{ width: '100%', height: 150, objectFit: 'cover', borderRadius: 3, mb: 2 }} />}<Typography variant="h6">{item.name}</Typography><Typography color="text.secondary" minHeight={48}>{item.description}</Typography><Stack direction="row" gap={1} my={2}><Chip label={t('rewards.pointsCost', { count: number.format(item.pointsCost) })} /><Chip label={t('rewards.stock', { count: number.format(item.availableStock) })} /></Stack><Button fullWidth variant="contained" disabled={!catalog.settings.redemptionEnabled || item.availableStock < 1 || wallet.availablePoints < item.pointsCost || redeemMutation.isPending} onClick={() => redeemMutation.mutate(item)}>{t('rewards.redeem')}</Button>{canManageRewards && <Stack direction="row" mt={1}><Button fullWidth onClick={() => editItem(item)}>{t('common.edit')}</Button><Button fullWidth color="error" disabled={deactivateMutation.isPending} onClick={() => deactivateItem(item)}>{t('rewards.deactivate')}</Button></Stack>}</CardContent></Card></Grid>)}</Grid><Typography variant="h6" mt={4} mb={1}>{t('rewards.history')}</Typography><Stack gap={1}>{redemptions.map(request => <Card key={request.redemptionId} variant="outlined" sx={{ borderRadius: 3 }}><CardContent><Stack direction="row" justifyContent="space-between"><Box><Typography fontWeight={700}>{request.itemName}</Typography><Typography color="text.secondary">{number.format(request.pointsCost)} {t('rewards.points')}</Typography></Box><Chip label={t(`rewards.status.${request.status}` as any)} /></Stack></CardContent></Card>)}</Stack></>}

    {tab === 2 && <Stack gap={3}>
      <Box><Typography variant="h5" fontWeight={800} mb={2}>{t('feature.seasonPodium')}</Typography><Grid container spacing={2} alignItems="end">{[leaderboard[1], leaderboard[0], leaderboard[2]].map((entry, podiumIndex) => entry && <Grid key={entry.userId} size={{ xs: 12, sm: 4 }}><Card sx={{ ...surface, textAlign: 'center', pt: podiumIndex === 1 ? 4 : 2, background: podiumIndex === 1 ? 'linear-gradient(145deg, rgba(255,215,0,.18), background.paper)' : 'background.paper' }}><CardContent><Typography fontSize={32}>{podiumIndex === 1 ? '🥇' : podiumIndex === 0 ? '🥈' : '🥉'}</Typography><Avatar src={entry.userImageUrl} sx={{ width: 64, height: 64, mx: 'auto', my: 1 }}>{entry.userName?.[0]}</Avatar><Typography fontWeight={800}>{entry.userName} {entry.userLastName}</Typography><Typography color="primary.main" fontWeight={800}>{t('feature.pointsShort', { score: number.format(entry.score) })}</Typography></CardContent></Card></Grid>)}</Grid></Box>
      <Alert severity="info"><strong>{t('feature.scoringTitle')}</strong> {t('feature.scoringText')}</Alert>
      <Box><Typography variant="h6" mb={1}>{t('feature.badgeCabinet')}</Typography><Stack direction="row" gap={1} useFlexGap flexWrap="wrap">{badges.length ? badges.map(badge => <Chip key={`${badge.badgeKey}-${badge.awardedAt}`} icon={<WorkspacePremium />} label={translateRewardKey(t, badge.nameKey)} color={badge.rankValue === 1 ? 'warning' : 'default'} />) : <Typography color="text.secondary">{t('feature.badgeEmpty')}</Typography>}</Stack></Box>
      <Box><Typography variant="h6" mb={1}>{t('feature.seasonHistory')}</Typography><Stack gap={1}>{(seasonsQuery.data || []).map(item => <Card key={item.seasonId} variant="outlined" sx={{ borderRadius: 3 }}><CardContent><Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} gap={2}><Box flex={1}><Typography fontWeight={700}>{item.name}</Typography><Typography color="text.secondary">{item.seasonKey} · {t('feature.participants', { count: item.participantCount })}</Typography></Box><Chip label={item.status} color={item.status === 'closed' ? 'default' : 'success'} />{canManageRewards && item.status !== 'closed' && <Button disabled={closeSeasonMutation.isPending} onClick={() => closeSeasonMutation.mutate(item.seasonId)}>{t('feature.closeSeason')}</Button>}</Stack></CardContent></Card>)}</Stack></Box>
      <Stack gap={1}>{leaderboard.map((entry, index) => <Card key={entry.userId} sx={{ ...surface, bgcolor: entry.userId === user?.userId ? 'action.selected' : 'background.paper' }}><CardContent><Stack direction="row" alignItems="center" gap={2}><Typography variant="h5" width={44}>#{index + 1}</Typography><Avatar src={entry.userImageUrl}>{entry.userName?.[0]}</Avatar><Box flex={1}><Typography fontWeight={700}>{entry.userName} {entry.userLastName}</Typography><Typography color="text.secondary">{t('rewards.completedCount', { count: number.format(entry.completedTasks) })}</Typography></Box><Chip color="primary" label={t('rewards.pointsCount', { count: number.format(entry.score) })} /></Stack></CardContent></Card>)}</Stack>
    </Stack>}

    {tab === 3 && <AchievementCollection achievements={achievementsQuery.data || []} selectedBadgeKey={searchParams.get('achievement')} manage onUpdate={async (badgeKey, input) => { await rewardApi.updateAchievement(badgeKey, input); await queryClient.invalidateQueries({ queryKey: ['rewards', 'achievements'] }); }} />}

    {tab === 4 && canManageRewards && <Stack gap={3}>
      <Card sx={surface}><CardContent><Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={2}><Box><Typography variant="h6">{t('rewards.enableRedemption')}</Typography><Typography color="text.secondary">{t('rewards.enableRedemptionHelp')}</Typography></Box><Switch checked={Boolean(catalog.settings.redemptionEnabled)} onChange={(_, checked) => settingMutation.mutate({ redemptionEnabled: checked })} /></Stack></CardContent></Card>
      <Box><Typography variant="h6" mb={1}>{t('rewards.missionSettings')}</Typography><Stack gap={1}>{(templateQuery.data || []).map(template => <Card key={template.templateId} variant="outlined" sx={{ borderRadius: 3 }}><CardContent><Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ md: 'center' }} gap={2}><Box flex={1}><Typography fontWeight={700}>{t(template.titleKey as any)}</Typography><Typography color="text.secondary">{template.cadence === 'weekly' ? t('rewards.weekly') : t('rewards.monthly')} · {template.scope === 'personal' ? t('rewards.personal') : t('rewards.shared')}</Typography></Box><TextField size="small" type="number" label={t('rewards.target')} value={template.defaultTarget} onChange={event => queryClient.setQueryData<RewardMissionTemplate[]>(['rewards', 'mission-templates'], current => current?.map(item => item.templateId === template.templateId ? { ...item, defaultTarget: Number(event.target.value) } : item))} sx={{ width: 110 }} /><TextField size="small" type="number" label={t('rewards.rewardPoints')} value={template.defaultRewardPoints} onChange={event => queryClient.setQueryData<RewardMissionTemplate[]>(['rewards', 'mission-templates'], current => current?.map(item => item.templateId === template.templateId ? { ...item, defaultRewardPoints: Number(event.target.value) } : item))} sx={{ width: 130 }} /><Switch checked={Boolean(template.isActive)} onChange={(_, checked) => templateMutation.mutate({ ...template, isActive: checked })} /><Button disabled={templateMutation.isPending} onClick={() => templateMutation.mutate(template)}>{t('common.save')}</Button></Stack></CardContent></Card>)}</Stack></Box>
      <Box><Typography variant="h6" mb={1}>{t('rewards.catalogManagement')}</Typography><Stack gap={1}>{(adminCatalogQuery.data || []).map(item => <Card key={item.itemId} variant="outlined" sx={{ borderRadius: 3 }}><CardContent><Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} gap={2}><Box flex={1}><Typography fontWeight={700}>{item.name}</Typography><Typography color="text.secondary">{t('rewards.pointsCost', { count: number.format(item.pointsCost) })} · {t('rewards.stock', { count: number.format(item.availableStock) })}</Typography></Box><Chip label={item.isActive ? t('common.active') : t('common.inactive')} color={item.isActive ? 'success' : 'default'} /><Button onClick={() => editItem(item)}>{t('common.edit')}</Button>{item.isActive && <Button color="error" onClick={() => deactivateItem(item)}>{t('rewards.deactivate')}</Button>}</Stack></CardContent></Card>)}</Stack></Box>
      <Button variant="contained" sx={{ alignSelf: 'flex-start' }} onClick={() => setCatalogOpen(true)}>{t('rewards.addCatalogItem')}</Button>
      <Stack gap={1}>{(adminQuery.data || []).map(request => <Card key={request.redemptionId} variant="outlined" sx={{ borderRadius: 3 }}><CardContent><Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ md: 'center' }} gap={2}><Box flex={1}><Typography fontWeight={700}>{request.userName} {request.userLastName} · {request.itemName}</Typography><Typography color="text.secondary">{number.format(request.pointsCost)} {t('rewards.points')} · {t(`rewards.status.${request.status}` as any)}</Typography></Box>{request.status === 'pending' && <><Button onClick={() => decisionMutation.mutate({ id: request.redemptionId, action: 'reject' })}>{t('common.reject')}</Button><Button variant="contained" onClick={() => decisionMutation.mutate({ id: request.redemptionId, action: 'approve' })}>{t('common.approve')}</Button></>}{request.status === 'approved' && <Button variant="contained" onClick={() => decisionMutation.mutate({ id: request.redemptionId, action: 'fulfill' })}>{t('rewards.markFulfilled')}</Button>}</Stack></CardContent></Card>)}</Stack>
    </Stack>}

    <Dialog open={catalogOpen} onClose={() => !createMutation.isPending && setCatalogOpen(false)} fullWidth maxWidth="sm"><DialogTitle>{editingItemId ? t('rewards.editCatalogItem') : t('rewards.addCatalogItem')}</DialogTitle><DialogContent><Stack gap={2} mt={1}><TextField label={t('common.name')} value={itemForm.name} onChange={event => setItemForm({ ...itemForm, name: event.target.value })} /><TextField label={t('common.description')} multiline rows={3} value={itemForm.description} onChange={event => setItemForm({ ...itemForm, description: event.target.value })} /><TextField label={t('rewards.imageUrl')} value={itemForm.imageUrl} onChange={event => setItemForm({ ...itemForm, imageUrl: event.target.value })} /><TextField type="number" label={t('rewards.cost')} value={itemForm.pointsCost} onChange={event => setItemForm({ ...itemForm, pointsCost: Number(event.target.value) })} /><TextField type="number" label={t('rewards.stockLabel')} value={itemForm.availableStock} onChange={event => setItemForm({ ...itemForm, availableStock: Number(event.target.value) })} /><TextField type="number" label={t('rewards.perUserLimit')} value={itemForm.perUserLimit} onChange={event => setItemForm({ ...itemForm, perUserLimit: Number(event.target.value) })} /><TextField type="datetime-local" label={t('rewards.startsAt')} InputLabelProps={{ shrink: true }} value={itemForm.startsAt} onChange={event => setItemForm({ ...itemForm, startsAt: event.target.value })} /><TextField type="datetime-local" label={t('rewards.endsAt')} InputLabelProps={{ shrink: true }} value={itemForm.endsAt} onChange={event => setItemForm({ ...itemForm, endsAt: event.target.value })} />{editingItemId && <Stack direction="row" alignItems="center" justifyContent="space-between"><Typography>{itemForm.isActive ? t('common.active') : t('common.inactive')}</Typography><Switch checked={itemForm.isActive} onChange={(_, checked) => setItemForm({ ...itemForm, isActive: checked })} /></Stack>}</Stack></DialogContent><DialogActions><Button onClick={() => { setCatalogOpen(false); setEditingItemId(null); setItemForm(emptyItem); }}>{t('common.cancel')}</Button><Button variant="contained" disabled={createMutation.isPending} onClick={() => createMutation.mutate()}>{t('common.save')}</Button></DialogActions></Dialog>
  </PageShell>;
}
