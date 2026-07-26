import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/store';
import { ThemeToggle } from '../components/ThemeToggle';
import { logout, updateUser } from '../store/slices/authSlice';
import { userApi } from '../api/user.api';
import Swal from 'sweetalert2';
import SmartAvatar from '../components/SmartAvatar';
import NotificationBell from '../components/NotificationBell/NotificationBell';
import NotificationDropdown from '../components/NotificationDropdown/NotificationDropdown';
import { clearCache } from '../services/api/dashboardApi';

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
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  CircularProgress,
  useMediaQuery,
  BottomNavigation,
  BottomNavigationAction,
} from '@mui/material';

import {
  Menu as MenuIcon,
  Dashboard,
  PostAdd,
  Schedule,
  Settings,
  Logout,
  ChevronLeft,
  ChevronRight,
  Home,
  Group,
  AccountCircle,
  PeopleAlt,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  CloudUpload,
  Analytics,
} from '@mui/icons-material';
import ProductTour from '../components/ProductTour/ProductTour';
import { semanticHex } from '../styles/designTokens';

const drawerWidth = 260;
const collapsedWidth = 76;
const APP_BAR_HEIGHT = 64;
const MOBILE_NAV_HEIGHT = 68;

interface MainLayoutProps {
  children?: React.ReactNode;
}

const menuItems = [
  { text: 'Dashboard', icon: <Dashboard />, path: '/dashboard', exact: true, group: 'Workspace' },
  { text: 'Tasks & Schedule', icon: <Schedule />, path: '/schedule', exact: true, group: 'Workspace' },
  { text: 'Customers', icon: <Group />, path: '/customer', exact: true, group: 'Workspace' },
  { text: 'Profile Cards', icon: <AccountCircle />, path: '/customer-profile', exact: false, group: 'Workspace' },
  { text: 'Analytics', icon: <Analytics />, path: '/notification-analytics', exact: true, group: 'Insights' },
  { text: 'Completed Work', icon: <PostAdd />, path: '/posts', exact: true, group: 'Insights' },
  { text: 'User Management', icon: <PeopleAlt />, path: '/users', exact: true, group: 'Administration' },
];

