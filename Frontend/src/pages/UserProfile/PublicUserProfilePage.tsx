import { Alert, Avatar, Box, Button, Card, CardContent, Skeleton, Stack, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { userProfileApi } from '../../api/userProfile.api';
import AchievementCollection from '../../components/AchievementCollection';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import { AxiosError } from 'axios';
import { publicProfileErrorState } from '../../utils/publicProfileErrorState';

export default function PublicUserProfilePage() {
  const { handle = '' } = useParams();
  const { t } = useUserPreferences();
  const query = useQuery({
    queryKey: ['user-profile', 'public', handle],
    queryFn: () => userProfileApi.public(handle),
    retry: false,
  });

  if (query.isLoading) return <Box maxWidth={900} mx="auto" p={3}><Skeleton height={500} /></Box>;
  if (query.isError) {
    const status = (query.error as AxiosError).response?.status;
    const state = publicProfileErrorState(status);
    const message = state === 'unavailable'
      ? t('profile.user.notFoundOrPrivate')
      : state === 'permission'
        ? t('profile.user.permissionDenied')
        : t('profile.user.publicLoadError');
    return <Box minHeight="100svh" display="grid" sx={{ placeItems: 'center', p: 3 }}><Alert severity={state === 'network' ? 'error' : 'info'} action={state === 'network' ? <Button color="inherit" onClick={() => query.refetch()}>{t('feedback.retry')}</Button> : undefined}>{message}</Alert></Box>;
  }
  if (!query.data) return null;

  const profile = query.data;
  const configuredAccent = profile.themeConfig?.accentColor;
  const accent = typeof configuredAccent === 'string' && /^(#[0-9a-f]{3,8}|rgb\(|hsl\()/i.test(configuredAccent) ? configuredAccent : 'rgba(73,121,89,.18)';
  return (
    <Box minHeight="100svh" sx={{ p: { xs: 2, sm: 4 }, background: `radial-gradient(circle at 50% 0%,${accent},transparent 42%)`, backgroundColor: 'background.default' }}>
      <Box maxWidth={960} mx="auto">
        <Card variant="outlined" sx={{ borderRadius: 4, boxShadow: 'none', mb: 3 }}>
          <CardContent sx={{ py: 5, textAlign: 'center' }}>
            <Avatar src={profile.avatarUrl || undefined} sx={{ width: 104, height: 104, mx: 'auto', mb: 2 }}>{profile.displayName[0]}</Avatar>
            <Typography variant="h3" fontWeight={900}>{profile.displayName}</Typography>
            {profile.headline && <Typography variant="h6" color="primary.main">{profile.headline}</Typography>}
            {profile.bio && <Typography color="text.secondary" maxWidth={620} mx="auto" mt={2}>{profile.bio}</Typography>}
          </CardContent>
        </Card>
        <AchievementCollection achievements={profile.achievements} />
        <Stack alignItems="center" mt={4}><Typography variant="caption" color="text.secondary">FollowMee</Typography></Stack>
      </Box>
    </Box>
  );
}
