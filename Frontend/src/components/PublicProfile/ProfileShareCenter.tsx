import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import CloseRounded from '@mui/icons-material/CloseRounded';
import ContentCopyRounded from '@mui/icons-material/ContentCopyRounded';
import DownloadRounded from '@mui/icons-material/DownloadRounded';
import IosShareRounded from '@mui/icons-material/IosShareRounded';
import LaunchRounded from '@mui/icons-material/LaunchRounded';
import LinkRounded from '@mui/icons-material/LinkRounded';
import QrCode2Rounded from '@mui/icons-material/QrCode2Rounded';
import ImageRounded from '@mui/icons-material/ImageRounded';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import type { ProfileEventType } from '../../types/publicProfile.types';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import {
  downloadImageBlob,
  renderProfileImage,
  shareImageBlob,
  supportsImageSharing,
} from '../../utils/profileImageExport';
import ProfileShareShowcase from './ProfileShareShowcase';
import ProfileQrShowcase from './ProfileQrShowcase';
import type { ProfilePresentationSource } from './profilePresentation';
import { profileQrDimensions, profileShareDimensions, type ProfileShareFormat } from './profileShareOptions';

export type ProfileShareMode = 'link' | 'qr' | 'image';

const formatLabelKeys = {
  square: 'feature.square',
  story: 'feature.story',
  landscape: 'feature.landscape',
} as const;

interface Props {
  open: boolean;
  onClose: () => void;
  profile: ProfilePresentationSource;
  publicUrl: string;
  initialMode?: ProfileShareMode;
  onNotice?: (message: string) => void;
  onError?: (message: string) => void;
  onEvent?: (eventType: ProfileEventType, target?: string) => void;
}

const ExactSharePreview = ({ profile, format, captureRef }: {
  profile: ProfilePresentationSource;
  format: ProfileShareFormat;
  captureRef: RefObject<HTMLDivElement | null>;
}) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(.5);
  const frame = profileShareDimensions[format];

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const measure = () => setScale(Math.min(host.clientWidth / frame.width, host.clientHeight / frame.height));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    return () => observer.disconnect();
  }, [frame.height, frame.width]);

  return (
    <Box
      ref={hostRef}
      data-testid="exact-share-image-preview"
      data-format={format}
      sx={{
        width: '100%',
        maxWidth: format === 'landscape' ? 680 : format === 'story' ? 260 : 430,
        maxHeight: { xs: 340, sm: 390 },
        aspectRatio: `${frame.width} / ${frame.height}`,
        mx: 'auto',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 3,
        bgcolor: 'action.hover',
      }}
    >
      <Box sx={{ position: 'absolute', left: '50%', top: '50%', width: frame.width, height: frame.height, transform: `translate(-50%, -50%) scale(${scale})` }}>
        <ProfileShareShowcase ref={captureRef} profile={profile} format={format} />
      </Box>
    </Box>
  );
};

const ExactQrPreview = ({ profile, publicUrl, qrDataUrl, captureRef }: {
  profile: ProfilePresentationSource;
  publicUrl: string;
  qrDataUrl: string;
  captureRef: RefObject<HTMLDivElement | null>;
}) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(.5);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const measure = () => setScale(Math.min(
      host.clientWidth / profileQrDimensions.width,
      host.clientHeight / profileQrDimensions.height,
    ));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  return (
    <Box
      ref={hostRef}
      data-testid="exact-qr-preview"
      sx={{
        width: '100%',
        maxWidth: 430,
        aspectRatio: '1',
        mx: 'auto',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 3,
        bgcolor: 'action.hover',
      }}
    >
      <Box sx={{ position: 'absolute', left: '50%', top: '50%', width: profileQrDimensions.width, height: profileQrDimensions.height, transform: `translate(-50%, -50%) scale(${scale})` }}>
        <ProfileQrShowcase ref={captureRef} profile={profile} publicUrl={publicUrl} qrDataUrl={qrDataUrl} />
      </Box>
    </Box>
  );
};

