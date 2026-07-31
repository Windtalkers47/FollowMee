import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  ContentCopyRounded,
  DownloadRounded,
  IosShareRounded,
  QrCode2Rounded,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  IconButton,
  Snackbar,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { toBlob, toPng } from 'html-to-image';
import QRCode from 'qrcode';
import { publicProfileApi } from '../../api/publicProfile.api';
import ProfileLandingCard from '../../components/PublicProfile/ProfileLandingCard';
import type { ProfileEventType, PublicProfileLanding } from '../../types/publicProfile.types';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';

const PublicProfilePage = () => {
  const { slug = '' } = useParams();
  const { t } = useUserPreferences();
  const captureRef = useRef<HTMLDivElement>(null);
  const [profile, setProfile] = useState<PublicProfileLanding | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [working, setWorking] = useState(false);

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
  }, [slug]);

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

  const exportImage = async () => {
    if (!captureRef.current || !profile) return;
    setWorking(true);
    try {
      const blob = await toBlob(captureRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#F4F7F4',
      });
      const canShareFile = blob && typeof navigator.share === 'function' && navigator.canShare?.({
        files: [new File([blob], `${profile.slug}.png`, { type: 'image/png' })],
      });
      if (blob && canShareFile) {
        await navigator.share({
          title: profile.displayName,
          files: [new File([blob], `${profile.slug}.png`, { type: 'image/png' })],
        });
      } else {
        const dataUrl = await toPng(captureRef.current, { cacheBust: true, pixelRatio: 2 });
        const link = document.createElement('a');
        link.download = `${profile.slug}-followmee.png`;
        link.href = dataUrl;
        link.click();
      }
      record('image_export');
      setNotice(t('profile.public.imageReady'));
    } catch (exportError) {
      setNotice(exportError instanceof Error ? exportError.message : t('profile.public.exportError'));
    } finally {
      setWorking(false);
    }
  };

  const openQr = async () => {
    const dataUrl = await QRCode.toDataURL(profileUrl, {
      width: 360,
      margin: 2,
      color: { dark: '#17211A', light: '#FFFFFF' },
      errorCorrectionLevel: 'H',
    });
    setQrDataUrl(dataUrl);
    record('qr_open');
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
      <Box ref={captureRef} sx={{ width: '100%', maxWidth: 680, mx: 'auto' }}>
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
        <Tooltip title={t('profile.public.share')}>
          <IconButton onClick={share} color="primary"><IosShareRounded /></IconButton>
        </Tooltip>
        <Tooltip title={t('profile.public.copyLink')}>
          <IconButton onClick={copy}><ContentCopyRounded /></IconButton>
        </Tooltip>
        <Tooltip title={t('profile.public.saveImage')}>
          <span>
            <IconButton onClick={exportImage} disabled={working}><DownloadRounded /></IconButton>
          </span>
        </Tooltip>
        <Tooltip title={t('profile.public.qrCode')}>
          <IconButton onClick={openQr}><QrCode2Rounded /></IconButton>
        </Tooltip>
      </Stack>

      <Dialog open={Boolean(qrDataUrl)} onClose={() => setQrDataUrl('')} maxWidth="xs" fullWidth>
        <DialogContent sx={{ textAlign: 'center', p: 4 }}>
          <Typography variant="h6" fontWeight={800}>{t('profile.public.scanTitle')}</Typography>
          <Box component="img" src={qrDataUrl} alt={t('profile.public.qrAlt', { name: profile.displayName })} sx={{ width: '100%', mt: 2 }} />
          <Button
            fullWidth
            variant="contained"
            sx={{ mt: 2 }}
            onClick={() => {
              const link = document.createElement('a');
              link.href = qrDataUrl;
              link.download = `${profile.slug}-qr.png`;
              link.click();
            }}
          >
            {t('profile.public.downloadQr')}
          </Button>
        </DialogContent>
      </Dialog>

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
