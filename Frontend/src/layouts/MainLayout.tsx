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
  { text: 'Dashboard', icon: <Dashboard />, path: '/dashboard', exact: true },
  { text: 'Analytics', icon: <Analytics />, path: '/analytics', exact: true },
  { text: 'Posts', icon: <PostAdd />, path: '/posts', exact: true },
  { text: 'Schedule', icon: <Schedule />, path: '/schedule', exact: true },
  { text: 'Audience', icon: <People />, path: '/audience', exact: true },
  { text: 'Customer', icon: <Group />, path: '/customer', exact: true },
  { text: 'Profiles', icon: <AccountCircle />, path: '/customer-profile', exact: false },
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
          const active = item.exact 
            ? location.pathname === item.path
            : location.pathname.startsWith(item.path);

          return (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                onClick={() => navigate(item.path)}
                sx={{
                  borderRadius: 2,
                  my: 0.5,
                  justifyContent: open ? 'flex-start' : 'center',
                  '&.Mui-selected': {
                    bgcolor: 'primary.light',
                    color: 'primary.main',
                    '&:hover': {
                      bgcolor: 'primary.light',
                    },
                    '& .MuiListItemIcon-root': {
                      color: 'primary.main',
                    },
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
          bgcolor: theme.palette.mode === 'light' 
            ? '#ffffff' 
            : theme.palette.background.paper,
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid',
          borderColor: theme.palette.mode === 'light' 
            ? 'rgba(0, 0, 0, 0.08)' 
            : 'rgba(255, 255, 255, 0.08)',
          ml: { sm: open ? drawerWidth : collapsedWidth },
          width: {
            sm: `calc(100% - ${open ? drawerWidth : collapsedWidth}px)`,
          },
          transition: theme.transitions.create(['width', 'margin', 'background-color', 'border-color'], {
            duration: theme.transitions.duration.shorter,
          }),
          boxShadow: theme.palette.mode === 'light'
            ? '0 1px 3px rgba(0, 0, 0, 0.1)'
            : '0 1px 3px rgba(0, 0, 0, 0.3)',
        }}
      >
        <Toolbar>
          <IconButton sx={{ display: { sm: 'none' } }} onClick={handleDrawerToggle}>
            <MenuIcon />
          </IconButton>

          <Box flexGrow={1} />

          <ThemeToggle />

          <Tooltip title="Notifications">
            <IconButton 
              sx={{ 
                ml: 2,
                bgcolor: 'transparent',
                color: theme.palette.text.primary,
                border: `1px solid ${theme.palette.divider}`,
                '&:hover': {
                  bgcolor: theme.palette.action.hover,
                },
                transition: 'all 0.2s ease-in-out',
              }}
            >
              <Badge 
                badgeContent={3} 
                color="error" 
                overlap="circular"
                sx={{
                  '& .MuiBadge-badge': {
                    border: `2px solid ${theme.palette.background.paper}`,
                  },
                }}
              >
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
              gap: 1.5,
              px: 1.5,
              py: 0.75,
              borderRadius: 2,
              cursor: 'pointer',
              bgcolor: 'transparent',
              border: `1px solid ${theme.palette.divider}`,
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                bgcolor: theme.palette.action.hover,
              },
            }}
          >
            <Avatar 
              sx={{ 
                width: 32, 
                height: 32,
                bgcolor: theme.palette.primary.main,
                color: theme.palette.primary.contrastText,
                border: `2px solid ${theme.palette.mode === 'light' ? '#fff' : theme.palette.background.paper}`,
                boxShadow: theme.shadows[1],
              }}
            >
              U
            </Avatar>
            <Box>
              <Typography 
                variant="subtitle2" 
                fontWeight={600} 
                lineHeight={1.2}
                color="text.primary"
              >
                User Name
              </Typography>
              <Typography 
                variant="caption" 
                color="text.secondary"
                sx={{ 
                  display: 'block', 
                  lineHeight: 1.2,
                  fontSize: '0.7rem',
                  opacity: 0.8
                }}
              >
                @username
              </Typography>
            </Box>
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
