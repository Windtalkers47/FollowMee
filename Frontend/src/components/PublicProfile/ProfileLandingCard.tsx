import { useState, type MouseEvent } from 'react';
import {
  Avatar,
  Box,
  Button,
  Chip,
  Link,
  Stack,
  Typography,
} from '@mui/material';
import {
  AlternateEmailRounded,
  FacebookRounded,
  Instagram,
  LanguageRounded,
  LocationOnRounded,
  MailOutlineRounded,
  MusicNoteRounded,
  PhoneIphoneRounded,
  SendRounded,
} from '@mui/icons-material';
import type {
  ProfileEventType,
  PublicProfileLanding,
  PublicProfileRecord,
} from '../../types/publicProfile.types';
import { getProfileTemplate } from '../../styles/publicProfileTemplates';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';

type LandingCardProfile = PublicProfileLanding | PublicProfileRecord;

interface ProfileLandingCardProps {
  profile: LandingCardProfile;
  preview?: boolean;
  onEvent?: (eventType: ProfileEventType, target?: string) => void;
  disableMotion?: boolean;
}

const platformIcon = (platform: string) => {
  const key = platform.toLowerCase();
  if (key === 'facebook') return <FacebookRounded />;
  if (key === 'instagram') return <Instagram />;
  if (key === 'tiktok') return <MusicNoteRounded />;
  if (key === 'line') return <SendRounded />;
  if (key === 'x' || key === 'twitter') return <AlternateEmailRounded />;
  return <LanguageRounded />;
};

const getContact = (profile: LandingCardProfile) => {
  if ('email' in profile) {
    return { email: profile.email, phone: profile.phone, address: profile.address };
  }
  return {
    email: profile.showEmail ? profile.customer?.customerEmail : null,
    phone: profile.showPhone ? profile.customer?.customerPhone1 : null,
    address: profile.showAddress ? profile.customer?.customerAddress : null,
  };
};

