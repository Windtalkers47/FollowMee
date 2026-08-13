import { useState } from 'react';
import { Alert, Avatar, Box, Button, Card, CardContent, FormControl, InputLabel, MenuItem, Select, Skeleton, Stack, TextField, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';
import { userProfileApi, type UserProfile, type UserProfileVisibility } from '../../api/userProfile.api';
import { rewardApi } from '../../api/reward.api';
import AchievementCollection from '../../components/AchievementCollection';
import { useAppSelector } from '../../store/store';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import feedback from '../../services/feedback.service';

type ProfileForm = { handle: string; headline: string; bio: string; visibility: UserProfileVisibility };

function UserProfileEditor({ profile, suggestedHandle }: { profile: UserProfile | null; suggestedHandle: string }) {
  const { t } = useUserPreferences();
  const user = useAppSelector(state => state.auth.user);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const achievements = useQuery({ queryKey: ['rewards', 'achievements'], queryFn: rewardApi.achievements });
  const [form, setForm] = useState<ProfileForm>({ handle: profile?.handle || suggestedHandle, headline: profile?.headline || '', bio: profile?.bio || '', visibility: profile?.visibility || 'private' });
  const save = useMutation({
    mutationFn: () => userProfileApi.save(form),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['user-profile'] }); await feedback.success(t('profile.user.saved'), t('profile.user.savedHelp')); },
    onError: (error: unknown) => { const message = (error as AxiosError<{ message?: string }>).response?.data?.message; feedback.error(t('common.error'), message || t('common.tryAgain')); },
  });
  const publish = useMutation({ mutationFn: (status: 'publish' | 'unpublish') => status === 'publish' ? userProfileApi.publish() : userProfileApi.unpublish(), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['user-profile'] }) });
  return <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1180, mx: 'auto' }}>
    <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={2} mb={3}><Box><Typography variant="overline" color="primary.main">{t('profile.user.showcase')}</Typography><Typography variant="h3" fontWeight={850}>{t('profile.user.title')}</Typography><Typography color="text.secondary">{t('profile.user.subtitle')}</Typography></Box>{profile?.status === 'published' && profile.visibility !== 'private' && <Button variant="outlined" onClick={() => navigate(`/u/${profile.handle}`)}>{t('profile.user.viewPublic')}</Button>}</Stack>
    <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: 'minmax(0,1fr) 340px' }} gap={2.5}>
      <Card variant="outlined" sx={{ borderRadius: 3, boxShadow: 'none' }}><CardContent><Stack gap={2}><TextField label={t('profile.user.handle')} value={form.handle} onChange={event => setForm({ ...form, handle: event.target.value.toLowerCase() })} helperText={t('profile.user.handleHelp')} /><TextField label={t('profile.user.headline')} value={form.headline} inputProps={{ maxLength: 140 }} onChange={event => setForm({ ...form, headline: event.target.value })} /><TextField label={t('profile.user.bio')} multiline minRows={4} value={form.bio} inputProps={{ maxLength: 500 }} onChange={event => setForm({ ...form, bio: event.target.value })} /><FormControl><InputLabel>{t('profile.user.visibility')}</InputLabel><Select label={t('profile.user.visibility')} value={form.visibility} onChange={event => setForm({ ...form, visibility: event.target.value as UserProfileVisibility })}><MenuItem value="private">{t('feature.private')}</MenuItem><MenuItem value="unlisted">{t('feature.unlisted')}</MenuItem><MenuItem value="public">{t('feature.public')}</MenuItem></Select></FormControl><Stack direction={{ xs: 'column', sm: 'row' }} gap={1}><Button variant="contained" disabled={save.isPending} onClick={() => save.mutate()}>{t('common.save')}</Button>{profile && <Button variant="outlined" disabled={publish.isPending} onClick={() => publish.mutate(profile.status === 'published' ? 'unpublish' : 'publish')}>{profile.status === 'published' ? t('profile.user.unpublish') : t('profile.user.publish')}</Button>}</Stack></Stack></CardContent></Card>
      <Card variant="outlined" sx={{ borderRadius: 3, boxShadow: 'none' }}><CardContent sx={{ textAlign: 'center' }}><Avatar src={user?.userImageUrl || undefined} sx={{ width: 88, height: 88, mx: 'auto', mb: 2 }}>{user?.userName?.[0]}</Avatar><Typography variant="h5" fontWeight={850}>{user?.userName} {user?.userLastName}</Typography><Typography color="text.secondary">{form.headline || t('profile.user.previewHeadline')}</Typography><Alert severity={profile?.status === 'published' ? 'success' : 'info'} sx={{ mt: 2, textAlign: 'left' }}>{profile?.status === 'published' ? t('profile.user.published') : t('profile.user.draft')}</Alert></CardContent></Card>
    </Box>
    <Box mt={4}><AchievementCollection achievements={achievements.data || []} manage onUpdate={async (badgeKey, input) => { await rewardApi.updateAchievement(badgeKey, input); await queryClient.invalidateQueries({ queryKey: ['rewards', 'achievements'] }); }} /></Box>
  </Box>;
}

export default function UserProfilePage() {
  const profileQuery = useQuery({ queryKey: ['user-profile', 'me'], queryFn: userProfileApi.mine });
  if (profileQuery.isLoading) return <Box p={4}><Skeleton height={420} /></Box>;
  const result = profileQuery.data;
  const emptyResult = result && 'profile' in result && result.profile === null && 'suggestedHandle' in result ? result as { profile: null; suggestedHandle: string } : null;
  const profile: UserProfile | null = result && !emptyResult ? result as UserProfile : null;
  const suggestedHandle = emptyResult?.suggestedHandle || '';
  return <UserProfileEditor key={`${profile?.handle || suggestedHandle}-${profile?.status || 'new'}`} profile={profile} suggestedHandle={suggestedHandle} />;
}
