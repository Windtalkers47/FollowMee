import { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  IconButton,
  TextField,
  InputAdornment,
  Avatar,
  Chip,
  Divider,
  Tabs,
  Tab,
  useTheme,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  ThumbUp as ThumbUpIcon,
  ChatBubbleOutline as CommentIcon,
  Share as ShareIcon,
  Schedule as ScheduleIcon,
  Public as PublicIcon,
  Facebook as FacebookIcon,
  Twitter as TwitterIcon,
  Instagram as InstagramIcon,
  LinkedIn as LinkedInIcon,
} from '@mui/icons-material';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  };
}

const PostsPage = () => {
  const theme = useTheme();
  const [value, setValue] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  const posts = [
    {
      id: 1,
      platform: 'Instagram',
      content: 'Check out our latest product launch! #NewProduct',
      image: 'https://source.unsplash.com/random/800x600?social',
      date: '2 hours ago',
      likes: 245,
      comments: 32,
      shares: 12,
      scheduled: false,
    },
    {
      id: 2,
      platform: 'Twitter',
      content: 'Exciting news coming soon! Stay tuned for updates. #ComingSoon',
      image: 'https://source.unsplash.com/random/800x600?social',
      date: '5 hours ago',
      likes: 189,
      comments: 24,
      shares: 8,
      scheduled: true,
      scheduledDate: '2023-06-15T14:30:00',
    },
  ];

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'facebook':
        return <FacebookIcon color="primary" />;
      case 'twitter':
        return <TwitterIcon color="info" />;
      case 'instagram':
        return <InstagramIcon color="secondary" />;
      case 'linkedin':
        return <LinkedInIcon color="primary" />;
      default:
        return <PublicIcon />;
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
            Posts
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Manage and schedule your social media posts
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          sx={{ borderRadius: 2, textTransform: 'none', px: 3, py: 1 }}
        >
          Create Post
        </Button>
      </Box>

      <Box sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={value} 
            onChange={handleChange} 
            aria-label="post tabs"
            sx={{
              '& .MuiTabs-indicator': {
                height: 3,
              },
            }}
          >
            <Tab label="Published" {...a11yProps(0)} />
            <Tab label="Scheduled" {...a11yProps(1)} />
            <Tab label="Drafts" {...a11yProps(2)} />
          </Tabs>
        </Box>

        <Box sx={{ my: 3 }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search posts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton edge="end">
                    <FilterListIcon />
                  </IconButton>
                </InputAdornment>
              ),
              sx: {
                borderRadius: 2,
                bgcolor: 'background.paper',
              },
            }}
          />
        </Box>

        <TabPanel value={value} index={0}>
          <Box display="flex" flexDirection="column" gap={3}>
            {posts
              .filter((post) => !post.scheduled)
              .map((post) => (
                <Paper key={post.id} elevation={0} sx={{ p: 3, borderRadius: 3 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Box display="flex" alignItems="center">
                      <Avatar sx={{ bgcolor: 'primary.main', mr: 1.5 }}>
                        {getPlatformIcon(post.platform)}
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle2" fontWeight="medium">
                          {post.platform}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {post.date}
                        </Typography>
                      </Box>
                    </Box>
                    <IconButton size="small">
                      <MoreVertIcon />
                    </IconButton>
                  </Box>
                  
                  <Typography variant="body1" paragraph>
                    {post.content}
                  </Typography>
                  
                  {post.image && (
                    <Box 
                      component="img"
                      src={post.image}
                      alt="Post"
                      sx={{
                        width: '100%',
                        maxHeight: 400,
                        objectFit: 'cover',
                        borderRadius: 2,
                        mb: 2,
                      }}
                    />
                  )}
                  
                  <Box display="flex" justifyContent="space-between" alignItems="center" mt={2}>
                    <Box display="flex" gap={2}>
                      <Chip 
                        icon={<ThumbUpIcon fontSize="small" />} 
                        label={post.likes} 
                        size="small"
                        variant="outlined"
                      />
                      <Chip 
                        icon={<CommentIcon fontSize="small" />} 
                        label={post.comments} 
                        size="small"
                        variant="outlined"
                      />
                      <Chip 
                        icon={<ShareIcon fontSize="small" />} 
                        label={post.shares} 
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                    
                    <Box>
                      <Button 
                        variant="outlined" 
                        size="small" 
                        startIcon={<ScheduleIcon />}
                        sx={{ borderRadius: 2, textTransform: 'none' }}
                      >
                        Schedule Again
                      </Button>
                    </Box>
                  </Box>
                </Paper>
              ))}
          </Box>
        </TabPanel>
        
        <TabPanel value={value} index={1}>
          <Box display="flex" flexDirection="column" gap={3}>
            {posts
              .filter((post) => post.scheduled)
              .map((post) => (
                <Paper 
                  key={`scheduled-${post.id}`} 
                  elevation={0} 
                  sx={{ 
                    p: 3, 
                    borderRadius: 3,
                    borderLeft: `4px solid ${theme.palette.warning.main}`,
                  }}
                >
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Box display="flex" alignItems="center">
                      <Avatar sx={{ bgcolor: 'warning.light', mr: 1.5 }}>
                        <ScheduleIcon color="warning" />
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle2" fontWeight="medium">
                          Scheduled for {new Date(post.scheduledDate || '').toLocaleString()}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {post.platform}
                        </Typography>
                      </Box>
                    </Box>
                    <IconButton size="small">
                      <MoreVertIcon />
                    </IconButton>
                  </Box>
                  
                  <Typography variant="body1" paragraph>
                    {post.content}
                  </Typography>
                  
                  <Box display="flex" justifyContent="flex-end" gap={1} mt={2}>
                    <Button 
                      variant="outlined" 
                      size="small" 
                      color="error"
                      sx={{ borderRadius: 2, textTransform: 'none' }}
                    >
                      Cancel
                    </Button>
                    <Button 
                      variant="contained" 
                      size="small" 
                      color="primary"
                      sx={{ borderRadius: 2, textTransform: 'none' }}
                    >
                      Reschedule
                    </Button>
                  </Box>
                </Paper>
              ))}
          </Box>
        </TabPanel>
        
        <TabPanel value={value} index={2}>
          <Box 
            display="flex" 
            flexDirection="column" 
            alignItems="center" 
            justifyContent="center" 
            minHeight={300}
            textAlign="center"
            p={4}
          >
            <Box 
              sx={{ 
                width: 100, 
                height: 100, 
                borderRadius: '50%', 
                bgcolor: 'action.hover',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 2,
              }}
            >
              <AddIcon color="action" sx={{ fontSize: 40 }} />
            </Box>
            <Typography variant="h6" gutterBottom>
              No drafts yet
            </Typography>
            <Typography variant="body2" color="text.secondary" maxWidth={400} mb={3}>
              Create your first draft and save it for later. Your drafts will appear here.
            </Typography>
            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<AddIcon />}
              sx={{ borderRadius: 2, textTransform: 'none', px: 3, py: 1 }}
            >
              Create Draft
            </Button>
          </Box>
        </TabPanel>
      </Box>
    </Box>
  );
};

export default PostsPage;
