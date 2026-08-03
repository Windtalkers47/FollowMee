import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert, Avatar, Box, Button, Card, CardContent, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Grid, LinearProgress, Stack, Switch, Tab, Tabs, TextField, Typography,
} from '@mui/material';
import { EmojiEvents, Redeem, Stars, WorkspacePremium } from '@mui/icons-material';
import { rewardApi, RewardCatalogItem, RewardMissionTemplate } from '../../api/reward.api';
import { useAppSelector } from '../../store/store';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import feedback from '../../services/feedback.service';

const surface = { borderRadius: 4, border: '1px solid', borderColor: 'divider', boxShadow: '0 12px 32px rgba(50,35,64,.06)' };

export default function RewardsPage() {
  const { t, locale } = useUserPreferences();
  const user = useAppSelector(state => state.auth.user);
  const isOwner = user?.roles?.some(role => role === 'Owner' || role === 'Superadmin') || false;
  const queryClient = useQueryClient();
  const [tab, setTab] = useState(0);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const emptyItem = { name: '', description: '', imageUrl: '', pointsCost: 40, availableStock: 10, perUserLimit: 1, startsAt: '', endsAt: '', isActive: true };
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [itemForm, setItemForm] = useState(emptyItem);
  const number = useMemo(() => new Intl.NumberFormat(locale === 'th' ? 'th-TH-u-nu-latn' : 'en-US'), [locale]);

  const summaryQuery = useQuery({ queryKey: ['rewards', 'summary'], queryFn: rewardApi.summary, staleTime: 20_000 });
  const catalogQuery = useQuery({ queryKey: ['rewards', 'catalog'], queryFn: rewardApi.catalog, staleTime: 20_000 });
  const adminQuery = useQuery({ queryKey: ['rewards', 'admin-redemptions'], queryFn: rewardApi.adminRedemptions, enabled: isOwner && tab === 3 });
  const templateQuery = useQuery({ queryKey: ['rewards', 'mission-templates'], queryFn: rewardApi.missionTemplates, enabled: isOwner && tab === 3 });
  const adminCatalogQuery = useQuery({ queryKey: ['rewards', 'admin-catalog'], queryFn: rewardApi.adminCatalog, enabled: isOwner && tab === 3 });
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['rewards'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
    ]);
  };
  const redeemMutation = useMutation({
    mutationFn: (item: RewardCatalogItem) => rewardApi.redeem(item.itemId),
    onSuccess: async () => { await refresh(); await feedback.success({ title: t('rewards.requested'), message: t('rewards.requestedMessage'), importance: 'milestone' }); },
    onError: async (error: any) => feedback.error({ title: t('rewards.requestFailed'), message: error?.response?.data?.message || t('common.tryAgain') }),
  });
  const settingMutation = useMutation({ mutationFn: rewardApi.updateSettings, onSuccess: refresh });
  const decisionMutation = useMutation({
    mutationFn: ({ id, action }: { id: number; action: 'approve' | 'reject' | 'fulfill' }) => action === 'approve' ? rewardApi.approve(id) : action === 'reject' ? rewardApi.reject(id) : rewardApi.fulfill(id),
    onSuccess: refresh,
  });
  const createMutation = useMutation({
    mutationFn: () => editingItemId ? rewardApi.updateItem(editingItemId, itemForm) : rewardApi.createItem(itemForm),
    onSuccess: async () => { setCatalogOpen(false); setEditingItemId(null); setItemForm(emptyItem); await refresh(); },
  });
  const deactivateMutation = useMutation({ mutationFn: rewardApi.deactivateItem, onSuccess: refresh });
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
    onSuccess: refresh,
  });

  if (summaryQuery.isLoading || catalogQuery.isLoading) return <Box display="grid" minHeight="50vh" sx={{ placeItems: 'center' }}><CircularProgress /></Box>;
  if (!summaryQuery.data || !catalogQuery.data) return <Alert severity="error">{t('common.loadFailed')}</Alert>;
  const { wallet, missions, badges, leaderboard, redemptions, seasonScore, myRank, season } = summaryQuery.data;
  const catalog = catalogQuery.data;

  return <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1440, mx: 'auto' }}>
    <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={2} mb={3}>
      <Box><Typography variant="overline" color="primary.main">{t('rewards.community')}</Typography><Typography variant="h3" fontWeight={800}>{t('rewards.title')}</Typography><Typography color="text.secondary">{t('rewards.subtitle')}</Typography></Box>
      <Chip icon={<EmojiEvents />} label={t('rewards.season', { season: season.seasonKey })} sx={{ alignSelf: 'flex-start', minHeight: 44, px: 1 }} />
    </Stack>
    <Grid container spacing={2} mb={3}>
      {[
        [t('rewards.availablePoints'), wallet.availablePoints, <Redeem />],
        [t('rewards.reservedPoints'), wallet.reservedPoints, <Stars />],
        [t('rewards.seasonScore'), seasonScore, <EmojiEvents />],
        [t('rewards.currentRank'), myRank ? `#${myRank}` : '—', <WorkspacePremium />],
      ].map(([label, value, icon]) => <Grid key={String(label)} size={{ xs: 6, md: 3 }}><Card sx={{ ...surface, height: '100%', bgcolor: 'background.paper' }}><CardContent><Avatar sx={{ bgcolor: 'action.selected', color: 'primary.main', mb: 2 }}>{icon}</Avatar><Typography color="text.secondary">{label}</Typography><Typography variant="h4" fontWeight={800}>{typeof value === 'number' ? number.format(value) : value}</Typography></CardContent></Card></Grid>)}
    </Grid>
    <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="scrollable" sx={{ mb: 3 }}>
      <Tab label={t('rewards.missions')} /><Tab label={t('rewards.catalog')} /><Tab label={t('rewards.leaderboard')} />{isOwner && <Tab label={t('rewards.ownerConsole')} />}
    </Tabs>

    {tab === 0 && <Grid container spacing={2}>{missions.length ? missions.map(mission => <Grid key={mission.missionId} size={{ xs: 12, md: 6 }}><Card sx={surface}><CardContent><Stack direction="row" justifyContent="space-between" gap={1}><Box><Chip size="small" label={mission.cadence === 'weekly' ? t('rewards.weekly') : t('rewards.monthly')} /><Typography variant="h6" mt={1}>{t(mission.titleKey as any)}</Typography><Typography color="text.secondary">{t(mission.descriptionKey as any)}</Typography></Box><Chip color="primary" label={`+${mission.rewardPoints}`} /></Stack><LinearProgress variant="determinate" value={Math.min(100, mission.progress / mission.target * 100)} sx={{ mt: 3, height: 9, borderRadius: 9 }} /><Typography mt={1} variant="body2">{number.format(mission.progress)} / {number.format(mission.target)}</Typography></CardContent></Card></Grid>) : <Grid size={12}><Alert severity="success">{t('rewards.noMissions')}</Alert></Grid>}</Grid>}

    {tab === 1 && <><Alert severity={catalog.settings.redemptionEnabled ? 'success' : 'info'} sx={{ mb: 2 }}>{catalog.settings.redemptionEnabled ? t('rewards.redemptionOpen') : t('rewards.redemptionClosed')}</Alert><Grid container spacing={2}>{catalog.items.map(item => <Grid key={item.itemId} size={{ xs: 12, sm: 6, lg: 4 }}><Card sx={{ ...surface, height: '100%' }}><CardContent>{item.imageUrl && <Box component="img" src={item.imageUrl} alt="" loading="lazy" sx={{ width: '100%', height: 150, objectFit: 'cover', borderRadius: 3, mb: 2 }} />}<Typography variant="h6">{item.name}</Typography><Typography color="text.secondary" minHeight={48}>{item.description}</Typography><Stack direction="row" gap={1} my={2}><Chip label={t('rewards.pointsCost', { count: number.format(item.pointsCost) })} /><Chip label={t('rewards.stock', { count: number.format(item.availableStock) })} /></Stack><Button fullWidth variant="contained" disabled={!catalog.settings.redemptionEnabled || item.availableStock < 1 || wallet.availablePoints < item.pointsCost || redeemMutation.isPending} onClick={() => redeemMutation.mutate(item)}>{t('rewards.redeem')}</Button>{isOwner && <Stack direction="row" mt={1}><Button fullWidth onClick={() => editItem(item)}>{t('common.edit')}</Button><Button fullWidth color="error" disabled={deactivateMutation.isPending} onClick={() => deactivateItem(item)}>{t('rewards.deactivate')}</Button></Stack>}</CardContent></Card></Grid>)}</Grid><Typography variant="h6" mt={4} mb={1}>{t('rewards.history')}</Typography><Stack gap={1}>{redemptions.map(request => <Card key={request.redemptionId} variant="outlined" sx={{ borderRadius: 3 }}><CardContent><Stack direction="row" justifyContent="space-between"><Box><Typography fontWeight={700}>{request.itemName}</Typography><Typography color="text.secondary">{number.format(request.pointsCost)} {t('rewards.points')}</Typography></Box><Chip label={t(`rewards.status.${request.status}` as any)} /></Stack></CardContent></Card>)}</Stack></>}

    {tab === 2 && <Stack gap={1}>{leaderboard.map((entry, index) => <Card key={entry.userId} sx={{ ...surface, bgcolor: entry.userId === user?.userId ? 'action.selected' : 'background.paper' }}><CardContent><Stack direction="row" alignItems="center" gap={2}><Typography variant="h5" width={44}>#{index + 1}</Typography><Avatar src={entry.userImageUrl}>{entry.userName?.[0]}</Avatar><Box flex={1}><Typography fontWeight={700}>{entry.userName} {entry.userLastName}</Typography><Typography color="text.secondary">{t('rewards.completedCount', { count: number.format(entry.completedTasks) })}</Typography></Box><Chip color="primary" label={t('rewards.pointsCount', { count: number.format(entry.score) })} /></Stack></CardContent></Card>)}</Stack>}

    {tab === 3 && isOwner && <Stack gap={3}>
      <Card sx={surface}><CardContent><Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={2}><Box><Typography variant="h6">{t('rewards.enableRedemption')}</Typography><Typography color="text.secondary">{t('rewards.enableRedemptionHelp')}</Typography></Box><Switch checked={Boolean(catalog.settings.redemptionEnabled)} onChange={(_, checked) => settingMutation.mutate({ redemptionEnabled: checked })} /></Stack></CardContent></Card>
      <Box><Typography variant="h6" mb={1}>{t('rewards.missionSettings')}</Typography><Stack gap={1}>{(templateQuery.data || []).map(template => <Card key={template.templateId} variant="outlined" sx={{ borderRadius: 3 }}><CardContent><Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ md: 'center' }} gap={2}><Box flex={1}><Typography fontWeight={700}>{t(template.titleKey as any)}</Typography><Typography color="text.secondary">{template.cadence === 'weekly' ? t('rewards.weekly') : t('rewards.monthly')} · {template.scope === 'personal' ? t('rewards.personal') : t('rewards.shared')}</Typography></Box><TextField size="small" type="number" label={t('rewards.target')} value={template.defaultTarget} onChange={event => queryClient.setQueryData<RewardMissionTemplate[]>(['rewards', 'mission-templates'], current => current?.map(item => item.templateId === template.templateId ? { ...item, defaultTarget: Number(event.target.value) } : item))} sx={{ width: 110 }} /><TextField size="small" type="number" label={t('rewards.rewardPoints')} value={template.defaultRewardPoints} onChange={event => queryClient.setQueryData<RewardMissionTemplate[]>(['rewards', 'mission-templates'], current => current?.map(item => item.templateId === template.templateId ? { ...item, defaultRewardPoints: Number(event.target.value) } : item))} sx={{ width: 130 }} /><Switch checked={Boolean(template.isActive)} onChange={(_, checked) => templateMutation.mutate({ ...template, isActive: checked })} /><Button disabled={templateMutation.isPending} onClick={() => templateMutation.mutate(template)}>{t('common.save')}</Button></Stack></CardContent></Card>)}</Stack></Box>
      <Box><Typography variant="h6" mb={1}>{t('rewards.catalogManagement')}</Typography><Stack gap={1}>{(adminCatalogQuery.data || []).map(item => <Card key={item.itemId} variant="outlined" sx={{ borderRadius: 3 }}><CardContent><Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} gap={2}><Box flex={1}><Typography fontWeight={700}>{item.name}</Typography><Typography color="text.secondary">{t('rewards.pointsCost', { count: number.format(item.pointsCost) })} · {t('rewards.stock', { count: number.format(item.availableStock) })}</Typography></Box><Chip label={item.isActive ? t('common.active') : t('common.inactive')} color={item.isActive ? 'success' : 'default'} /><Button onClick={() => editItem(item)}>{t('common.edit')}</Button>{item.isActive && <Button color="error" onClick={() => deactivateItem(item)}>{t('rewards.deactivate')}</Button>}</Stack></CardContent></Card>)}</Stack></Box>
      <Button variant="contained" sx={{ alignSelf: 'flex-start' }} onClick={() => setCatalogOpen(true)}>{t('rewards.addCatalogItem')}</Button>
      <Stack gap={1}>{(adminQuery.data || []).map(request => <Card key={request.redemptionId} variant="outlined" sx={{ borderRadius: 3 }}><CardContent><Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ md: 'center' }} gap={2}><Box flex={1}><Typography fontWeight={700}>{request.userName} {request.userLastName} · {request.itemName}</Typography><Typography color="text.secondary">{number.format(request.pointsCost)} {t('rewards.points')} · {t(`rewards.status.${request.status}` as any)}</Typography></Box>{request.status === 'pending' && <><Button onClick={() => decisionMutation.mutate({ id: request.redemptionId, action: 'reject' })}>{t('common.reject')}</Button><Button variant="contained" onClick={() => decisionMutation.mutate({ id: request.redemptionId, action: 'approve' })}>{t('common.approve')}</Button></>}{request.status === 'approved' && <Button variant="contained" onClick={() => decisionMutation.mutate({ id: request.redemptionId, action: 'fulfill' })}>{t('rewards.markFulfilled')}</Button>}</Stack></CardContent></Card>)}</Stack>
    </Stack>}

    <Dialog open={catalogOpen} onClose={() => !createMutation.isPending && setCatalogOpen(false)} fullWidth maxWidth="sm"><DialogTitle>{editingItemId ? t('rewards.editCatalogItem') : t('rewards.addCatalogItem')}</DialogTitle><DialogContent><Stack gap={2} mt={1}><TextField label={t('common.name')} value={itemForm.name} onChange={event => setItemForm({ ...itemForm, name: event.target.value })} /><TextField label={t('common.description')} multiline rows={3} value={itemForm.description} onChange={event => setItemForm({ ...itemForm, description: event.target.value })} /><TextField label={t('rewards.imageUrl')} value={itemForm.imageUrl} onChange={event => setItemForm({ ...itemForm, imageUrl: event.target.value })} /><TextField type="number" label={t('rewards.cost')} value={itemForm.pointsCost} onChange={event => setItemForm({ ...itemForm, pointsCost: Number(event.target.value) })} /><TextField type="number" label={t('rewards.stockLabel')} value={itemForm.availableStock} onChange={event => setItemForm({ ...itemForm, availableStock: Number(event.target.value) })} /><TextField type="number" label={t('rewards.perUserLimit')} value={itemForm.perUserLimit} onChange={event => setItemForm({ ...itemForm, perUserLimit: Number(event.target.value) })} /><TextField type="datetime-local" label={t('rewards.startsAt')} InputLabelProps={{ shrink: true }} value={itemForm.startsAt} onChange={event => setItemForm({ ...itemForm, startsAt: event.target.value })} /><TextField type="datetime-local" label={t('rewards.endsAt')} InputLabelProps={{ shrink: true }} value={itemForm.endsAt} onChange={event => setItemForm({ ...itemForm, endsAt: event.target.value })} />{editingItemId && <Stack direction="row" alignItems="center" justifyContent="space-between"><Typography>{itemForm.isActive ? t('common.active') : t('common.inactive')}</Typography><Switch checked={itemForm.isActive} onChange={(_, checked) => setItemForm({ ...itemForm, isActive: checked })} /></Stack>}</Stack></DialogContent><DialogActions><Button onClick={() => { setCatalogOpen(false); setEditingItemId(null); setItemForm(emptyItem); }}>{t('common.cancel')}</Button><Button variant="contained" disabled={createMutation.isPending} onClick={() => createMutation.mutate()}>{t('common.save')}</Button></DialogActions></Dialog>
  </Box>;
}
