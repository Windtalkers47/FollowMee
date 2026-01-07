import { useState } from 'react';
import InstagramIcon from '@mui/icons-material/Instagram';
import FacebookIcon from '@mui/icons-material/Facebook';
import TwitterIcon from '@mui/icons-material/Twitter';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Checkbox,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Badge,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  PersonAdd as PersonAddIcon,
  GroupAdd as GroupAddIcon,
  FileUpload as FileUploadIcon,
  FilterAlt as FilterAltIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Refresh as RefreshIcon,
  Email as EmailIcon,
  Group as GroupIcon,
  LocationOn as LocationIcon,
  Language as LanguageIcon,
  CalendarToday as CalendarIcon,
  MoreHoriz as MoreHorizIcon,
  PersonRemove as PersonRemoveIcon,
  Block as BlockIcon,
  Flag as FlagIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';

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
      id={`audience-tabpanel-${index}`}
      aria-labelledby={`audience-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `audience-tab-${index}`,
    'aria-controls': `audience-tabpanel-${index}`,
  };
}

interface AudienceMember {
  id: number;
  name: string;
  email: string;
  avatar: string;
  location: string;
  joinedDate: Date;
  lastActive: Date;
  status: 'active' | 'inactive' | 'banned';
  tags: string[];
  engagement: number;
  platform: 'instagram' | 'facebook' | 'twitter' | 'linkedin';
}

const AudiencePage = () => {
  const theme = useTheme();
  const [value, setValue] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selected, setSelected] = useState<number[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedMember, setSelectedMember] = useState<AudienceMember | null>(null);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
    setPage(0);
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelected = audienceData.map((n) => n.id);
      setSelected(newSelected);
      return;
    }
    setSelected([]);
  };

  const handleClick = (event: React.MouseEvent<unknown>, id: number) => {
    const selectedIndex = selected.indexOf(id);
    let newSelected: number[] = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, id);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selected.slice(1));
    } else if (selectedIndex === selected.length - 1) {
      newSelected = newSelected.concat(selected.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selected.slice(0, selectedIndex),
        selected.slice(selectedIndex + 1),
      );
    }

    setSelected(newSelected);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, member: AudienceMember) => {
    setAnchorEl(event.currentTarget);
    setSelectedMember(member);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedMember(null);
  };

  const isSelected = (id: number) => selected.indexOf(id) !== -1;

  // Sample data
  const audienceData: AudienceMember[] = [
    {
      id: 1,
      name: 'Alex Johnson',
      email: 'alex.johnson@example.com',
      avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
      location: 'New York, USA',
      joinedDate: new Date('2023-01-15'),
      lastActive: new Date('2023-05-20'),
      status: 'active',
      tags: ['Influencer', 'Early Adopter'],
      engagement: 85,
      platform: 'instagram',
    },
    {
      id: 2,
      name: 'Maria Garcia',
      email: 'maria.garcia@example.com',
      avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
      location: 'Madrid, Spain',
      joinedDate: new Date('2023-02-10'),
      lastActive: new Date('2023-05-18'),
      status: 'active',
      tags: ['Frequent Buyer'],
      engagement: 72,
      platform: 'facebook',
    },
    {
      id: 3,
      name: 'James Wilson',
      email: 'james.wilson@example.com',
      avatar: 'https://randomuser.me/api/portraits/men/67.jpg',
      location: 'London, UK',
      joinedDate: new Date('2023-03-05'),
      lastActive: new Date('2023-04-15'),
      status: 'inactive',
      tags: ['Tech Enthusiast'],
      engagement: 45,
      platform: 'twitter',
    },
    {
      id: 4,
      name: 'Sarah Kim',
      email: 'sarah.kim@example.com',
      avatar: 'https://randomuser.me/api/portraits/women/28.jpg',
      location: 'Seoul, South Korea',
      joinedDate: new Date('2023-01-22'),
      lastActive: new Date('2023-05-19'),
      status: 'active',
      tags: ['Brand Ambassador', 'Influencer'],
      engagement: 92,
      platform: 'instagram',
    },
    {
      id: 5,
      name: 'Michael Brown',
      email: 'michael.brown@example.com',
      avatar: 'https://randomuser.me/api/portraits/men/52.jpg',
      location: 'Sydney, Australia',
      joinedDate: new Date('2023-02-28'),
      lastActive: new Date('2023-03-10'),
      status: 'inactive',
      tags: [],
      engagement: 28,
      platform: 'linkedin',
    },
  ];

  const filteredData = audienceData.filter((member) => {
    if (value === 1) return member.status === 'inactive';
    if (value === 2) return member.status === 'banned';
    return true; // All or active
  });

  const emptyRows = page > 0 ? Math.max(0, (1 + page) * rowsPerPage - filteredData.length) : 0;

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'instagram':
        return <InstagramIcon color="secondary" fontSize="small" />;
      case 'facebook':
        return <FacebookIcon color="primary" fontSize="small" />;
      case 'twitter':
        return <TwitterIcon color="info" fontSize="small" />;
      case 'linkedin':
        return <LinkedInIcon color="primary" fontSize="small" />;
      default:
        return <MoreHorizIcon fontSize="small" />;
    }
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Chip 
            icon={<CheckCircleIcon fontSize="small" />} 
            label="Active" 
            size="small" 
            color="success"
            variant="outlined"
          />
        );
      case 'inactive':
        return (
          <Chip 
            icon={<CancelIcon fontSize="small" />} 
            label="Inactive" 
            size="small" 
            color="warning"
            variant="outlined"
          />
        );
      case 'banned':
        return (
          <Chip 
            icon={<BlockIcon fontSize="small" />} 
            label="Banned" 
            size="small" 
            color="error"
            variant="outlined"
          />
        );
      default:
        return null;
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
            Audience
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Manage and engage with your followers
          </Typography>
        </Box>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<FileUploadIcon />}
            sx={{ borderRadius: 2, textTransform: 'none' }}
          >
            Import
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<GroupAddIcon />}
            sx={{ borderRadius: 2, textTransform: 'none' }}
          >
            Add Audience
          </Button>
        </Box>
      </Box>

      <Box sx={{ width: '100%', mb: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={value} 
            onChange={handleChange} 
            aria-label="audience tabs"
            sx={{
              '& .MuiTabs-indicator': {
                height: 3,
              },
            }}
          >
            <Tab 
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  <GroupIcon fontSize="small" />
                  <span>All</span>
                  <Chip 
                    label={audienceData.length} 
                    size="small" 
                    color="primary" 
                    sx={{ height: 20, fontSize: '0.675rem', fontWeight: 600 }}
                  />
                </Box>
              } 
              {...a11yProps(0)} 
            />
            <Tab 
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  <CheckCircleIcon fontSize="small" color="success" />
                  <span>Active</span>
                  <Chip 
                    label={audienceData.filter(m => m.status === 'active').length} 
                    size="small" 
                    color="success" 
                    sx={{ height: 20, fontSize: '0.675rem', fontWeight: 600 }}
                  />
                </Box>
              } 
              {...a11yProps(1)} 
            />
            <Tab 
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  <CancelIcon fontSize="small" color="warning" />
                  <span>Inactive</span>
                  <Chip 
                    label={audienceData.filter(m => m.status === 'inactive').length} 
                    size="small" 
                    color="warning" 
                    sx={{ height: 20, fontSize: '0.675rem', fontWeight: 600 }}
                  />
                </Box>
              } 
              {...a11yProps(2)} 
            />
            <Tab 
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  <BlockIcon fontSize="small" color="error" />
                  <span>Banned</span>
                  <Chip 
                    label={audienceData.filter(m => m.status === 'banned').length} 
                    size="small" 
                    color="error" 
                    sx={{ height: 20, fontSize: '0.675rem', fontWeight: 600 }}
                  />
                </Box>
              } 
              {...a11yProps(3)} 
            />
          </Tabs>
        </Box>

        <Box sx={{ my: 3 }} display="flex" gap={2} alignItems="center">
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search audience..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
              sx: {
                borderRadius: 2,
                bgcolor: 'background.paper',
                maxWidth: 400,
              },
            }}
          />
          
          <Button
            variant="outlined"
            startIcon={<FilterAltIcon />}
            sx={{ borderRadius: 2, textTransform: 'none' }}
          >
            Filters
          </Button>
          
          <IconButton sx={{ ml: 'auto' }}>
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      <Paper sx={{ width: '100%', mb: 2, borderRadius: 3, overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    color="primary"
                    indeterminate={selected.length > 0 && selected.length < filteredData.length}
                    checked={filteredData.length > 0 && selected.length === filteredData.length}
                    onChange={handleSelectAllClick}
                    inputProps={{ 'aria-label': 'select all audience members' }}
                  />
                </TableCell>
                <TableCell>Member</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Platform</TableCell>
                <TableCell>Engagement</TableCell>
                <TableCell>Joined</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredData
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((member) => {
                  const isItemSelected = isSelected(member.id);
                  const labelId = `enhanced-table-checkbox-${member.id}`;

                  return (
                    <TableRow
                      hover
                      role="checkbox"
                      aria-checked={isItemSelected}
                      tabIndex={-1}
                      key={member.id}
                      selected={isItemSelected}
                      sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                    >
                      <TableCell padding="checkbox">
                        <Checkbox
                          color="primary"
                          checked={isItemSelected}
                          onClick={(event) => handleClick(event, member.id)}
                          inputProps={{ 'aria-labelledby': labelId }}
                        />
                      </TableCell>
                      <TableCell component="th" id={labelId} scope="row">
                        <Box display="flex" alignItems="center" gap={2}>
                          <Avatar alt={member.name} src={member.avatar} />
                          <Box>
                            <Typography variant="subtitle2" fontWeight={500}>
                              {member.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {member.email}
                            </Typography>
                            {member.tags.length > 0 && (
                              <Box display="flex" gap={1} mt={0.5} flexWrap="wrap">
                                {member.tags.map((tag, index) => (
                                  <Chip 
                                    key={index} 
                                    label={tag} 
                                    size="small" 
                                    variant="outlined"
                                    sx={{ height: 20, fontSize: '0.675rem' }}
                                  />
                                ))}
                              </Box>
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>{getStatusChip(member.status)}</TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <LocationIcon color="action" fontSize="small" />
                          <Typography variant="body2">
                            {member.location}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Tooltip title={member.platform.charAt(0).toUpperCase() + member.platform.slice(1)}>
                          <IconButton size="small">
                            {getPlatformIcon(member.platform)}
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Box 
                            sx={{
                              width: 60, 
                              height: 8, 
                              bgcolor: 'divider', 
                              borderRadius: 4,
                              overflow: 'hidden',
                            }}
                          >
                            <Box 
                              sx={{
                                width: `${member.engagement}%`,
                                height: '100%',
                                bgcolor: theme.palette.primary.main,
                              }}
                            />
                          </Box>
                          <Typography variant="body2" color="text.secondary">
                            {member.engagement}%
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <CalendarIcon color="action" fontSize="small" />
                          <Typography variant="body2">
                            {format(member.joinedDate, 'MMM d, yyyy')}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={(e) => handleMenuOpen(e, member)}
                          aria-label="more"
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              {emptyRows > 0 && (
                <TableRow style={{ height: 53 * emptyRows }}>
                  <TableCell colSpan={8} />
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredData.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          sx={{ borderTop: '1px solid', borderColor: 'divider' }}
        />
      </Paper>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        onClick={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          elevation: 1,
          sx: {
            borderRadius: 2,
            minWidth: 200,
            boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.1)',
          },
        }}
      >
        <MenuItem>
          <ListItemIcon>
            <EmailIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Send Message</ListItemText>
        </MenuItem>
        <MenuItem>
          <ListItemIcon>
            <PersonAddIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Add to Group</ListItemText>
        </MenuItem>
        <Divider />
        {selectedMember?.status === 'active' ? (
          <MenuItem>
            <ListItemIcon>
              <PersonRemoveIcon fontSize="small" color="warning" />
            </ListItemIcon>
            <ListItemText>Mark as Inactive</ListItemText>
          </MenuItem>
        ) : (
          <MenuItem>
            <ListItemIcon>
              <CheckCircleIcon fontSize="small" color="success" />
            </ListItemIcon>
            <ListItemText>Mark as Active</ListItemText>
          </MenuItem>
        )}
        <MenuItem>
          <ListItemIcon>
            <BlockIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Ban User</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem>
          <ListItemIcon>
            <FlagIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Report</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default AudiencePage;
