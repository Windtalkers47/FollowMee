import type { ReactNode } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import InboxOutlined from '@mui/icons-material/InboxOutlined';
import Refresh from '@mui/icons-material/Refresh';

export function PageShell({ children, maxWidth = 1200, sx }: { children: ReactNode; maxWidth?: number | string; sx?: SxProps<Theme> }) {
  return <Box sx={[{ width: '100%', maxWidth, mx: 'auto', px: { xs: 1.5, sm: 3 }, py: { xs: 2, md: 4 }, pb: { xs: 'calc(88px + env(safe-area-inset-bottom, 0px))', md: 4 } }, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}>{children}</Box>;
}

export function PageHeader({ title, subtitle, eyebrow, actions }: { title: ReactNode; subtitle?: ReactNode; eyebrow?: ReactNode; actions?: ReactNode }) {
  return <Stack component="header" direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={2} mb={3}>
    <Box minWidth={0}>
      {eyebrow && <Typography variant="overline" color="primary.main" fontWeight={800}>{eyebrow}</Typography>}
      <Typography variant="h3" component="h1" fontWeight={850}>{title}</Typography>
      {subtitle && <Typography color="text.secondary" mt={0.5}>{subtitle}</Typography>}
    </Box>
    {actions && <Stack direction="row" gap={1} flexWrap="wrap">{actions}</Stack>}
  </Stack>;
}

export function PageLoading({ rows = 3, label }: { rows?: number; label: string }) {
  return <Stack gap={1.5} role="status" aria-label={label}>
    <Skeleton variant="text" width="42%" height={52} />
    {Array.from({ length: rows }, (_, index) => <Skeleton key={index} variant="rounded" height={index === 0 ? 132 : 84} />)}
  </Stack>;
}

export function PageError({ title, message, retryLabel, onRetry }: { title: ReactNode; message?: ReactNode; retryLabel: string; onRetry: () => void }) {
  return <Alert severity="error" variant="outlined" action={<Button color="inherit" startIcon={<Refresh />} onClick={onRetry}>{retryLabel}</Button>}>
    <Typography fontWeight={800}>{title}</Typography>
    {message && <Typography variant="body2">{message}</Typography>}
  </Alert>;
}

export function PageEmpty({ title, message, action }: { title: ReactNode; message?: ReactNode; action?: ReactNode }) {
  return <Card variant="outlined" sx={{ borderRadius: 3, boxShadow: 'none' }}>
    <CardContent sx={{ py: 7, textAlign: 'center' }}>
      <InboxOutlined sx={{ fontSize: 44, color: 'text.disabled', mb: 1 }} />
      <Typography variant="h6" fontWeight={800}>{title}</Typography>
      {message && <Typography color="text.secondary" mt={0.5}>{message}</Typography>}
      {action && <Box mt={2}>{action}</Box>}
    </CardContent>
  </Card>;
}

export function PageActionBar({ children }: { children: ReactNode }) {
  return <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap" sx={{ position: 'sticky', zIndex: theme => theme.zIndex.appBar - 1, bottom: { xs: 'calc(72px + env(safe-area-inset-bottom, 0px))', md: 16 }, p: 1.25, border: '1px solid', borderColor: 'divider', borderRadius: 3, bgcolor: 'background.paper', boxShadow: 3 }}>{children}</Stack>;
}
