import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import ContentCopyRounded from '@mui/icons-material/ContentCopyRounded';
import DownloadRounded from '@mui/icons-material/DownloadRounded';
import IosShareRounded from '@mui/icons-material/IosShareRounded';
import MoreHorizRounded from '@mui/icons-material/MoreHorizRounded';
import QrCode2Rounded from '@mui/icons-material/QrCode2Rounded';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import { publicProfileApi } from '../../api/publicProfile.api';
import ProfileLandingCard from '../../components/PublicProfile/ProfileLandingCard';
import ProfileShareCenter, { type ProfileShareMode } from '../../components/PublicProfile/ProfileShareCenter';
import type { ProfileEventType, PublicProfileLanding } from '../../types/publicProfile.types';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';

const PublicProfilePage = () => {
  const { slug = '' } = useParams();
  const { t } = useUserPreferences();
  const [profile, setProfile] = useState<PublicProfileLanding | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [shareCenterOpen, setShareCenterOpen] = useState(false);
  const [shareCenterMode, setShareCenterMode] = useState<ProfileShareMode>('image');

  const profileUrl = window.location.href;
  const record = (eventType: ProfileEventType, target?: string) =>
    void publicProfileApi.recordEvent(slug, eventType, target);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await publicProfileApi.getPublic(slug);
        setProfile(data);
        const title = data.seoTitle || `${data.displayName} · FollowMee`;
        const descriptionText = data.seoDescription || data.headline || t('profile.public.viewOnFollowMee', { name: data.displayName });
        const image = data.avatarUrl || '';
        document.title = title;
        const setMeta = (selector: string, attribute: 'name' | 'property', key: string, content: string) => {
          let element = document.querySelector<HTMLMetaElement>(selector);
          if (!element) {
            element = document.createElement('meta');
            element.setAttribute(attribute, key);
            document.head.appendChild(element);
          }
          element.content = content;
        };
        setMeta('meta[name="description"]', 'name', 'description', descriptionText);
        setMeta('meta[property="og:title"]', 'property', 'og:title', title);
        setMeta('meta[property="og:description"]', 'property', 'og:description', descriptionText);
        setMeta('meta[property="og:type"]', 'property', 'og:type', 'profile');
        setMeta('meta[property="og:url"]', 'property', 'og:url', window.location.href);
        setMeta('meta[name="twitter:card"]', 'name', 'twitter:card', image ? 'summary_large_image' : 'summary');
        setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', title);
        setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', descriptionText);
        if (image) {
          setMeta('meta[property="og:image"]', 'property', 'og:image', image);
          setMeta('meta[name="twitter:image"]', 'name', 'twitter:image', image);
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : t('profile.public.unavailableText'));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [slug, t]);

  const copy = async () => {
    await navigator.clipboard.writeText(profileUrl);
    record('share', 'copy');
    setNotice(t('profile.public.linkCopied'));
  };

  const share = async () => {
    if (!profile) return;
    try {
      if (navigator.share) {
        await navigator.share({
          title: profile.seoTitle || profile.displayName,
          text: profile.headline || t('profile.public.viewOnFollowMee', { name: profile.displayName }),
          url: profileUrl,
        });
        record('share', 'native');
      } else {
        await copy();
      }
    } catch (shareError) {
      if ((shareError as Error).name !== 'AbortError') await copy();
    }
  };

  const openShareCenter = (mode: ProfileShareMode) => {
    setMenuAnchor(null);
    setShareCenterMode(mode);
    setShareCenterOpen(true);
  };

  if (loading) {
    return (
      <Box minHeight="100svh" display="grid" sx={{ placeItems: 'center', bgcolor: '#F4F7F4' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!profile) {
    return (
      <Box minHeight="100svh" display="grid" sx={{ placeItems: 'center', p: 3, bgcolor: '#F4F7F4' }}>
        <Alert severity="info">
          <Typography variant="h6">{t('profile.public.unavailableTitle')}</Typography>
          {error || t('profile.public.unavailableText')}
        </Alert>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100svh',
        bgcolor: 'background.default',
        px: { xs: 0, sm: 2 },
        py: { xs: 0, sm: 3 },
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 680, mx: 'auto' }}>
        <ProfileLandingCard profile={profile} onEvent={record} />
      </Box>

      <Stack
        direction="row"
        justifyContent="center"
        spacing={1}
        sx={{
          position: 'sticky',
          bottom: 16,
          width: 'fit-content',
          mx: 'auto',
          mt: 2,
          p: 0.75,
          borderRadius: 999,
          bgcolor: 'rgba(255,255,255,.88)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(30,50,36,.1)',
          boxShadow: '0 12px 34px rgba(22,38,27,.16)',
          zIndex: 3,
        }}
      >
        <Button onClick={() => void share()} startIcon={<IosShareRounded />} sx={{ borderRadius: 999, px: 1.75 }}>
          {t('profile.public.share')}
        </Button>
        <Button
          onClick={() => openShareCenter('image')}
          startIcon={<DownloadRounded />}
          sx={{ borderRadius: 999, px: 1.75 }}
        >
          {t('profile.public.saveImage')}
        </Button>
        <IconButton aria-label={t('profile.public.moreActions')} onClick={(event) => setMenuAnchor(event.currentTarget)}>
          <MoreHorizRounded />
        </IconButton>
      </Stack>

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        <MenuItem onClick={() => { setMenuAnchor(null); void copy(); }}>
          <ListItemIcon><ContentCopyRounded fontSize="small" /></ListItemIcon>
          {t('profile.public.copyLink')}
        </MenuItem>
        <MenuItem onClick={() => openShareCenter('qr')}>
          <ListItemIcon><QrCode2Rounded fontSize="small" /></ListItemIcon>
          {t('profile.public.qrCode')}
        </MenuItem>
      </Menu>

      <ProfileShareCenter
        open={shareCenterOpen}
        onClose={() => setShareCenterOpen(false)}
        profile={profile}
        publicUrl={profileUrl}
        initialMode={shareCenterMode}
        onNotice={setNotice}
        onError={setNotice}
        onEvent={record}
      />

      <Snackbar
        open={Boolean(notice)}
        autoHideDuration={2600}
        onClose={() => setNotice('')}
        message={notice}
      />
    </Box>
  );
};

export default PublicProfilePage;