const MainLayout = ({ children }: MainLayoutProps) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Get current user to check role
  const currentUser = useAppSelector((state) => state.auth.user);
  const isSuperAdmin = currentUser?.roles?.includes('Superadmin') || false;
  const canManageUsers = isSuperAdmin || currentUser?.roles?.includes('Admin') || false;

  // Filter menu items based on user role
  const filteredMenuItems = menuItems.filter((item) => {
    // Admins can manage users; only Superadmin can manage privileged roles.
    if (item.path === '/users' && !canManageUsers) {
      return false;
    }
    return true;
  });

  const [open, setOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const showDrawerLabels = isMobile || open;
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    userName: currentUser?.userName || '',
    userLastName: currentUser?.userLastName || '',
    userEmail: currentUser?.userEmail || '',
    userPhone1: currentUser?.userPhone1 || '',
    userPhone2: currentUser?.userPhone2 || '',
    userPassword: '',
    confirmPassword: '',
    userImageUrl: currentUser?.userImageUrl || null,
  });

  const handleDrawerToggle = useCallback(() => {
    if (isMobile) {
      setMobileOpen((value) => !value);
      return;
    }
    setOpen((value) => !value);
  }, [isMobile, setMobileOpen, setOpen]);
  const handleProfileMenuOpen = useCallback((e: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(e.currentTarget);
  }, []);
  const handleMenuClose = useCallback(() => setAnchorEl(null), []);
  
  const handleProfileModalOpen = useCallback(() => {
    setProfileModalOpen(true);
    handleMenuClose();
  }, []);
  
  const handleProfileModalClose = useCallback(() => {
    setProfileModalOpen(false);
  }, []);
  
  const handleDeleteModalOpen = useCallback(() => {
    setDeleteModalOpen(true);
    handleProfileModalClose();
  }, []);
  
  const handleDeleteModalClose = useCallback(() => {
    setDeleteModalOpen(false);
  }, []);
  
  const handleProfileChange = useCallback((field: string, value: string) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);
  
  const handleRemoveProfileImage = useCallback(async () => {
    const result = await Swal.fire({
      title: 'Remove Image?',
      text: 'Are you sure you want to remove your profile image? It will be deleted from Cloudinary and database.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: semanticHex.error,
      cancelButtonColor: '#8E8E93',
      confirmButtonText: 'Yes, remove it!',
      cancelButtonText: 'Cancel',
    });

    if (result.isConfirmed) {
      setProfileData(prev => ({ ...prev, userImageUrl: null }));
      
      // Show success toast
      Swal.fire({
        icon: 'success',
        title: 'Image Removed',
        text: 'Your profile image has been removed successfully! Click "Save Changes" to update your profile.',
        timer: 2000,
        showConfirmButton: false,
        position: 'top-end',
        toast: true
      });
    }
  }, []);
  
  const handleLogout = useCallback(() => {
    dispatch(logout());
    localStorage.removeItem('authToken');
    navigate('/login', { replace: true });
  }, [dispatch, navigate]);
  
  const handleProfileUpdate = useCallback(async () => {
    try {
      if (!currentUser?.userId) {
        await Swal.fire({
          icon: 'error',
          title: 'User not found',
          text: 'Please try again or contact support.',
          confirmButtonColor: semanticHex.error,
        });
        return;
      }

      // Only validate passwords if user is trying to change password (typed something)
      if (profileData.userPassword || profileData.confirmPassword) {
        if (profileData.userPassword !== profileData.confirmPassword) {
          await Swal.fire({
            icon: 'error',
            title: 'Password Mismatch',
            text: 'The passwords you entered do not match. Please try again.',
            confirmButtonColor: semanticHex.error,
          });
          return;
        }
      }

      const updateData: any = {};

      // Only include fields that have been changed (non-empty)
      if (profileData.userName && profileData.userName !== currentUser.userName) {
        updateData.userName = profileData.userName;
      }
      if (profileData.userLastName !== currentUser.userLastName) {
        updateData.userLastName = profileData.userLastName;
      }
      if (profileData.userEmail && profileData.userEmail !== currentUser.userEmail) {
        updateData.userEmail = profileData.userEmail;
      }
      if (profileData.userPhone1 !== currentUser.userPhone1) {
        updateData.userPhone1 = profileData.userPhone1;
      }
      if (profileData.userPhone2 !== currentUser.userPhone2) {
        updateData.userPhone2 = profileData.userPhone2;
      }

      // Only include password if it's provided
      if (profileData.userPassword) {
        updateData.userPassword = profileData.userPassword;
      }

      // Handle image upload (base64 string or removal)
      if (profileData.userImageUrl !== currentUser.userImageUrl) {
        updateData.userImageUrl = profileData.userImageUrl;
      }

      // Check if anything was actually changed
      if (Object.keys(updateData).length === 0) {
        await Swal.fire({
        icon: 'warning',
        title: 'No Changes',
        text: 'No changes were made to your profile.',
        confirmButtonColor: semanticHex.primary,
      });
        return;
      }

      // Show loading state for profile update
      setIsUpdatingProfile(true);
      Swal.fire({
        title: 'Updating Profile...',
        text: 'Please wait while we update your profile',
        icon: 'info',
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      await userApi.updateUser(currentUser.userId, updateData);

      // Update Redux state with new user data
      dispatch(updateUser({
        ...currentUser,
        userName: profileData.userName || currentUser.userName,
        userLastName: profileData.userLastName,
        userEmail: profileData.userEmail || currentUser.userEmail,
        userPhone1: profileData.userPhone1,
        userPhone2: profileData.userPhone2,
        userImageUrl: profileData.userImageUrl || undefined,
      }));

      // Close loading and show success
      Swal.close();
      Swal.fire({
        icon: 'success',
        title: 'Profile Updated!',
        text: 'Your profile has been successfully updated.',
        timer: 2000,
        timerProgressBar: true,
        showConfirmButton: false,
      });
      handleProfileModalClose();
    } catch (error) {
      Swal.close();
      await Swal.fire({
        icon: 'error',
        title: 'Update Failed',
        text: 'Failed to update your profile. Please try again.',
        confirmButtonColor: semanticHex.error,
      });
    } finally {
      setIsUpdatingProfile(false);
    }
  }, [currentUser, profileData, dispatch]);
  
  // Listen for global profile update events (broadcast from App.tsx)
  useEffect(() => {
    const handleProfileUpdate = (event: CustomEvent<{ userId: number; userImageUrl?: string | null }>) => {
      setProfileData(prev => ({
        ...prev,
        userImageUrl: event.detail.userImageUrl || null
      }));
      
      if (currentUser) {
        dispatch(updateUser({
          ...currentUser,
          userImageUrl: event.detail.userImageUrl || undefined
        }));
      }
      
      clearCache('leaderboard');
    };
    
    window.addEventListener('followmee:profile-updated', handleProfileUpdate as EventListener);
    
    return () => {
      window.removeEventListener('followmee:profile-updated', handleProfileUpdate as EventListener);
    };
  }, [currentUser, dispatch]);

  const handleAccountDelete = useCallback(async () => {
    try {
      if (!currentUser?.userId) {
        await Swal.fire({
          icon: 'error',
          title: 'User not found',
          text: 'Please try again or contact support.',
          confirmButtonColor: semanticHex.error,
        });
        return;
      }

      await userApi.deleteUser(currentUser.userId);

      await Swal.fire({
        icon: 'success',
        title: 'Account Deleted!',
        text: 'Your account has been successfully deleted.',
        timer: 2000,
        timerProgressBar: true,
        showConfirmButton: false,
      });
      handleDeleteModalClose();
      handleLogout();
    } catch (error) {
      await Swal.fire({
        icon: 'error',
        title: 'Deletion Failed',
        text: 'Failed to delete your account. Please try again.',
        confirmButtonColor: semanticHex.error,
      });
    }
  }, [currentUser, handleLogout]);

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
          justifyContent: showDrawerLabels ? 'space-between' : 'center',
        }}
      >
        <Box
          onClick={() => navigate('/')}
          sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', minWidth: 0 }}
        >
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: '11px',
              display: 'grid',
              placeItems: 'center',
              color: '#07120A',
              bgcolor: 'primary.main',
              boxShadow: (currentTheme) => `0 8px 18px ${currentTheme.palette.primary.main}40`,
            }}
          >
            <Home sx={{ fontSize: 21 }} />
          </Box>
          {showDrawerLabels && (
            <Typography ml={1.25} fontWeight={750} letterSpacing="-0.025em">
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
        {filteredMenuItems.map((item, index) => {
          const active = item.exact 
            ? location.pathname === item.path
            : location.pathname.startsWith(item.path);

          return (
            <React.Fragment key={item.text}>
              {showDrawerLabels && (index === 0 || item.group !== filteredMenuItems[index - 1].group) && (
                <Typography variant="overline" color="text.secondary" sx={{ display: 'block', px: 2, pt: index === 0 ? 1 : 2, pb: 0.25, letterSpacing: '.08em' }}>
                  {item.group}
                </Typography>
              )}
              <ListItem disablePadding>
                <ListItemButton
                  selected={active}
                  onClick={() => {
                    navigate(item.path);
                    if (isMobile) setMobileOpen(false);
                  }}
                  sx={{
                    my: 0.5,
                    justifyContent: showDrawerLabels ? 'flex-start' : 'center',
                    '&.Mui-selected .MuiListItemIcon-root': { color: 'primary.main' },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 0,
                      mr: showDrawerLabels ? 1.5 : 0,
                      color: active ? 'primary.main' : 'text.secondary',
                      justifyContent: 'center',
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>

                  {showDrawerLabels && (
                    <ListItemText
                      primary={item.text}
                      primaryTypographyProps={{
                        fontWeight: active ? 600 : 500,
                      }}
                    />
                  )}
                </ListItemButton>
              </ListItem>
            </React.Fragment>
          );
        })}
      </List>

      <Box flexGrow={1} />

      <Divider />

      {/* Bottom */}
      <List sx={{ px: 1, pb: 1 }}>
        <ListItem disablePadding>
          <ListItemButton 
            sx={{ borderRadius: 2 }}
            onClick={() => navigate('/settings')}
          >
            <ListItemIcon sx={{ minWidth: 0, mr: showDrawerLabels ? 1.5 : 0 }}>
              <Settings />
            </ListItemIcon>
            {showDrawerLabels && <ListItemText primary="Settings" />}
          </ListItemButton>
        </ListItem>

        <ListItem disablePadding>
          <ListItemButton
            onClick={handleLogout}
            sx={{ borderRadius: 2 }}
          >
            <ListItemIcon sx={{ minWidth: 0, mr: showDrawerLabels ? 1.5 : 0 }}>
              <Logout />
            </ListItemIcon>
            {showDrawerLabels && <ListItemText primary="Logout" />}
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  ), [filteredMenuItems, handleDrawerToggle, handleLogout, location.pathname, navigate, open, showDrawerLabels]);

  /* ================= Layout ================= */

  return (
    <Box 
      display="flex" 
      height="100vh"
      sx={{
        '--sidebar-width': open ? `${drawerWidth}px` : `${collapsedWidth}px`,
      }}
    >
      {/* AppBar */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          height: APP_BAR_HEIGHT,
          ml: { sm: open ? drawerWidth : collapsedWidth },
          width: {
            sm: `calc(100% - ${open ? drawerWidth : collapsedWidth}px)`,
          },
          transition: theme.transitions.create(['width', 'margin', 'background-color', 'border-color'], {
            duration: theme.transitions.duration.shorter,
          }),
        }}
      >
        <Toolbar>
          <IconButton
            aria-label="Open navigation"
            data-tour="mobile-navigation"
            sx={{ display: { sm: 'none' } }}
            onClick={handleDrawerToggle}
          >
            <MenuIcon />
          </IconButton>

          <Box flexGrow={1} />

          <ThemeToggle />

          <Box data-tour="notifications" sx={{ position: 'relative' }}>
            <NotificationBell />
            <NotificationDropdown />
          </Box>

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
            <SmartAvatar
              user={currentUser}
              avatarVariant="main"
              size={32}
            />
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <Typography 
                variant="subtitle2" 
                fontWeight={600} 
                lineHeight={1.2}
                color="text.primary"
              >
                {currentUser?.userName || currentUser?.fullName || 'User'}
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
                {currentUser?.roles?.[0] || 'User'}
              </Typography>
            </Box>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            overflowX: 'hidden',
          },
        }}
      >
        {drawerContent}
      </Drawer>

      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: 'block' },
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
          bgcolor: 'transparent',
          pb: { xs: `${MOBILE_NAV_HEIGHT}px`, sm: 0 },
        }}
      >
        <Box
          sx={{
            maxWidth: 1360,
            mx: 'auto',
            px: { xs: 1.5, sm: 3, md: 4 },
            py: { xs: 2, sm: 3 },
          }}
        >
          {children}
        </Box>
      </Box>

      <BottomNavigation
        showLabels
        value={
          ['/dashboard', '/schedule', '/customer', '/customer-profile'].find((path) =>
            location.pathname.startsWith(path)
          ) || false
        }
        onChange={(_event, value) => navigate(value)}
        sx={{
          display: { xs: 'flex', sm: 'none' },
          position: 'fixed',
          zIndex: theme.zIndex.appBar,
          left: 10,
          right: 10,
          bottom: 'max(8px, env(safe-area-inset-bottom))',
          height: MOBILE_NAV_HEIGHT,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '20px',
          bgcolor: theme.palette.mode === 'dark' ? 'rgba(23,28,26,.9)' : 'rgba(255,255,255,.9)',
          backdropFilter: 'blur(24px) saturate(150%)',
          boxShadow: theme.palette.mode === 'dark'
            ? '0 18px 45px rgba(0,0,0,.42)'
            : '0 18px 45px rgba(35,65,45,.16)',
          '& .MuiBottomNavigationAction-root': {
            minWidth: 0,
            color: 'text.secondary',
            '&.Mui-selected': { color: 'primary.dark' },
          },
          '& .MuiBottomNavigationAction-label': { fontSize: '0.68rem' },
        }}
      >
        <BottomNavigationAction label="Home" value="/dashboard" icon={<Dashboard />} />
        <BottomNavigationAction label="Tasks" value="/schedule" icon={<Schedule />} />
        <BottomNavigationAction label="Customers" value="/customer" icon={<Group />} />
        <BottomNavigationAction label="Profiles" value="/customer-profile" icon={<AccountCircle />} />
      </BottomNavigation>

      <ProductTour userKey={currentUser?.userId || currentUser?.userEmail || 'guest'} />

      {/* Profile Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={handleProfileModalOpen}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Edit Profile
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleDeleteModalOpen}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Delete Account
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout}>
          <Logout fontSize="small" sx={{ mr: 1 }} />
          Logout
        </MenuItem>
      </Menu>

      {/* Profile Modal */}
      <Dialog 
        open={profileModalOpen} 
        onClose={handleProfileModalClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            background: theme.palette.mode === 'dark' 
              ? 'rgba(255, 255, 255, 0.1)' 
              : 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(25px) saturate(200%)',
            WebkitBackdropFilter: 'blur(25px) saturate(200%)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)',
            borderRadius: 4,
          }
        }}
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h6" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#1a1a1a', fontWeight: 600 }}>
              Edit Profile
            </Typography>
            <IconButton onClick={handleProfileModalClose}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} pt={1}>
            {/* Profile Picture */}
            <Box display="flex" alignItems="center" gap={2} mb={2}>
              <Avatar
                src={profileData.userImageUrl || undefined}
                imgProps={{ crossOrigin: 'anonymous' }}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (target) target.src = '';
                }}
                sx={{ width: 80, height: 80 }}
              >
                {(!profileData.userImageUrl || profileData.userImageUrl === '') && (
                  profileData.userName?.charAt(0).toUpperCase() + (profileData.userLastName?.charAt(0).toUpperCase() || '') || 'U'
                )}
              </Avatar>
              <Box display="flex" flexDirection="column" gap={1}>
                <Button
                  component="label"
                  variant="contained"
                  size="small"
                  sx={{ mb: 1 }}
                  startIcon={isUploadingImage ? <CircularProgress size={16} /> : <CloudUpload />}
                  disabled={isUploadingImage}
                >
                  {isUploadingImage ? 'Processing...' : 'Upload Image'}
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        try {
                          setIsUploadingImage(true);
                          
                          // Show loading toast
                          Swal.fire({
                            title: 'Processing Image...',
                            text: 'Please wait while we process your image',
                            icon: 'info',
                            allowOutsideClick: false,
                            allowEscapeKey: false,
                            showConfirmButton: false,
                            didOpen: () => {
                              Swal.showLoading();
                            }
                          });
                          
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setProfileData(prev => ({
                              ...prev,
                              userImageUrl: reader.result as string
                            }));
                            
                            // Close loading and show success
                            Swal.close();
                            Swal.fire({
                              icon: 'success',
                              title: 'Image Processed',
                              text: 'Your image has been processed successfully!',
                              timer: 1500,
                              showConfirmButton: false,
                              position: 'top-end',
                              toast: true
                            });
                          };
                          reader.onerror = () => {
                            setIsUploadingImage(false);
                            Swal.close();
                            Swal.fire({
                              icon: 'error',
                              title: 'Processing Failed',
                              text: 'Failed to process image. Please try another one.',
                            });
                          };
                          reader.readAsDataURL(file);
                        } catch (error) {
                          setIsUploadingImage(false);
                          Swal.close();
                          Swal.fire({
                            icon: 'error',
                            title: 'Processing Failed',
                            text: 'Failed to process image. Please try another one.',
                          });
                        } finally {
                          setIsUploadingImage(false);
                        }
                      }
                    }}
                  />
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={handleRemoveProfileImage}
                  disabled={isUploadingImage}
                >
                  Remove Image
                </Button>
              </Box>
            </Box>

            {/* Basic Info */}
            <TextField
              fullWidth
              label="First Name"
              value={profileData.userName}
              onChange={(e) => handleProfileChange('userName', e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                },
                '& .MuiInputLabel-root': {
                  color: theme.palette.mode === 'dark' ? '#ffffff' : '#1a1a1a',
                  '&.Mui-focused': {
                    color: theme.palette.primary.main,
                  }
                },
                '& .MuiInputBase-input': {
                  color: theme.palette.mode === 'dark' ? '#ffffff' : '#1a1a1a',
                }
              }}
            />
            <TextField
              fullWidth
              label="Last Name"
              value={profileData.userLastName}
              onChange={(e) => handleProfileChange('userLastName', e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                },
                '& .MuiInputLabel-root': {
                  color: theme.palette.mode === 'dark' ? '#ffffff' : '#1a1a1a',
                  '&.Mui-focused': {
                    color: theme.palette.primary.main,
                  }
                },
                '& .MuiInputBase-input': {
                  color: theme.palette.mode === 'dark' ? '#ffffff' : '#1a1a1a',
                }
              }}
            />
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={profileData.userEmail}
              onChange={(e) => handleProfileChange('userEmail', e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                },
                '& .MuiInputLabel-root': {
                  color: theme.palette.mode === 'dark' ? '#ffffff' : '#1a1a1a',
                  '&.Mui-focused': {
                    color: theme.palette.primary.main,
                  }
                },
                '& .MuiInputBase-input': {
                  color: theme.palette.mode === 'dark' ? '#ffffff' : '#1a1a1a',
                }
              }}
            />

            {/* Phone Numbers */}
            <TextField
              fullWidth
              label="Phone 1"
              value={profileData.userPhone1}
              onChange={(e) => handleProfileChange('userPhone1', e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                },
                '& .MuiInputLabel-root': {
                  color: theme.palette.mode === 'dark' ? '#ffffff' : '#1a1a1a',
                  '&.Mui-focused': {
                    color: theme.palette.primary.main,
                  }
                },
                '& .MuiInputBase-input': {
                  color: theme.palette.mode === 'dark' ? '#ffffff' : '#1a1a1a',
                }
              }}
            />
            <TextField
              fullWidth
              label="Phone 2"
              value={profileData.userPhone2}
              onChange={(e) => handleProfileChange('userPhone2', e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                },
                '& .MuiInputLabel-root': {
                  color: theme.palette.mode === 'dark' ? '#ffffff' : '#1a1a1a',
                  '&.Mui-focused': {
                    color: theme.palette.primary.main,
                  }
                },
                '& .MuiInputBase-input': {
                  color: theme.palette.mode === 'dark' ? '#ffffff' : '#1a1a1a',
                }
              }}
            />

            {/* Password Fields */}
            <TextField
              fullWidth
              label="New Password (leave blank to keep current)"
              type="password"
              value={profileData.userPassword}
              onChange={(e) => handleProfileChange('userPassword', e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                },
                '& .MuiInputLabel-root': {
                  color: theme.palette.mode === 'dark' ? '#ffffff' : '#1a1a1a',
                  '&.Mui-focused': {
                    color: theme.palette.primary.main,
                  }
                },
                '& .MuiInputBase-input': {
                  color: theme.palette.mode === 'dark' ? '#ffffff' : '#1a1a1a',
                }
              }}
            />
            <TextField
              fullWidth
              label="Confirm New Password"
              type="password"
              value={profileData.confirmPassword}
              onChange={(e) => handleProfileChange('confirmPassword', e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                },
                '& .MuiInputLabel-root': {
                  color: theme.palette.mode === 'dark' ? '#ffffff' : '#1a1a1a',
                  '&.Mui-focused': {
                    color: theme.palette.primary.main,
                  }
                },
                '& .MuiInputBase-input': {
                  color: theme.palette.mode === 'dark' ? '#ffffff' : '#1a1a1a',
                }
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleProfileModalClose}>Cancel</Button>
          <Button 
            onClick={handleProfileUpdate}
            variant="contained"
            disabled={isUpdatingProfile || isUploadingImage}
            startIcon={isUpdatingProfile ? <CircularProgress size={16} /> : undefined}
            sx={{
              background: 'linear-gradient(135deg, #34C759, #30D158)',
            }}
          >
            {isUpdatingProfile ? 'Updating...' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Account Modal */}
      <Dialog 
        open={deleteModalOpen} 
        onClose={handleDeleteModalClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            background: theme.palette.mode === 'dark' 
              ? 'rgba(255, 255, 255, 0.1)' 
              : 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(25px) saturate(200%)',
            WebkitBackdropFilter: 'blur(25px) saturate(200%)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)',
            borderRadius: 4,
          }
        }}
      >
        <DialogTitle>
          <Typography variant="h6" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#d32f2f', fontWeight: 600 }}>
            Delete Account
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#1a1a1a' }}>
            Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently removed.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteModalClose}>Cancel</Button>
          <Button 
            onClick={handleAccountDelete}
            variant="contained"
            color="error"
            sx={{
              background: 'linear-gradient(135deg, rgba(244, 67, 54, 0.8), rgba(220, 38, 38, 0.8))',
            }}
          >
            Delete Account
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MainLayout;
