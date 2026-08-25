import type { ReactNode } from 'react';
import { Box, Stack, Typography } from '@mui/material';

export default function DashboardInsightsSection({ title, subtitle, children }: { title: ReactNode; subtitle: ReactNode; children: ReactNode }) {
  return <Box component="section" aria-labelledby="dashboard-insights-title">
    <Stack mb={2} gap={0.25}><Typography id="dashboard-insights-title" variant="h5" fontWeight={850}>{title}</Typography><Typography color="text.secondary">{subtitle}</Typography></Stack>
    {children}
  </Box>;
}
