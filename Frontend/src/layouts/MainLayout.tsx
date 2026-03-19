import { useState, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/store';
import { ThemeToggle } from '../components/ThemeToggle';
import { logout, updateUser } from '../store/slices/authSlice';
import { userApi } from '../api/user.api';
import Swal from 'sweetalert2';

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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  CircularProgress,
} from '@mui/material';

import {
  Menu as MenuIcon,
  Dashboard,
  Analytics,
  PostAdd,
  Schedule,
  Settings,
  Logout,
  Notifications,
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
  { text: 'Customer', icon: <Group />, path: '/customer', exact: true },
  { text: 'User Management', icon: <PeopleAlt />, path: '/users', exact: true },
  { text: 'Profiles', icon: <AccountCircle />, path: '/customer-profile', exact: false },
];

const MainLayout = ({ children }: MainLayoutProps) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();

  // Get current user to check role
  const currentUser = useAppSelector((state) => state.auth.user);
  const isSuperAdmin = currentUser?.roles?.includes('SUPER_ADMIN') || false;

  // Filter menu items based on user role
  const filteredMenuItems = menuItems.filter((item) => {
    // Hide User Management for non-super-admin users
    if (item.path === '/users' && !isSuperAdmin) {
      return false;
    }
    return true;
  });

  const [open, setOpen] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isRemovingImage, setIsRemovingImage] = useState(false);
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

  const handleDrawerToggle = useCallback(() => setOpen(p => !p), []);
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
      confirmButtonColor: '#d33',
      cancelButtonColor: '#308',
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
          confirmButtonColor: '#d33',
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
            confirmButtonColor: '#d33',
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
        confirmButtonColor: '#3085d6',
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
        confirmButtonColor: '#d33',
      });
    } finally {
      setIsUpdatingProfile(false);
    }
  }, [currentUser, profileData, dispatch]);
  
  const handleAccountDelete = useCallback(async () => {
    try {
      if (!currentUser?.userId) {
        await Swal.fire({
          icon: 'error',
          title: 'User not found',
          text: 'Please try again or contact support.',
          confirmButtonColor: '#d33',
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
        confirmButtonColor: '#d33',
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
        {filteredMenuItems.map(item => {
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
          <ListItemButton 
            sx={{ borderRadius: 2 }}
            onClick={() => navigate('/settings')}
          >
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
              src={currentUser?.userImageUrl || undefined}
              imgProps={{ crossOrigin: 'anonymous' }}
              onError={(e: any) => {
                const target = e.target as HTMLImageElement;
                if (target) target.src = '';
              }}
              sx={{
                width: 32,
                height: 32,
                bgcolor: currentUser?.userImageUrl ? 'transparent' : theme.palette.primary.main,
                color: currentUser?.userImageUrl ? 'transparent' : theme.palette.primary.contrastText,
                border: `2px solid ${theme.palette.mode === 'light' ? '#fff' : theme.palette.background.paper}`,
                boxShadow: theme.shadows[1],
              }}
            >
              {(!currentUser?.userImageUrl || currentUser.userImageUrl === '') && (currentUser?.userName?.[0]?.toUpperCase() || currentUser?.fullName?.[0]?.toUpperCase() || 'U')}
            </Avatar>
            <Box>
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
                  disabled={isUploadingImage || isRemovingImage}
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
              background: 'linear-gradient(135deg, rgba(74, 108, 247, 0.8), rgba(166, 77, 255, 0.8))',
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
