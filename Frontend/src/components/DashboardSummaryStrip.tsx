import type { ReactNode } from 'react';
import { Box, Card, Stack, Typography } from '@mui/material';

export type DashboardSummaryItem = {
  title: ReactNode;
  value: ReactNode;
  detail?: ReactNode;
  icon: ReactNode;
  color: string;
};

export default function DashboardSummaryStrip({ items }: { items: DashboardSummaryItem[] }) {
  return <Card variant="outlined" sx={{ mb: 4, borderRadius: 3, boxShadow: 'none', overflow: 'hidden' }}>
    <Box component="dl" sx={{ m: 0, display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' } }}>
      {items.map((item, index) => <Stack component="div" key={index} gap={0.5} sx={{ minWidth: 0, p: { xs: 1.5, sm: 2 }, borderRight: { xs: index % 2 === 0 ? '1px solid' : 0, lg: index < items.length - 1 ? '1px solid' : 0 }, borderBottom: { xs: index < 2 ? '1px solid' : 0, lg: 0 }, borderColor: 'divider' }}>
        <Stack direction="row" alignItems="center" gap={1} color={item.color}>{item.icon}<Typography component="dt" variant="caption" color="text.secondary" fontWeight={700} noWrap>{item.title}</Typography></Stack>
        <Typography component="dd" variant="h5" fontWeight={850} sx={{ m: 0 }}>{item.value}</Typography>
        {item.detail && <Typography variant="caption" color="text.secondary" noWrap>{item.detail}</Typography>}
      </Stack>)}
    </Box>
  </Card>;
}
