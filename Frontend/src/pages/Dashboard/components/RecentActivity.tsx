import { Box, Typography, List, ListItem, ListItemAvatar, Avatar, ListItemText, Divider, Skeleton } from '@mui/material';
import { ReactNode } from 'react';

export interface ActivityItem {
  id: string | number;
  avatar?: string | ReactNode;
  title: string;
  description: string;
  time: string;
  color?: string;
}

interface RecentActivityProps {
  activities: ActivityItem[];
  loading?: boolean;
  title?: string;
  maxItems?: number;
}

export const RecentActivity = ({
  activities = [],
  loading = false,
  title = 'Recent Activity',
  maxItems = 5,
}: RecentActivityProps) => {
  const displayedActivities = activities.slice(0, maxItems);

  if (loading) {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        <Box>
          {[...Array(3)].map((_, index) => (
            <Box key={index} mb={2}>
              <Box display="flex" alignItems="center" gap={2}>
                <Skeleton variant="circular" width={40} height={40} />
                <Box flexGrow={1}>
                  <Skeleton width="60%" height={24} />
                  <Skeleton width="80%" height={20} />
                </Box>
              </Box>
              {index < 2 && <Divider sx={{ my: 2 }} />}
            </Box>
          ))}
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      <List disablePadding>
        {displayedActivities.map((activity, index) => (
          <Box key={activity.id}>
            <ListItem alignItems="flex-start" disableGutters disablePadding>
              <ListItemAvatar>
                {typeof activity.avatar === 'string' ? (
                  <Avatar 
                    alt={activity.title} 
                    src={activity.avatar} 
                    sx={{ bgcolor: activity.color || 'primary.main' }}
                  />
                ) : (
                  <Avatar sx={{ bgcolor: activity.color || 'primary.main' }}>
                    {activity.avatar}
                  </Avatar>
                )}
              </ListItemAvatar>
              <ListItemText
                primary={activity.title}
                secondary={
                  <>
                    <Typography
                      component="span"
                      variant="body2"
                      color="text.primary"
                      display="block"
                      mb={0.5}
                    >
                      {activity.description}
                    </Typography>
                    <Typography
                      component="span"
                      variant="caption"
                      color="text.secondary"
                    >
                      {activity.time}
                    </Typography>
                  </>
                }
                primaryTypographyProps={{
                  fontWeight: 'medium',
                }}
              />
            </ListItem>
            {index < displayedActivities.length - 1 && <Divider variant="inset" component="li" />}
          </Box>
        ))}
        {activities.length === 0 && (
          <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>
            No recent activities
          </Typography>
        )}
      </List>
    </Box>
  );
};

export default RecentActivity;
