import { useState } from 'react';
import PushPinOutlined from '@mui/icons-material/PushPinOutlined';
import PublicOutlined from '@mui/icons-material/PublicOutlined';
import LockOutlined from '@mui/icons-material/LockOutlined';
import KeyboardArrowUp from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDown from '@mui/icons-material/KeyboardArrowDown';
import { Box, Card, CardContent, Chip, IconButton, LinearProgress, Stack, Tooltip, Typography } from '@mui/material';
import type { Achievement } from '../../api/reward.api';
import { translateRewardKey } from '../../utils/rewardPresentation';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import AchievementArtwork from '../AchievementArtwork';

type AchievementUpdate = { isPinned?: boolean; isPublic?: boolean; sortOrder?: number };
type Props = { achievements: Achievement[]; manage?: boolean; selectedBadgeKey?: string | null; onUpdate?: (badgeKey: string, input: AchievementUpdate) => Promise<void> };

export default function AchievementCollection({ achievements, manage = false, selectedBadgeKey, onUpdate }: Props) {
  const { t, locale } = useUserPreferences();
  const [busy, setBusy] = useState('');
  const date = (value: string | null) => value ? new Intl.DateTimeFormat(locale === 'th' ? 'th-TH' : 'en-US', { dateStyle: 'medium' }).format(new Date(value)) : '';
  const update = async (item: Achievement, input: AchievementUpdate) => {
    if (!onUpdate) return;
    setBusy(item.badgeKey);
    try { await onUpdate(item.badgeKey, input); } finally { setBusy(''); }
  };

  if (!achievements.length) return <Card variant="outlined" sx={{ borderRadius: 3, boxShadow: 'none' }}><CardContent sx={{ py: 5, textAlign: 'center' }}><Typography variant="h6" fontWeight={800}>{t('achievement.title')}</Typography><Typography color="text.secondary">{t('achievement.empty')}</Typography></CardContent></Card>;

  return <Box component="section" aria-labelledby="achievement-collection-title">
    <Stack direction="row" justifyContent="space-between" alignItems="end" mb={2}><Box><Typography id="achievement-collection-title" variant="h5" fontWeight={850}>{t('achievement.title')}</Typography><Typography color="text.secondary">{t('achievement.subtitle')}</Typography></Box><Chip label={`${achievements.filter(item => item.unlocked).length}/${achievements.length}`} /></Stack>
    <Box display="grid" gridTemplateColumns="repeat(auto-fit,minmax(min(100%,320px),1fr))" gap={1.25}>
      {achievements.map(item => <Card id={`achievement-${item.badgeKey}`} key={item.badgeKey} variant="outlined" sx={{ borderRadius: 2.5, boxShadow: selectedBadgeKey === item.badgeKey ? '0 0 0 3px rgba(73,121,89,.22)' : 'none', borderColor: selectedBadgeKey === item.badgeKey ? 'primary.main' : 'divider', bgcolor: item.unlocked ? 'background.paper' : 'action.hover' }}>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}><Stack direction="row" spacing={1.75} alignItems="center">
          <AchievementArtwork artworkKey={item.artworkKey} rarity={item.rarity} locked={!item.unlocked} size={72} />
          <Box minWidth={0} flex={1}><Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap"><Typography fontWeight={850}>{translateRewardKey(t, item.nameKey)}</Typography><Chip size="small" label={item.rarity} color={item.rarity === 'legendary' ? 'warning' : item.rarity === 'epic' ? 'secondary' : item.rarity === 'rare' ? 'primary' : 'default'} sx={{ height: 20, textTransform: 'capitalize' }} /></Stack><Typography variant="body2" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{translateRewardKey(t, item.requirementKey || item.descriptionKey)}</Typography>{item.unlocked ? <Typography variant="caption" color="text.secondary">{t('achievement.earnedOn', { date: date(item.awardedAt) })}</Typography> : <Box mt={0.75}><Stack direction="row" justifyContent="space-between"><Typography variant="caption" color="text.secondary">{t('achievement.locked')}</Typography><Typography variant="caption">{t('achievement.progress', { current: item.progress, target: item.target })}</Typography></Stack><LinearProgress variant="determinate" value={item.progressPercent} sx={{ height: 5, borderRadius: 3 }} /></Box>}</Box>
          {manage && item.unlocked && <Stack><Tooltip title={item.isPinned ? t('achievement.unpin') : t('achievement.pin')}><IconButton size="small" disabled={busy === item.badgeKey} onClick={() => void update(item, { isPinned: !item.isPinned })} color={item.isPinned ? 'primary' : 'default'}><PushPinOutlined fontSize="small" /></IconButton></Tooltip><Tooltip title={item.isPublic ? t('achievement.public') : t('achievement.private')}><IconButton size="small" disabled={busy === item.badgeKey} onClick={() => void update(item, { isPublic: !item.isPublic })} color={item.isPublic ? 'primary' : 'default'}>{item.isPublic ? <PublicOutlined fontSize="small" /> : <LockOutlined fontSize="small" />}</IconButton></Tooltip><Stack direction="row"><Tooltip title={t('achievement.moveUp')}><IconButton size="small" disabled={busy === item.badgeKey} onClick={() => void update(item, { sortOrder: Math.max(0, item.sortOrder - 1) })}><KeyboardArrowUp fontSize="small" /></IconButton></Tooltip><Tooltip title={t('achievement.moveDown')}><IconButton size="small" disabled={busy === item.badgeKey} onClick={() => void update(item, { sortOrder: item.sortOrder + 1 })}><KeyboardArrowDown fontSize="small" /></IconButton></Tooltip></Stack></Stack>}
        </Stack></CardContent>
      </Card>)}
    </Box>
  </Box>;
}
