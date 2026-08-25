import type { ReactNode } from 'react';
import { Box, Container, Paper, Typography } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';

export function AuthMotionBoundary({ children, sx }: { children: ReactNode; sx?: SxProps<Theme> }) {
  return <Box data-auth-motion-boundary sx={[
    {
      '@media (prefers-reduced-motion: reduce)': {
        '&, & *, & *::before, & *::after': {
          animationDuration: '0.01ms !important',
          animationIterationCount: '1 !important',
          transitionDuration: '0.01ms !important',
          scrollBehavior: 'auto !important',
        },
        '& [data-auth-shake]': { animation: 'none !important', transform: 'none !important' },
      },
    },
    ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
  ]}>{children}</Box>;
}

export default function AuthShell({ title, subtitle, icon, children, maxWidth = 'xs' }: { title: ReactNode; subtitle?: ReactNode; icon?: ReactNode; children: ReactNode; maxWidth?: 'xs' | 'sm' }) {
  return <AuthMotionBoundary sx={{ minHeight: '100svh', bgcolor: 'background.default', py: { xs: 3, sm: 7 } }}>
    <Container component="main" maxWidth={maxWidth}>
      <Box textAlign="center" mb={3}>
        {icon && <Box sx={{ width: 56, height: 56, borderRadius: 3, bgcolor: 'primary.main', color: 'primary.contrastText', display: 'grid', placeItems: 'center', mx: 'auto', mb: 1.5 }}>{icon}</Box>}
        <Typography component="h1" variant="h5" fontWeight={800}>{title}</Typography>
        {subtitle && <Typography variant="body2" color="text.secondary" mt={0.5}>{subtitle}</Typography>}
      </Box>
      <Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 4 }, width: '100%', borderRadius: 3, boxShadow: 'none' }}>{children}</Paper>
    </Container>
  </AuthMotionBoundary>;
}
