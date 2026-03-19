import { useState, useCallback } from 'react';
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  Chip,
  Typography,
  CircularProgress,
  IconButton,
  Card,
  CardContent,
  useTheme,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  PersonAdd as PersonAddIcon,
  AdminPanelSettings as AdminIcon,
  SupervisorAccount as SupervisorIcon,
  Person as PersonIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';

import { useUsersManagement, User, Role } from '../../hooks/useUsersManagement';
import Swal from 'sweetalert2';

// Styled components
const StyledCard = styled(Card)(({ theme }) => ({
  borderRadius: 12,
  background: 'rgba(255, 255, 255, 0.1)',
  backdropFilter: 'blur(25px) saturate(200%)',
  WebkitBackdropFilter: 'blur(25px) saturate(200%)',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)',
  position: 'relative',
  overflow: 'hidden',
  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '1px',
    background: 'linear-gradient(90deg, transparent, rgba(100, 181, 246, 0.6), transparent)',
    opacity: 0.7,
  },
  '&:hover': {
    transform: 'translateY(-2px) scale(1.02)',
    boxShadow: '0 12px 40px 0 rgba(31, 38, 135, 0.45), inset 0 1px 0 0 rgba(255, 255, 255, 0.15)',
  },
}));

const getRoleIcon = (role: string) => {
  switch (role) {
    case 'SUPER_ADMIN':
      return <AdminIcon fontSize="small" />;
    case 'ADMIN':
      return <SupervisorIcon fontSize="small" />;
    case 'MODERATOR':
      return <PersonAddIcon fontSize="small" />;
    default:
      return <PersonIcon fontSize="small" />;
  }
};

const getRoleColor = (role: string) => {
  switch (role) {
    case 'SUPER_ADMIN':
      return 'error';
    case 'ADMIN':
      return 'warning';
    case 'MODERATOR':
      return 'info';
    default:
      return 'default';
  }
};

