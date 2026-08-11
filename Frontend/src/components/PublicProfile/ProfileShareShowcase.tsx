import { forwardRef } from 'react';
import { Avatar, Box, Stack, Typography } from '@mui/material';
import type { ProfilePresentationSource } from './profilePresentation';
import {
  getProfileInitials,
  getProfilePresentation,
  resolveProfileAppearance,
} from './profilePresentation';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import { profileShareDimensions, type ProfileShareFormat } from './profileShareOptions';

export type { ProfileShareFormat } from './profileShareOptions';

interface Props {
  profile: ProfilePresentationSource;
  format: ProfileShareFormat;
}

const nameSize = (name: string, format: ProfileShareFormat) => {
  const length = Array.from(name).length;
  if (format === 'story') return length > 28 ? 38 : length > 18 ? 44 : 50;
  if (format === 'landscape') return length > 28 ? 32 : length > 18 ? 37 : 43;
  return length > 28 ? 31 : length > 18 ? 36 : 42;
};

const actionSize = (label: string, format: ProfileShareFormat) => {
  const length = Array.from(label).length;
  if (format === 'story') return length > 34 ? 14 : length > 22 ? 15 : 17;
  return length > 28 ? 12 : length > 18 ? 13 : 15;
};

const ProfileShareShowcase = forwardRef<HTMLDivElement, Props>(function ProfileShareShowcase({ profile, format }, ref) {
  const { t } = useUserPreferences();
  const frame = profileShareDimensions[format];
  const appearance = resolveProfileAppearance(profile);
  const presentation = getProfilePresentation(profile);
  const landscape = format === 'landscape';
  const story = format === 'story';
  const actions = [presentation.primaryAction, ...presentation.links].filter(Boolean) as Array<{
    key: string;
    label: string;
    primary: boolean;
  }>;

  const identity = (
    <Stack
      data-testid="share-identity"
      alignItems={landscape ? 'flex-start' : 'center'}
      textAlign={landscape ? 'left' : 'center'}
      spacing={story ? 2.5 : 1.75}
      sx={{ minWidth: 0, width: '100%' }}
    >
      <Box sx={{ position: 'relative' }}>
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            inset: story ? -14 : -11,
            borderRadius: '40% 60% 48% 52%',
            bgcolor: appearance.accent,
            opacity: 0.18,
            transform: 'rotate(-8deg)',
          }}
        />
        <Avatar
          src={presentation.avatarUrl || undefined}
          alt={presentation.displayName}
          imgProps={{ crossOrigin: 'anonymous' }}
          sx={{
            width: story ? 132 : landscape ? 104 : 100,
            height: story ? 132 : landscape ? 104 : 100,
            fontSize: story ? 42 : 34,
            fontWeight: 850,
            bgcolor: appearance.surface,
            color: appearance.text,
            border: '4px solid rgba(255,255,255,.78)',
            boxShadow: '0 16px 38px rgba(16,20,17,.2)',
            '& img': presentation.imageCrop ? {
              transform: `translate(${presentation.imageCrop.x * 50}%, ${presentation.imageCrop.y * 50}%) scale(${presentation.imageCrop.zoom}) rotate(${presentation.imageCrop.rotation}deg)`,
            } : undefined,
          }}
        >
          {getProfileInitials(presentation.displayName)}
        </Avatar>
      </Box>

      <Box minWidth={0} width="100%">
        <Typography
          component="h1"
          sx={{
            color: appearance.text,
            fontSize: nameSize(presentation.displayName, format),
            lineHeight: 1.06,
            fontWeight: 900,
            letterSpacing: '-.04em',
            overflowWrap: 'anywhere',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {presentation.displayName}
        </Typography>
        {presentation.summary && (
          <Typography
            sx={{
              mt: story ? 1.5 : 1,
              mx: landscape ? 0 : 'auto',
              maxWidth: story ? 400 : landscape ? 300 : 410,
              color: appearance.muted,
              fontSize: story ? 19 : 16,
              lineHeight: 1.45,
              display: '-webkit-box',
              WebkitLineClamp: story ? 3 : 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              overflowWrap: 'anywhere',
            }}
          >
            {presentation.summary}
          </Typography>
        )}
      </Box>
    </Stack>
  );

  const actionList = actions.length > 0 && (
    <Box
      data-testid="share-actions"
      sx={{
        width: '100%',
        maxWidth: story ? 404 : 'none',
        mx: story ? 'auto' : 0,
        display: 'grid',
        gridTemplateColumns: story ? '1fr' : 'repeat(2, minmax(0, 1fr))',
        gap: story ? 1.4 : 1,
      }}
    >
      {actions.map((action, index) => (
        <Box
          key={action.key}
          data-testid={action.primary ? 'share-primary-action' : 'share-link-action'}
          sx={{
            minWidth: 0,
            minHeight: story ? 56 : landscape ? 48 : 46,
            px: story ? 3 : 1.75,
            py: 0.75,
            gridColumn: action.primary && !story ? '1 / -1' : undefined,
            display: 'flex',
            alignItems: 'center',
            justifyContent: story ? 'flex-start' : 'center',
            borderRadius: `${Math.min(appearance.radius, 24)}px`,
            bgcolor: action.primary ? appearance.accent : appearance.surface,
            color: action.primary ? appearance.accentText : appearance.text,
            border: action.primary ? '1px solid transparent' : '1px solid rgba(255,255,255,.38)',
            boxShadow: action.primary ? '0 10px 24px rgba(15,20,16,.14)' : '0 6px 18px rgba(15,20,16,.06)',
          }}
        >
          <Typography
            data-action-index={index}
            sx={{
              fontSize: actionSize(action.label, format),
              lineHeight: 1.18,
              fontWeight: 780,
              textAlign: story ? 'left' : 'center',
              overflowWrap: 'anywhere',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {action.label}
          </Typography>
        </Box>
      ))}
    </Box>
  );

  return (
    <Box
      ref={ref}
      data-testid={`profile-showcase-${format}`}
      data-layout={format}
      data-template={profile.templateKey}
      data-background={appearance.background}
      data-text-color={appearance.text}
      data-accent-color={appearance.accent}
      sx={{
        width: frame.width,
        height: frame.height,
        boxSizing: 'border-box',
        position: 'relative',
        overflow: 'hidden',
        isolation: 'isolate',
        color: appearance.text,
        background: appearance.background,
        fontFamily: appearance.fontFamily,
        p: landscape ? '36px 42px 28px' : story ? '58px 48px 38px' : '36px 38px 26px',
        display: 'grid',
        gridTemplateRows: 'minmax(0, 1fr) auto',
        gap: story ? '30px' : '18px',
        '&::before': {
          content: '""',
          position: 'absolute',
          width: story ? 310 : 220,
          height: story ? 310 : 220,
          right: story ? -120 : -85,
          top: story ? -120 : -90,
          borderRadius: '50%',
          bgcolor: appearance.accent,
          opacity: 0.13,
          zIndex: -1,
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          width: story ? 230 : 170,
          height: story ? 230 : 170,
          left: story ? -105 : -80,
          bottom: story ? -100 : -82,
          borderRadius: '42% 58% 62% 38%',
          bgcolor: appearance.accent,
          opacity: 0.09,
          transform: 'rotate(18deg)',
          zIndex: -1,
        },
      }}
    >
      <Box
        data-testid="share-content"
        sx={{
          minHeight: 0,
          display: landscape ? 'grid' : 'flex',
          gridTemplateColumns: landscape ? 'minmax(0, .9fr) minmax(320px, 1.1fr)' : undefined,
          flexDirection: landscape ? undefined : 'column',
          alignItems: landscape ? 'center' : 'stretch',
          justifyContent: landscape ? undefined : 'center',
          gap: landscape ? '38px' : story ? '38px' : '24px',
        }}
      >
        {identity}
        {actionList}
      </Box>

      <Typography
        data-testid="share-brand-footer"
        variant="caption"
        sx={{
          textAlign: landscape ? 'left' : 'center',
          color: appearance.muted,
          fontSize: story ? 13 : 11,
          lineHeight: 1.2,
          fontWeight: 750,
          letterSpacing: '.08em',
        }}
      >
        {t('profile.public.madeWith')}
      </Typography>
    </Box>
  );
});

export default ProfileShareShowcase;
