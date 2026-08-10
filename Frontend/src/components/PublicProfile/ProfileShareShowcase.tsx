import { forwardRef, useEffect, useRef, useState, type PointerEvent } from 'react';
import { Box, useMediaQuery } from '@mui/material';
import type { PublicProfileRecord } from '../../types/publicProfile.types';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import ProfileLandingCard from './ProfileLandingCard';

export type ProfileShareFormat = 'square' | 'story' | 'landscape';
export type ProfileShareStyle = 'phone' | 'clean';

const dimensions = {
  square: { width: 540, height: 540, phoneWidth: 270, phoneHeight: 500, scale: .6 },
  story: { width: 540, height: 960, phoneWidth: 360, phoneHeight: 740, scale: .80 },
  landscape: { width: 800, height: 450, phoneWidth: 230, phoneHeight: 410, scale: .50 },
} as const;

interface Props {
  profile: PublicProfileRecord;
  format: ProfileShareFormat;
  style: ProfileShareStyle;
  exporting?: boolean;
}

const ProfileShareShowcase = forwardRef<HTMLDivElement, Props>(function ProfileShareShowcase({ profile, format, style, exporting = false }, ref) {
  const { profileCardMotion } = useUserPreferences();
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const finePointer = useMediaQuery('(pointer: fine)');
  const frame = dimensions[format];
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const raf = useRef<number | null>(null);
  const canTilt = style === 'phone' && finePointer && !reduceMotion && profileCardMotion !== 'off' && !exporting;

  useEffect(() => () => { if (raf.current) cancelAnimationFrame(raf.current); }, []);
  const move = (event: PointerEvent<HTMLDivElement>) => {
    if (!canTilt) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const next = { x: ((event.clientY - rect.top) / rect.height - .5) * -4, y: ((event.clientX - rect.left) / rect.width - .5) * 4 };
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => setTilt(next));
  };

  return <Box ref={ref} data-testid={`profile-showcase-${format}-${style}`} sx={{ width: frame.width, height: frame.height, position: 'relative', overflow: 'hidden', display: 'grid', placeItems: 'center', background: `radial-gradient(circle at 18% 14%, ${profile.themeConfig?.accentColor || '#8f6da1'}66, transparent 31%), radial-gradient(circle at 82% 84%, rgba(255,255,255,.7), transparent 28%), linear-gradient(145deg,#ddd0e9,#f7f2fa 48%,#c9b1dc)`, isolation: 'isolate' }}>
    <Box aria-hidden sx={{ position: 'absolute', inset: '8%', border: '1px solid rgba(255,255,255,.64)', borderRadius: 8, boxShadow: 'inset 0 0 60px rgba(255,255,255,.28)' }} />
    <Box
      onPointerMove={move}
      onPointerLeave={() => setTilt({ x: 0, y: 0 })}
      sx={style === 'phone' ? {
        width: frame.phoneWidth,
        height: frame.phoneHeight,
        p: format === 'landscape' ? '10px 7px' : '14px 9px',
        boxSizing: 'border-box',
        borderRadius: format === 'landscape' ? 34 : 42,
        background: 'linear-gradient(135deg,#fff 0%,#cfcbd2 38%,#fff 62%,#aaa6ae 100%)',
        boxShadow: '0 36px 65px rgba(46,29,55,.34), inset 0 0 0 2px rgba(255,255,255,.9), inset 0 0 0 5px rgba(35,31,38,.15)',
        transform: `perspective(900px) rotateX(${exporting ? 0 : tilt.x}deg) rotateY(${exporting ? 0 : tilt.y}deg)`,
        transformStyle: 'preserve-3d',
        transition: 'transform 150ms ease-out',
        position: 'relative',
        '&::before': { content: '""', position: 'absolute', top: format === 'landscape' ? 17 : 19, left: '50%', transform: 'translateX(-50%)', width: format === 'landscape' ? 44 : 66, height: 7, borderRadius: 99, bgcolor: '#222126', zIndex: 5 },
        '&::after': { content: '""', position: 'absolute', inset: 0, borderRadius: 'inherit', background: 'linear-gradient(115deg,transparent 22%,rgba(255,255,255,.42) 43%,transparent 58%)', pointerEvents: 'none', zIndex: 6 },
        '@media (pointer: coarse), (prefers-reduced-motion: reduce)': { transform: 'none', transition: 'none' },
      } : { width: frame.width * .86, height: frame.height * .86, borderRadius: 36, overflow: 'hidden', boxShadow: '0 28px 60px rgba(46,29,55,.25)', position: 'relative' }}
    >
      <Box sx={{ width: '100%', height: '100%', overflow: 'hidden', borderRadius: style === 'phone' ? (format === 'landscape' ? 27 : 34) : 36, bgcolor: 'background.paper', position: 'relative' }}>
        <Box sx={{ width: 430, transformOrigin: 'top left', transform: style === 'phone' ? `scale(${frame.scale})` : `scale(${Math.min(frame.width * .86 / 430, frame.height * .86 / 690)})` }}>
          <ProfileLandingCard profile={profile} preview disableMotion />
        </Box>
      </Box>
    </Box>
  </Box>;
});

export default ProfileShareShowcase;