const ProfileLandingCard = ({
  profile,
  preview = false,
  onEvent,
  disableMotion = false,
}: ProfileLandingCardProps) => {
  const { t, profileCardMotion } = useUserPreferences();
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const preset = getProfileTemplate(profile.templateKey);
  const colors = {
    background: profile.themeConfig?.backgroundColor || preset.background,
    surface: profile.themeConfig?.surfaceColor || preset.surface,
    text: profile.themeConfig?.textColor || preset.text,
    accent: profile.themeConfig?.accentColor || preset.accent,
  };
  const contact = getContact(profile);

  const track =
    (eventType: ProfileEventType, target?: string) =>
    (event: MouseEvent<HTMLElement>) => {
      if (preview) event.preventDefault();
      onEvent?.(eventType, target);
    };

  return (
    <Box
      onPointerMove={(event) => {
        if (!preview || disableMotion || profileCardMotion === 'off' || event.pointerType === 'touch' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const rect = event.currentTarget.getBoundingClientRect();
        const strength = profileCardMotion === 'full' ? 10 : 5;
        setTilt({ x: ((event.clientY - rect.top) / rect.height - .5) * -strength, y: ((event.clientX - rect.left) / rect.width - .5) * strength });
      }}
      onPointerLeave={() => setTilt({ x: 0, y: 0 })}
      sx={{
        width: '100%',
        minHeight: { xs: 620, sm: 690 },
        p: { xs: 2, sm: 3 },
        borderRadius: { xs: 0, sm: `${preset.radius + 8}px` },
        background: colors.background,
        color: colors.text,
        position: 'relative',
        overflow: 'hidden',
        isolation: 'isolate',
        transform: preview && !disableMotion ? `perspective(1200px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` : 'none',
        transformStyle: 'preserve-3d',
        transition: 'transform 180ms ease, box-shadow 180ms ease',
        '@media (pointer: coarse), (prefers-reduced-motion: reduce)': { transform: 'none !important', transition: 'none' },
        boxShadow: { xs: 'none', sm: '0 30px 80px rgba(18, 31, 22, .18)' },
        '&::before': {
          content: '""',
          position: 'absolute',
          width: 260,
          height: 260,
          right: -90,
          top: -100,
          borderRadius: '50%',
          background: colors.accent,
          opacity: 0.13,
          filter: 'blur(2px)',
          zIndex: -1,
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          width: 190,
          height: 190,
          left: -90,
          bottom: -80,
          borderRadius: '42% 58% 62% 38%',
          background: colors.accent,
          opacity: 0.09,
          transform: 'rotate(18deg)',
          zIndex: -1,
        },
      }}
    >
      <Stack alignItems="center" spacing={2.25} sx={{ maxWidth: 520, mx: 'auto' }}>
        {preview && (
          <Chip
            label={t('profile.preview.live')}
            size="small"
            sx={{ alignSelf: 'flex-end', bgcolor: colors.surface, color: colors.text }}
          />
        )}

        <Box sx={{ position: 'relative', mt: { xs: 2, sm: 4 } }}>
          <Box
            sx={{
              position: 'absolute',
              inset: -14,
              borderRadius: '38% 62% 48% 52%',
              bgcolor: colors.accent,
              opacity: 0.16,
              transform: 'rotate(-8deg)',
            }}
          />
          <Avatar
            src={profile.avatarUrl || undefined}
            alt={profile.displayName}
            imgProps={{ crossOrigin: 'anonymous' }}
            sx={{
              width: { xs: 116, sm: 136 },
              height: { xs: 116, sm: 136 },
              fontSize: 44,
              fontWeight: 800,
              bgcolor: colors.surface,
              color: colors.text,
              border: '4px solid rgba(255,255,255,.78)',
              boxShadow: '0 18px 42px rgba(25, 38, 28, .22)',
              '& img': profile.imageCrop ? {
                transform: `translate(${profile.imageCrop.x * 50}%, ${profile.imageCrop.y * 50}%) scale(${profile.imageCrop.zoom}) rotate(${profile.imageCrop.rotation}deg)`,
              } : undefined,
            }}
          >
            {profile.displayName.slice(0, 2).toUpperCase()}
          </Avatar>
        </Box>

        <Box textAlign="center">
          <Typography
            component="h1"
            sx={{
              fontSize: { xs: '2rem', sm: '2.55rem' },
              lineHeight: 1.08,
              fontWeight: 850,
              letterSpacing: '-.045em',
            }}
          >
            {profile.displayName}
          </Typography>
          {profile.headline && (
            <Typography sx={{ mt: 1, fontSize: { xs: '1rem', sm: '1.1rem' }, opacity: 0.72 }}>
              {profile.headline}
            </Typography>
          )}
        </Box>

        {profile.bio && (
          <Typography
            textAlign="center"
            sx={{ maxWidth: 440, lineHeight: 1.7, opacity: 0.78, whiteSpace: 'pre-line' }}
          >
            {profile.bio}
          </Typography>
        )}

        {(profile.primaryCtaLabel || profile.secondaryCtaLabel) && (
          <Stack width="100%" spacing={1.25}>
            {profile.primaryCtaLabel && profile.primaryCtaUrl && (
              <Button
                component="a"
                href={profile.primaryCtaUrl}
                target="_blank"
                rel="noreferrer"
                onClick={track('cta_click', 'primary')}
                variant="contained"
                size="large"
                sx={{
                  minHeight: 54,
                  borderRadius: 999,
                  bgcolor: colors.accent,
                  color: preset.accentText,
                  boxShadow: `0 13px 28px color-mix(in srgb, ${colors.accent} 28%, transparent)`,
                  '&:hover': { bgcolor: colors.accent, filter: 'brightness(.94)' },
                }}
              >
                {profile.primaryCtaLabel}
              </Button>
            )}
            {profile.secondaryCtaLabel && profile.secondaryCtaUrl && (
              <Button
                component="a"
                href={profile.secondaryCtaUrl}
                target="_blank"
                rel="noreferrer"
                onClick={track('cta_click', 'secondary')}
                variant="outlined"
                size="large"
                sx={{
                  minHeight: 50,
                  borderRadius: 999,
                  borderColor: 'rgba(90,100,94,.24)',
                  color: colors.text,
                  bgcolor: colors.surface,
                }}
              >
                {profile.secondaryCtaLabel}
              </Button>
            )}
          </Stack>
        )}

        {profile.links.length > 0 && (
          <Box
            sx={{
              width: '100%',
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
              gap: 1,
            }}
          >
            {profile.links
              .filter((link) => link.isVisible !== false)
              .map((link) => (
                <Button
                  key={link.linkId || `${link.platform}-${link.sortOrder}`}
                  component="a"
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={track('link_click', link.label)}
                  startIcon={platformIcon(link.platform)}
                  sx={{
                    justifyContent: 'flex-start',
                    minHeight: 50,
                    px: 2,
                    borderRadius: 3,
                    bgcolor: colors.surface,
                    color: colors.text,
                    border: '1px solid rgba(255,255,255,.45)',
                    backdropFilter: 'blur(16px)',
                    boxShadow: '0 8px 24px rgba(35, 48, 39, .08)',
                    '&:hover': { bgcolor: colors.surface, transform: 'translateY(-1px)' },
                  }}
                >
                  {link.label}
                </Button>
              ))}
          </Box>
        )}

        {(contact.email || contact.phone || contact.address) && (
          <Stack
            direction="row"
            useFlexGap
            flexWrap="wrap"
            justifyContent="center"
            spacing={1.5}
            sx={{ opacity: 0.75 }}
          >
            {contact.email && (
              <Link href={`mailto:${contact.email}`} color="inherit" underline="hover">
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <MailOutlineRounded fontSize="small" />
                  <span>{contact.email}</span>
                </Stack>
              </Link>
            )}
            {contact.phone && (
              <Link href={`tel:${contact.phone}`} color="inherit" underline="hover">
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <PhoneIphoneRounded fontSize="small" />
                  <span>{contact.phone}</span>
                </Stack>
              </Link>
            )}
            {contact.address && (
              <Stack direction="row" spacing={0.5} alignItems="center">
                <LocationOnRounded fontSize="small" />
                <span>{contact.address}</span>
              </Stack>
            )}
          </Stack>
        )}

        <Typography variant="caption" sx={{ pt: 2, opacity: 0.48, letterSpacing: '.08em' }}>
          {t('profile.public.madeWith')}
        </Typography>
      </Stack>
    </Box>
  );
};

export default ProfileLandingCard;