const ProfileShareCenter = ({
  open,
  onClose,
  profile,
  publicUrl,
  initialMode = 'link',
  onNotice,
  onError,
  onEvent,
}: Props) => {
  const { t } = useUserPreferences();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [mode, setMode] = useState<ProfileShareMode>(initialMode);
  const [format, setFormat] = useState<ProfileShareFormat>('square');
  const [qrImage, setQrImage] = useState({ url: '', dataUrl: '' });
  const [working, setWorking] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const qrExportRef = useRef<HTMLDivElement>(null);
  const frame = profileShareDimensions[format];
  const filename = `followmee-${profile.slug}-${format}-clean.png`;
  const canShareFiles = useMemo(() => supportsImageSharing(), []);

  useEffect(() => {
    if (!open || mode !== 'qr' || qrImage.url === publicUrl) return;
    let active = true;
    void import('qrcode').then(({ default: QRCode }) => QRCode.toDataURL(publicUrl, {
      width: 420,
      margin: 4,
      color: { dark: '#111511', light: '#FFFFFF' },
      errorCorrectionLevel: 'H',
    })).then(dataUrl => {
      if (active) {
        setQrImage({ url: publicUrl, dataUrl });
        onEvent?.('qr_open');
      }
    }).catch(() => onError?.(t('profile.shareCenter.qrError')));
    return () => { active = false; };
  }, [mode, onError, onEvent, open, publicUrl, qrImage.url, t]);

  const copyLink = async () => {
    await navigator.clipboard.writeText(publicUrl);
    onEvent?.('share', 'copy');
    onNotice?.(t('profile.public.linkCopied'));
  };

  const shareLink = async () => {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: profile.displayName, url: publicUrl });
        onEvent?.('share', 'native');
        return;
      } catch (shareError) {
        if ((shareError as Error).name === 'AbortError') return;
      }
    }
    await copyLink();
  };

  const renderBlob = async () => {
    if (!exportRef.current) throw new Error('PROFILE_IMAGE_NOT_READY');
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    return renderProfileImage(exportRef.current, { width: frame.width, height: frame.height, pixelRatio: 2 });
  };

  const downloadImage = async () => {
    if (working) return;
    setWorking(true);
    try {
      const result = downloadImageBlob(await renderBlob(), filename);
      onEvent?.('image_export', `${format}:clean`);
      onNotice?.(t(result === 'preview' ? 'profile.shareCenter.safariSaveHelp' : 'profile.public.imageReady'));
    } catch {
      onError?.(t('profile.editor.exportError'));
    } finally {
      setWorking(false);
    }
  };

  const shareImage = async () => {
    if (working) return;
    setWorking(true);
    try {
      await shareImageBlob(await renderBlob(), filename, profile.displayName);
      onEvent?.('share', 'image');
    } catch (shareError) {
      if ((shareError as Error).name !== 'AbortError') onError?.(t('profile.shareCenter.shareImageError'));
    } finally {
      setWorking(false);
    }
  };

  const downloadQr = async () => {
    if (!qrImage.dataUrl || !qrExportRef.current || working) return;
    setWorking(true);
    try {
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      const blob = await renderProfileImage(qrExportRef.current, {
        width: profileQrDimensions.width,
        height: profileQrDimensions.height,
        pixelRatio: 2,
      });
      downloadImageBlob(blob, `${profile.slug}-qr.png`);
    } catch {
      onError?.(t('profile.shareCenter.qrError'));
    } finally {
      setWorking(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={working ? undefined : onClose}
      fullScreen={fullScreen}
      fullWidth
      maxWidth="md"
      PaperProps={{ sx: { width: { sm: 760 }, maxHeight: { sm: '88vh' }, borderRadius: { xs: 0, sm: 4 } } }}
      TransitionProps={{
        onEnter: () => setMode(initialMode),
        onExited: () => setMode(initialMode),
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Box>
          <Typography variant="h5" component="div" fontWeight={850}>{t('profile.shareCenter.title')}</Typography>
          <Typography variant="body2" color="text.secondary">{t('profile.shareCenter.description')}</Typography>
        </Box>
        <IconButton aria-label={t('common.close')} onClick={onClose} disabled={working}><CloseRounded /></IconButton>
      </DialogTitle>

      <Tabs value={mode} onChange={(_, value: ProfileShareMode) => setMode(value)} variant="fullWidth" aria-label={t('profile.shareCenter.modeLabel')} sx={{ px: { xs: 1, sm: 3 }, borderBottom: 1, borderColor: 'divider' }}>
        <Tab value="link" icon={<LinkRounded />} iconPosition="start" label={t('profile.shareCenter.linkMode')} />
        <Tab value="qr" icon={<QrCode2Rounded />} iconPosition="start" label={t('profile.shareCenter.qrMode')} />
        <Tab value="image" icon={<ImageRounded />} iconPosition="start" label={t('profile.shareCenter.imageMode')} />
      </Tabs>

      <DialogContent sx={{ p: { xs: 2, sm: 3 }, overflowX: 'hidden' }}>
        {mode === 'link' && (
          <Stack spacing={2.5} data-testid="share-mode-link">
            <Alert severity="info" icon={false}>{t('profile.shareCenter.linkDescription')}</Alert>
            <TextField label={t('profile.editor.profileUrl')} value={publicUrl} fullWidth InputProps={{ readOnly: true }} />
          </Stack>
        )}

        {mode === 'qr' && (
          <Stack spacing={2} alignItems="center" data-testid="share-mode-qr">
            <Typography color="text.secondary" textAlign="center">{t('profile.shareCenter.qrDescription')}</Typography>
            {!qrImage.dataUrl
              ? <CircularProgress sx={{ my: 8 }} />
              : <ExactQrPreview profile={profile} publicUrl={publicUrl} qrDataUrl={qrImage.dataUrl} captureRef={qrExportRef} />}
          </Stack>
        )}

        {mode === 'image' && (
          <Stack spacing={2} data-testid="share-mode-image">
            <Typography color="text.secondary" textAlign="center">{t('profile.shareCenter.imageDescription')}</Typography>
            <Box>
              <Typography variant="caption" color="text.secondary" display="block" mb={.75} fontWeight={700}>{t('profile.shareCenter.imageSize')}</Typography>
              <ToggleButtonGroup exclusive size="small" value={format} onChange={(_, value) => value && setFormat(value)} aria-label={t('profile.shareCenter.imageSize')} fullWidth>
                <ToggleButton value="square">{t(formatLabelKeys.square)}</ToggleButton>
                <ToggleButton value="story">{t(formatLabelKeys.story)}</ToggleButton>
                <ToggleButton value="landscape">{t(formatLabelKeys.landscape)}</ToggleButton>
              </ToggleButtonGroup>
            </Box>
            <ExactSharePreview profile={profile} format={format} captureRef={exportRef} />
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ px: { xs: 2, sm: 3 }, py: 2, borderTop: 1, borderColor: 'divider', gap: 1, flexWrap: 'wrap' }}>
        {mode === 'link' && <>
          <Button startIcon={<LaunchRounded />} onClick={() => window.open(publicUrl, '_blank', 'noopener,noreferrer')}>{t('profile.editor.openLive')}</Button>
          <Button startIcon={<IosShareRounded />} onClick={() => void shareLink()}>{t('profile.public.share')}</Button>
          <Button variant="contained" startIcon={<ContentCopyRounded />} onClick={() => void copyLink()}>{t('profile.public.copyLink')}</Button>
        </>}
        {mode === 'qr' && <Button variant="contained" startIcon={<DownloadRounded />} disabled={!qrImage.dataUrl || working} onClick={() => void downloadQr()}>{t('profile.public.downloadQr')}</Button>}
        {mode === 'image' && <>
          {canShareFiles && <Button startIcon={<IosShareRounded />} disabled={working} onClick={() => void shareImage()}>{t('profile.shareCenter.shareImage')}</Button>}
          <Button variant="contained" startIcon={working ? <CircularProgress size={18} color="inherit" /> : <DownloadRounded />} disabled={working} onClick={() => void downloadImage()}>
            {working ? t('profile.editor.exporting') : t('profile.shareCenter.downloadPng')}
          </Button>
        </>}
      </DialogActions>
    </Dialog>
  );
};

export default ProfileShareCenter;
