import { Card, CardContent, Typography, Box, SxProps, Theme, useTheme } from '@mui/material';
import { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: string;
  icon: ReactNode;
  color?: string;
  background?: string;
  sx?: SxProps<Theme>;
}

const getChangeColor = (change?: string, theme: any = { palette: { success: { main: '#4CAF50' }, error: { main: '#F44336' } } }) => {
  if (!change) return 'text.secondary';
  return change.startsWith('+') ? theme.palette.success.main : theme.palette.error.main;
};

export const StatsCard = ({ 
  title, 
  value, 
  icon, 
  change,
  color = 'primary.main',
  background = 'rgba(108, 99, 255, 0.1)',
  sx = {}
}: StatsCardProps) => {
  const theme = useTheme();
  const changeColor = getChangeColor(change, theme);
  const isPositive = change?.startsWith('+');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{ height: '100%' }}
    >
      <Card 
        elevation={0} 
        sx={{ 
          borderRadius: 3,
          height: '100%',
          background: 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(10px)',
          border: '1px solid',
          borderColor: 'rgba(0, 0, 0, 0.04)',
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
          },
          ...sx 
        }}
      >
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start">
            <Box>
              <Typography 
                variant="subtitle2" 
                color="text.secondary"
                fontWeight={500}
                gutterBottom
                sx={{ opacity: 0.8, fontSize: '0.8rem' }}
              >
                {title}
              </Typography>
              <Box display="flex" alignItems="flex-end" gap={1} mb={1}>
                <Typography variant="h4" component="div" fontWeight={700}>
                  {value}
                </Typography>
                {change && (
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: changeColor,
                      display: 'flex',
                      alignItems: 'center',
                      fontWeight: 600,
                      mb: 0.5
                    }}
                  >
                    {isPositive ? '↑' : '↓'} {change}
                  </Typography>
                )}
              </Box>
            </Box>
            <Box
              sx={{
                p: 1.5,
                borderRadius: 2,
                background: background,
                color: color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 48,
                height: 48,
                boxShadow: `0 4px 12px ${color}20`
              }}
            >
              {icon}
            </Box>
          </Box>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default StatsCard;
