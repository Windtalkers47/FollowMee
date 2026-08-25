import type { ReactNode } from 'react';
import { Box, Card, CardContent, Typography } from '@mui/material';
import { TrendingDown, TrendingUp } from '@mui/icons-material';
import { styled } from '@mui/material/styles';

export function CustomerStatCard({
  title,
  value,
  subtitle,
  icon,
  iconBg,
  iconColor,
  trend,
}: {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: ReactNode;
  iconBg: string;
  iconColor: string;
  trend?: { value: number; direction: 'up' | 'down' };
}) {
  return <Card variant="outlined" sx={{ borderRadius: 3, p: { xs: 1.5, md: 3 }, boxShadow: 'none' }}>
    <CardContent sx={{ p: '0 !important' }}>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
        <Box minWidth={0}>
          <Typography variant="body2" color="text.secondary" fontWeight={500} gutterBottom>{title}</Typography>
          <Typography variant="h3" fontWeight={700} sx={{ fontSize: { xs: '1.75rem', md: '2.25rem' } }}>{value}</Typography>
          {subtitle && <Box display="flex" alignItems="center" gap={0.5} mt={1}>
            {trend && (trend.direction === 'up'
              ? <TrendingUp fontSize="small" sx={{ color: 'success.main', fontSize: 16 }} />
              : <TrendingDown fontSize="small" sx={{ color: 'error.main', fontSize: 16 }} />)}
            <Typography variant="caption" color={trend?.direction === 'up' ? 'success.main' : 'text.secondary'} fontWeight={500}>{subtitle}</Typography>
          </Box>}
        </Box>
        <Box sx={{ width: { xs: 42, sm: 52, md: 64 }, height: { xs: 42, sm: 52, md: 64 }, flex: '0 0 auto', borderRadius: '50%', background: iconBg, display: 'grid', placeItems: 'center', color: iconColor }}>{icon}</Box>
      </Box>
    </CardContent>
  </Card>;
}

export const CustomerEngagementMeter = styled('div', {
  shouldForwardProp: prop => prop !== 'value',
})<{ value: number }>(({ value, theme }) => ({
  height: 6,
  borderRadius: 3,
  background: `linear-gradient(90deg, ${value > 70 ? theme.palette.success.main : value > 40 ? theme.palette.warning.main : theme.palette.error.main} 0%, ${value > 70 ? theme.palette.success.light : value > 40 ? theme.palette.warning.light : theme.palette.error.light} ${value}%, rgba(0,0,0,0.08) ${value}%)`,
  width: '100%',
  marginTop: 6,
}));