const UsersPage = () => {
  const theme = useTheme();
  const {
    users,
    roles,
    loading,
    error,
    fetchUsers,
    assignRoleToUser,
    removeRoleFromUser,
    deleteUser
  } = useUsersManagement();

  const [assignRoleDialog, setAssignRoleDialog] = useState<{
    open: boolean;
    user: User | null;
    selectedRole: string;
    availableRoles: Role[];
  }>({
    open: false,
    user: null,
    selectedRole: '',
    availableRoles: []
  });

  const handleAssignRoleOpen = useCallback((user: User) => {
    setAssignRoleDialog({
      open: true,
      user,
      selectedRole: user.roles[0] || '',
      availableRoles: roles
    });
  }, [roles]);

  const handleAssignRoleClose = useCallback(() => {
    setAssignRoleDialog({
      open: false,
      user: null,
      selectedRole: '',
      availableRoles: []
    });
  }, []);

  const handleAssignRoleConfirm = useCallback(async () => {
    if (!assignRoleDialog.user || !assignRoleDialog.selectedRole) return;

    try {
      // Find the role ID from the selected role name
      const selectedRoleObj = roles.find(r => r.roleName === assignRoleDialog.selectedRole);
      if (!selectedRoleObj) {
        await Swal.fire({
          icon: 'error',
          title: 'Invalid Role',
          text: 'The selected role could not be found.',
          customClass: {
            popup: 'swal2-error-dialog'
          }
        });
        return;
      }

      const success = await assignRoleToUser(assignRoleDialog.user.userId, selectedRoleObj.roleId);

      if (success) {
        await Swal.fire({
          icon: 'success',
          title: 'Role Assigned Successfully',
          text: `Role "${assignRoleDialog.selectedRole.replace('_', ' ')}" has been assigned to ${assignRoleDialog.user.userName} ${assignRoleDialog.user.userLastName}`,
          customClass: {
            popup: 'swal2-success-dialog'
          }
        });
      } else {
        await Swal.fire({
          icon: 'error',
          title: 'Assignment Failed',
          text: 'Failed to assign the role. Please try again.',
          customClass: {
            popup: 'swal2-error-dialog'
          }
        });
      }
    } catch (error) {
      console.error('Error assigning role:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'An error occurred while assigning the role.',
        customClass: {
          popup: 'swal2-error-dialog'
        }
      });
    }

    handleAssignRoleClose();
  }, [assignRoleDialog, roles, assignRoleToUser, handleAssignRoleClose]);

  const handleRoleChange = useCallback((role: string) => {
    setAssignRoleDialog(prev => ({
      ...prev,
      selectedRole: role
    }));
  }, []);

  const handleDeleteUser = useCallback(async (user: User) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `You are about to delete ${user.userName} ${user.userLastName || ''}. This action cannot be undone!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete user!',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      reverseButtons: true,
    });

    if (result.isConfirmed) {
      try {
        const success = await deleteUser(user.userId);
        if (success) {
          await Swal.fire({
            icon: 'success',
            title: 'User Deleted!',
            text: `${user.userName} has been successfully deleted.`,
            timer: 2000,
            timerProgressBar: true,
            showConfirmButton: false,
          });
        }
      } catch (error) {
        await Swal.fire({
          icon: 'error',
          title: 'Deletion Failed',
          text: 'Failed to delete the user. Please try again.',
          confirmButtonColor: '#dc3545',
        });
      }
    }
  }, [deleteUser]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight={600}>
        User Management
      </Typography>

      <Box mb={3}>
        <Button
          variant="contained"
          startIcon={<PersonAddIcon />}
          sx={{ mr: 2 }}
        >
          Add User
        </Button>
      </Box>

      <StyledCard>
        <CardContent sx={{ p: 0 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>User</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Roles</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users?.map((user) => (
                  <TableRow key={user.userId} hover>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Avatar
                          src={user.userImageUrl || undefined}
                          imgProps={{ crossOrigin: 'anonymous' }}
                          onError={(e: any) => {
                            const target = e.target as HTMLImageElement;
                            if (target) target.src = '';
                          }}
                          sx={{
                            bgcolor: user.userImageUrl ? 'transparent' : (user.isActive
                              ? theme.palette.primary.main
                              : theme.palette.grey[500])
                          }}
                        >
                          {(!user.userImageUrl || user.userImageUrl === '') && user.userName.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={500}>
                            {user.userName} {user.userLastName}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>{user.userEmail}</TableCell>
                    <TableCell>
                      <Box display="flex" gap={1} flexWrap="wrap">
                      {user.roles?.map((role) => (
                          <Chip
                            key={role}
                            label={role.replace('_', ' ')}
                            size="small"
                            icon={getRoleIcon(role)}
                            color={getRoleColor(role) as any}
                            variant="outlined"
                          />
                        ))}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.isActive ? 'Active' : 'Inactive'}
                        color={user.isActive ? 'success' : 'error'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Manage Roles">
                        <IconButton
                          size="small"
                          onClick={() => handleAssignRoleOpen(user)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete User">
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteUser(user)}
                          sx={{
                            color: 'error.main',
                            '&:hover': {
                              bgcolor: 'error.light',
                              color: 'error.dark',
                            },
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </StyledCard>

      {/* Assign Role Dialog */}
      <Dialog
        open={assignRoleDialog.open}
        onClose={handleAssignRoleClose}
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
          Manage Roles - {assignRoleDialog.user?.userName} {assignRoleDialog.user?.userLastName}
        </DialogTitle>
        <DialogContent>
          <Box mt={2}>
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={assignRoleDialog.selectedRole}
                label="Role"
                onChange={(e) => handleRoleChange(e.target.value)}
              >
                <MenuItem value="SUPER_ADMIN">
                  <Box display="flex" alignItems="center" gap={1}>
                    <AdminIcon fontSize="small" />
                    Super Admin
                  </Box>
                </MenuItem>
                <MenuItem value="ADMIN">
                  <Box display="flex" alignItems="center" gap={1}>
                    <SupervisorIcon fontSize="small" />
                    Admin
                  </Box>
                </MenuItem>
                <MenuItem value="MODERATOR">
                  <Box display="flex" alignItems="center" gap={1}>
                    <PersonAddIcon fontSize="small" />
                    Moderator
                  </Box>
                </MenuItem>
                <MenuItem value="CUSTOMER">
                  <Box display="flex" alignItems="center" gap={1}>
                    <PersonIcon fontSize="small" />
                    Customer
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleAssignRoleClose}>Cancel</Button>
          <Button
            onClick={handleAssignRoleConfirm}
            variant="contained"
            disabled={!assignRoleDialog.selectedRole}
          >
            Assign Role
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UsersPage;
