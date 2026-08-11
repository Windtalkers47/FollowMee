import { forwardRef } from 'react';
import { Avatar, Box, Stack, Typography } from '@mui/material';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import {
  getProfileInitials,
  getProfilePresentation,
  resolveProfileAppearance,
  type ProfilePresentationSource,
} from './profilePresentation';
import { profileQrDimensions } from './profileShareOptions';

interface Props {
  profile: ProfilePresentationSource;
  publicUrl: string;
  qrDataUrl: string;
}

const compactUrl = (value: string) => {
  try {
    const url = new URL(value);
    return `${url.host}${url.pathname}`.replace(/\/$/, '');
  } catch {
    return value;
  }
};

const ProfileQrShowcase = forwardRef<HTMLDivElement, Props>(function ProfileQrShowcase({ profile, publicUrl, qrDataUrl }, ref) {
  const { t } = useUserPreferences();
  const appearance = resolveProfileAppearance(profile);
  const presentation = getProfilePresentation(profile);

  return (
    <Box
      ref={ref}
      data-testid="profile-qr-showcase"
      data-template={profile.templateKey}
      sx={{
        width: profileQrDimensions.width,
        height: profileQrDimensions.height,
        boxSizing: 'border-box',
        position: 'relative',
        overflow: 'hidden',
        isolation: 'isolate',
        background: appearance.background,
        color: appearance.text,
        fontFamily: appearance.fontFamily,
        p: '48px 54px 34px',
        display: 'grid',
        gridTemplateRows: 'auto minmax(0, 1fr) auto',
        gap: '24px',
        '&::before': {
          content: '""',
          position: 'absolute',
          width: 280,
          height: 280,
          right: -105,
          top: -120,
          borderRadius: '50%',
          bgcolor: appearance.accent,
          opacity: 0.13,
          zIndex: -1,
        },
      }}
    >
      <Stack direction="row" spacing={2} alignItems="center" minWidth={0}>
        <Avatar
          src={presentation.avatarUrl || undefined}
          alt={presentation.displayName}
          imgProps={{ crossOrigin: 'anonymous' }}
          sx={{
            width: 76,
            height: 76,
            fontSize: 25,
            fontWeight: 850,
            bgcolor: appearance.surface,
            color: appearance.text,
            border: '3px solid rgba(255,255,255,.72)',
            '& img': presentation.imageCrop ? {
              transform: `translate(${presentation.imageCrop.x * 50}%, ${presentation.imageCrop.y * 50}%) scale(${presentation.imageCrop.zoom}) rotate(${presentation.imageCrop.rotation}deg)`,
            } : undefined,
          }}
        >
          {getProfileInitials(presentation.displayName)}
        </Avatar>
        <Box minWidth={0}>
          <Typography
            component="h1"
            sx={{
              fontSize: Array.from(presentation.displayName).length > 26 ? 28 : 34,
              lineHeight: 1.08,
              fontWeight: 900,
              letterSpacing: '-.035em',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              overflowWrap: 'anywhere',
            }}
          >
            {presentation.displayName}
          </Typography>
          <Typography sx={{ mt: 0.5, color: appearance.muted, fontSize: 15 }}>
            {t('profile.shareCenter.qrCardHint')}
          </Typography>
        </Box>
      </Stack>

      <Box display="grid" sx={{ placeItems: 'center' }}>
        <Box
          sx={{
            width: 438,
            height: 438,
            boxSizing: 'border-box',
            p: '24px',
            bgcolor: '#FFFFFF',
            borderRadius: `${Math.min(appearance.radius, 30)}px`,
            boxShadow: '0 22px 56px rgba(10,14,11,.2)',
          }}
        >
          <Box
            component="img"
            src={qrDataUrl}
            alt={t('profile.public.qrAlt', { name: presentation.displayName })}
            sx={{ display: 'block', width: '100%', height: '100%' }}
          />
        </Box>
      </Box>

      <Stack alignItems="center" spacing={0.5} minWidth={0}>
        <Typography
          sx={{
            maxWidth: '100%',
            color: appearance.text,
            fontSize: 16,
            fontWeight: 750,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {compactUrl(publicUrl)}
        </Typography>
        <Typography sx={{ color: appearance.muted, fontSize: 11, fontWeight: 750, letterSpacing: '.08em' }}>
          {t('profile.public.madeWith')}
        </Typography>
      </Stack>
    </Box>
  );
});

export default ProfileQrShowcase;
