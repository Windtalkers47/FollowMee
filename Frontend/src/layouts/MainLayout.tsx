import { useState, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch } from '../store/store';
import { ThemeToggle } from '../components/ThemeToggle';
import { logout } from '../store/slices/authSlice';

import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useTheme,
  Avatar,
  Tooltip,
  Badge,
  Menu,
  MenuItem,
  alpha,
} from '@mui/material';

import {
  Menu as MenuIcon,
  Dashboard,
  Analytics,
  PostAdd,
  Schedule,
  People,
  Settings,
  Logout,
  Notifications,
  ChevronLeft,
  ChevronRight,
  Home,
  Group,
  AccountCircle,
} from '@mui/icons-material';

const drawerWidth = 260;
const collapsedWidth = 76;
const APP_BAR_HEIGHT = 64;

interface MainLayoutProps {
  children?: React.ReactNode;
}

const menuItems = [
  { text: 'Dashboard', icon: <Dashboard />, path: '/dashboard' },
  { text: 'Analytics', icon: <Analytics />, path: '/analytics' },
  { text: 'Posts', icon: <PostAdd />, path: '/posts' },
  { text: 'Schedule', icon: <Schedule />, path: '/schedule' },
  { text: 'Audience', icon: <People />, path: '/audience' },
  { text: 'Customer', icon: <Group />, path: '/customer' },
  { text: 'Profiles', icon: <AccountCircle />, path: '/customer-profile' },
];

const MainLayout = ({ children }: MainLayoutProps) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();

  const [open, setOpen] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleDrawerToggle = useCallback(() => setOpen(p => !p), []);
  const handleProfileMenuOpen = useCallback((e: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(e.currentTarget);
  }, []);
  const handleMenuClose = useCallback(() => setAnchorEl(null), []);

  const handleLogout = useCallback(() => {
    dispatch(logout());
    localStorage.removeItem('authToken');
    navigate('/login', { replace: true });
  }, [dispatch, navigate]);

  /* ================= Drawer ================= */

  const drawerContent = useMemo(() => (
    <Box display="flex" flexDirection="column" height="100%">
      {/* Logo */}
      <Box
        sx={{
          height: APP_BAR_HEIGHT,
          px: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: open ? 'space-between' : 'center',
        }}
      >
        <Box
          onClick={() => navigate('/')}
          sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
        >
          <Home color="primary" />
          {open && (
            <Typography ml={1} fontWeight={700}>
              FollowMee
            </Typography>
          )}
        </Box>

        <IconButton size="small" onClick={handleDrawerToggle}>
          {open ? <ChevronLeft /> : <ChevronRight />}
        </IconButton>
      </Box>

      <Divider />

      {/* Menu */}
      <List sx={{ px: 1, pt: 1 }}>
        {menuItems.map(item => {
          const active = location.pathname.startsWith(item.path);

          return (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                onClick={() => navigate(item.path)}
                sx={{
                  borderRadius: 2,
                  my: 0.5,
                  justifyContent: open ? 'flex-start' : 'center',
                  bgcolor: active
                    ? alpha(theme.palette.primary.main, 0.12)
                    : 'transparent',
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.15),
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: open ? 1.5 : 0,
                    color: active ? 'primary.main' : 'text.secondary',
                    justifyContent: 'center',
                  }}
                >
                  {item.icon}
                </ListItemIcon>

                {open && (
                  <ListItemText
                    primary={item.text}
                    primaryTypographyProps={{
                      fontWeight: active ? 600 : 500,
                    }}
                  />
                )}
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      <Box flexGrow={1} />

      <Divider />

      {/* Bottom */}
      <List sx={{ px: 1, pb: 1 }}>
        <ListItem disablePadding>
          <ListItemButton sx={{ borderRadius: 2 }}>
            <ListItemIcon sx={{ minWidth: 0, mr: open ? 1.5 : 0 }}>
              <Settings />
            </ListItemIcon>
            {open && <ListItemText primary="Settings" />}
          </ListItemButton>
        </ListItem>

        <ListItem disablePadding>
          <ListItemButton
            onClick={handleLogout}
            sx={{ borderRadius: 2 }}
          >
            <ListItemIcon sx={{ minWidth: 0, mr: open ? 1.5 : 0 }}>
              <Logout />
            </ListItemIcon>
            {open && <ListItemText primary="Logout" />}
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  ), [open, location.pathname]);

  /* ================= Layout ================= */

  return (
    <Box display="flex" height="100vh">
      {/* AppBar */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          height: APP_BAR_HEIGHT,
          bgcolor: alpha(theme.palette.background.paper, 0.9),
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid',
          borderColor: 'divider',
          ml: { sm: open ? drawerWidth : collapsedWidth },
          width: {
            sm: `calc(100% - ${open ? drawerWidth : collapsedWidth}px)`,
          },
          transition: theme.transitions.create(['width', 'margin']),
        }}
      >
        <Toolbar>
          <IconButton sx={{ display: { sm: 'none' } }} onClick={handleDrawerToggle}>
            <MenuIcon />
          </IconButton>

          <Box flexGrow={1} />

          <ThemeToggle />

          <Tooltip title="Notifications">
            <IconButton sx={{ ml: 1 }}>
              <Badge badgeContent={3} color="error">
                <Notifications />
              </Badge>
            </IconButton>
          </Tooltip>

          {/* Profile */}
          <Box
            onClick={handleProfileMenuOpen}
            sx={{
              ml: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 1.5,
              py: 0.75,
              borderRadius: 2,
              cursor: 'pointer',
              '&:hover': {
                bgcolor: alpha(theme.palette.primary.main, 0.08),
              },
            }}
          >
            <Avatar sx={{ width: 32, height: 32 }}>U</Avatar>
            <Typography fontWeight={600}>User Name</Typography>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Drawer */}
      <Drawer
        variant="permanent"
        sx={{
          width: open ? drawerWidth : collapsedWidth,
          '& .MuiDrawer-paper': {
            width: open ? drawerWidth : collapsedWidth,
            transition: theme.transitions.create('width'),
            overflowX: 'hidden',
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Main */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          mt: `${APP_BAR_HEIGHT}px`,
          height: `calc(100vh - ${APP_BAR_HEIGHT}px)`,
          overflowY: 'auto',
          bgcolor: theme.palette.background.default,
        }}
      >
        <Box
          sx={{
            maxWidth: 1200,
            mx: 'auto',
            px: { xs: 2, sm: 3, md: 4 },
            py: 3,
          }}
        >
          {children}
        </Box>
      </Box>

      {/* Profile Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem>Profile</MenuItem>
        <MenuItem>Account</MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout}>
          <Logout fontSize="small" sx={{ mr: 1 }} />
          Logout
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default MainLayout;
