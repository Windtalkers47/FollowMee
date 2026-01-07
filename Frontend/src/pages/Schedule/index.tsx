import { useState } from 'react';
import type { ReactNode } from 'react';
import { format } from 'date-fns';
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
  Grid,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Publish as PublishIcon,
  CalendarToday as CalendarIcon,
  Schedule as ScheduleIcon,
  MoreTime as MoreTimeIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Facebook as FacebookIcon,
  Twitter as TwitterIcon,
  Instagram as InstagramIcon,
  LinkedIn as LinkedInIcon,
} from '@mui/icons-material';

/* ================== Types ================== */
type TabPanelProps = {
  children: ReactNode;
  index: number;
  value: number;
};

interface ScheduledPost {
  id: number;
  platform: string;
  content: string;
  date: Date;
  status: 'scheduled' | 'published' | 'error';
  platforms: string[];
}

/* ================== TabPanel ================== */
const TabPanel = ({ children, value, index }: TabPanelProps) => (
  <div role="tabpanel" hidden={value !== index}>
    {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
  </div>
);

const a11yProps = (index: number) => ({
  id: `schedule-tab-${index}`,
  'aria-controls': `schedule-tabpanel-${index}`,
});

/* ================== Page ================== */
const SchedulePage = () => {
  const theme = useTheme();
  const [value, setValue] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedPost, setSelectedPost] = useState<number | null>(null);

  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>, id: number) => {
    setAnchorEl(e.currentTarget);
    setSelectedPost(id);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedPost(null);
  };

  /* ================== Mock Data ================== */
  const scheduledPosts: ScheduledPost[] = [
    {
      id: 1,
      platform: 'Instagram',
      content: 'Check out our latest product launch! #NewProduct',
      date: new Date(Date.now() + 86400000 * 2),
      status: 'scheduled',
      platforms: ['instagram', 'facebook'],
    },
  ];

  const pastPosts: ScheduledPost[] = [
    {
      id: 2,
      platform: 'Twitter',
      content: 'Server issue resolved',
      date: new Date(Date.now() - 86400000),
      status: 'published',
      platforms: ['twitter'],
    },
  ];

  const getPlatformIcon = (p: string) =>
    ({
      facebook: <FacebookIcon fontSize="small" />,
      twitter: <TwitterIcon fontSize="small" />,
      instagram: <InstagramIcon fontSize="small" />,
      linkedin: <LinkedInIcon fontSize="small" />,
    }[p]);

  const getRelativeTime = (d: Date) =>
    format(d, 'MMM d, yyyy h:mm a');

  /* ================== Render ================== */
  return (
    <Box sx={{ width: '100%' }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" mb={3}>
        <Typography variant="h4" fontWeight="bold">
          Schedule
        </Typography>
        <Button startIcon={<AddIcon />} variant="contained">
          Schedule Post
        </Button>
      </Box>

      {/* Search + Tabs */}
      <Box sx={{ width: '100%', mb: 3 }}>
        <Tabs value={value} onChange={(_, v) => setValue(v)}>
          <Tab label="Upcoming" {...a11yProps(0)} />
          <Tab label="Past" {...a11yProps(1)} />
        </Tabs>

        <Box sx={{ my: 3 }}>
          <TextField
            fullWidth
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton>
                    <FilterListIcon />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Box>
      </Box>

      {/* Upcoming */}
      <TabPanel value={value} index={0}>
        <Grid container spacing={3}>
          {scheduledPosts.map((p) => (
            <Grid key={p.id} size={12}>
              <Paper sx={{ p: 3 }}>
                <Typography>{p.content}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </TabPanel>

      {/* Past */}
      <TabPanel value={value} index={1}>
        <Grid container spacing={3}>
          {pastPosts.map((p) => (
            <Grid key={p.id} size={12}>
              <Paper sx={{ p: 3 }}>
                <Typography>{p.content}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </TabPanel>

      {/* Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem sx={{ color: 'error.main' }}>
          <ListItemIcon sx={{ color: 'error.main' }}>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default SchedulePage;
