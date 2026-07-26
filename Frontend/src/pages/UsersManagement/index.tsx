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
  MenuItem,
  TextField,
  Alert
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
import { ROLE_NAMES, normalizeRoleName } from '../../constants/roles';
import Swal from 'sweetalert2';

// Styled components
const StyledCard = styled(Card)(({ theme }) => ({
  borderRadius: 12,
  background: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  boxShadow: 'none',
  position: 'relative',
  overflow: 'hidden',
}));

const getRoleIcon = (role: string) => {
  switch (role) {
    case 'Superadmin':
      return <AdminIcon fontSize="small" />;
    case 'Admin':
      return <SupervisorIcon fontSize="small" />;
    case 'Moderator':
      return <PersonAddIcon fontSize="small" />;
    default:
      return <PersonIcon fontSize="small" />;
  }
};

const getRoleColor = (role: string) => {
  switch (role) {
    case 'Superadmin':
      return 'error';
    case 'Admin':
      return 'primary';
    case 'Moderator':
      return 'warning';
    default:
      return 'success';
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
    createUser,
    deleteUser
  } = useUsersManagement();

  const emptyNewUser = {
    userName: '',
    userLastName: '',
    userEmail: '',
    userPassword: '',
    userPhone1: '',
    roleId: 0
  };
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState(emptyNewUser);
  const [creatingUser, setCreatingUser] = useState(false);
  const [createError, setCreateError] = useState('');

  // Calculate role counts
  const getRoleCounts = () => {
    const counts = {
      'Superadmin': 0,
      'Admin': 0,
      'Moderator': 0,
      'Customer': 0
    };

    users.forEach(user => {
      user.roles.forEach(role => {
        if (counts.hasOwnProperty(role)) {
          counts[role as keyof typeof counts]++;
        }
      });
    });

    return counts;
  };

  const roleCounts = getRoleCounts();

  // Check if Super Admin is already taken
  const isSuperAdminTaken = roleCounts.Superadmin >= 1;

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

  const handleCreateUser = async () => {
    if (!newUser.userName.trim() || !newUser.userLastName.trim() ||
        !newUser.userEmail.trim() || newUser.userPassword.length < 8 || !newUser.roleId) {
      setCreateError('Complete all required fields and use a password of at least 8 characters.');
      return;
    }
    setCreatingUser(true);
    setCreateError('');
    const ok = await createUser({
      userName: newUser.userName.trim(),
      userLastName: newUser.userLastName.trim(),
      userEmail: newUser.userEmail.trim(),
      userPassword: newUser.userPassword,
      userPhone1: newUser.userPhone1.trim() || undefined
    }, newUser.roleId);
    setCreatingUser(false);
    if (ok) {
      setCreateDialogOpen(false);
      setNewUser(emptyNewUser);
    } else {
      setCreateError('The user could not be created. Check the email and try again.');
    }
  };

  const handleAssignRoleConfirm = useCallback(async () => {
    if (!assignRoleDialog.user || !assignRoleDialog.selectedRole) return;

    try {
      // Check if trying to assign Super Admin when it's already taken
      const normalizedSelectedRole = normalizeRoleName(assignRoleDialog.selectedRole);
      if (normalizedSelectedRole === 'Superadmin' && isSuperAdminTaken && assignRoleDialog.selectedRole !== "SUPER_ADMIN") {
        await Swal.fire({
          icon: 'warning',
          title: 'Super Admin Already Assigned',
          text: 'There can only be one Super Admin in the system. Please remove the existing Super Admin role before assigning a new one.',
          customClass: {
            popup: 'swal2-warning-dialog'
          }
        });
        return;
      }

      // Find the role ID from the selected role name
      const selectedRoleObj = roles.find(r => r.roleName === normalizedSelectedRole);
      
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
          text: 'Failed to assign role. Please try again.',
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
        text: 'An error occurred while assigning role.',
        customClass: {
          popup: 'swal2-error-dialog'
        }
      });
    }

    handleAssignRoleClose();
  }, [assignRoleDialog, roles, assignRoleToUser, handleAssignRoleClose, isSuperAdminTaken]);

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
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Roles define what each person can view or change. Super Admin is limited to one account.
      </Typography>

      {roles.length > 0 && (
        <Button
          variant="contained"
          startIcon={<PersonAddIcon />}
          onClick={() => {
            setCreateError('');
            setNewUser({ ...emptyNewUser, roleId: roles.find((role) => role.roleName === 'Customer')?.roleId || 0 });
            setCreateDialogOpen(true);
          }}
          sx={{ mb: 3 }}
        >
          Add user
        </Button>
      )}

      <Box sx={{ display: { xs: 'grid', md: 'none' }, gap: 1.5, mb: 2 }}>
        {users?.map((user) => (
          <Paper key={user.userId} variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
            <Box display="flex" alignItems="flex-start" gap={1.5}>
              <Avatar src={user.userImageUrl || undefined}>{user.userName.charAt(0)}</Avatar>
              <Box flex={1} minWidth={0}>
                <Typography fontWeight={700}>{user.userName} {user.userLastName}</Typography>
                <Typography variant="body2" color="text.secondary" noWrap>{user.userEmail}</Typography>
                <Box display="flex" gap={0.75} flexWrap="wrap" sx={{ mt: 1.5 }}>
                  {user.roles?.map((role) => <Chip key={role} label={role.replace('_', ' ')} size="small" variant="outlined" />)}
                  <Chip label={user.isActive ? 'Active' : 'Inactive'} size="small" color={user.isActive ? 'success' : 'default'} variant="outlined" />
                </Box>
              </Box>
              <Box>
                <IconButton size="small" aria-label="Manage roles" onClick={() => handleAssignRoleOpen(user)}><EditIcon fontSize="small" /></IconButton>
                <IconButton size="small" aria-label="Delete user" color="error" onClick={() => handleDeleteUser(user)}><DeleteIcon fontSize="small" /></IconButton>
              </Box>
            </Box>
          </Paper>
        ))}
      </Box>

      <StyledCard sx={{ display: { xs: 'none', md: 'block' } }}>
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
                        size="small"
                        sx={{
                          bgcolor: user.isActive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                          color: user.isActive ? '#10b981' : '#ef4444',
                          border: `1px solid ${user.isActive ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                          fontWeight: 600,
                        }}
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

      <Dialog open={createDialogOpen} onClose={() => !creatingUser && setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add a team member</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Create a managed account and share the temporary password securely with the user.
          </Typography>
          {createError && <Alert severity="error" sx={{ mb: 2 }}>{createError}</Alert>}
          <Box component="form" autoComplete="off" sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <TextField required autoComplete="off" label="First name" value={newUser.userName} onChange={(e) => setNewUser((value) => ({ ...value, userName: e.target.value }))} />
            <TextField required autoComplete="off" label="Last name" value={newUser.userLastName} onChange={(e) => setNewUser((value) => ({ ...value, userLastName: e.target.value }))} />
            <TextField required type="email" autoComplete="off" label="Email" value={newUser.userEmail} onChange={(e) => setNewUser((value) => ({ ...value, userEmail: e.target.value }))} sx={{ gridColumn: { sm: '1 / -1' } }} />
            <TextField required type="password" autoComplete="new-password" label="Temporary password" helperText="At least 8 characters" value={newUser.userPassword} onChange={(e) => setNewUser((value) => ({ ...value, userPassword: e.target.value }))} />
            <TextField autoComplete="off" label="Phone (optional)" value={newUser.userPhone1} onChange={(e) => setNewUser((value) => ({ ...value, userPhone1: e.target.value }))} />
            <FormControl required sx={{ gridColumn: { sm: '1 / -1' } }}>
              <InputLabel>Role</InputLabel>
              <Select label="Role" value={newUser.roleId || ''} onChange={(e) => setNewUser((value) => ({ ...value, roleId: Number(e.target.value) }))}>
                {roles.filter((role) => role.roleName !== 'Superadmin').map((role) => (
                  <MenuItem key={role.roleId} value={role.roleId}>{role.roleName}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setCreateDialogOpen(false)} disabled={creatingUser}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateUser} disabled={creatingUser}>
            {creatingUser ? 'Creating…' : 'Create user'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Assign Role Dialog */}
      <Dialog
        open={assignRoleDialog.open}
        onClose={handleAssignRoleClose}
        maxWidth="sm"
        fullWidth
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
                <MenuItem 
                  value="SUPER_ADMIN"
                  disabled={isSuperAdminTaken && assignRoleDialog.selectedRole !== "SUPER_ADMIN"}
                >
                  <Box display="flex" alignItems="center" gap={1} justifyContent="space-between" width="100%">
                    <Box display="flex" alignItems="center" gap={1}>
                      <AdminIcon fontSize="small" />
                      <Box>
                        <Typography variant="body2" sx={{ 
                          color: 'text.primary',
                          fontWeight: 'bold',
                          textShadow: theme.palette.mode === 'dark' ? '0 1px 2px rgba(0,0,0,0.3)' : 'none'
                        }}>
                          Super Admin
                          {isSuperAdminTaken && (
                            <Typography component="span" variant="caption" color="error.main" sx={{ ml: 1, fontWeight: 600 }}>
                              (Already assigned)
                            </Typography>
                          )}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Complete system control. Only one allowed.
                        </Typography>
                      </Box>
                    </Box>
                    <Chip 
                      label={`${roleCounts.Superadmin}/1`} 
                      size="small" 
                      color={isSuperAdminTaken ? "error" : "success"}
                      variant="outlined"
                    />
                  </Box>
                </MenuItem>
                <MenuItem value="ADMIN">
                  <Box display="flex" alignItems="center" gap={1} justifyContent="space-between" width="100%">
                    <Box display="flex" alignItems="center" gap={1}>
                      <SupervisorIcon fontSize="small" />
                      <Box>
                        <Typography variant="body2" sx={{ 
                          color: 'text.primary',
                          fontWeight: 'bold',
                          textShadow: theme.palette.mode === 'dark' ? '0 1px 2px rgba(0,0,0,0.3)' : 'none'
                        }}>Admin</Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Can manage users, customers, tasks, and system settings.
                        </Typography>
                      </Box>
                    </Box>
                    <Chip 
                      label={roleCounts.Admin} 
                      size="small" 
                      color="primary"
                      variant="outlined"
                    />
                  </Box>
                </MenuItem>
                <MenuItem value="MODERATOR">
                  <Box display="flex" alignItems="center" gap={1} justifyContent="space-between" width="100%">
                    <Box display="flex" alignItems="center" gap={1}>
                      <PersonAddIcon fontSize="small" />
                      <Box>
                        <Typography variant="body2" sx={{ 
                          color: 'text.primary',
                          fontWeight: 'bold',
                          textShadow: theme.palette.mode === 'dark' ? '0 1px 2px rgba(0,0,0,0.3)' : 'none'
                        }}>Moderator</Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Can view and moderate users, customers, and tasks.
                        </Typography>
                      </Box>
                    </Box>
                    <Chip 
                      label={roleCounts.Moderator} 
                      size="small" 
                      color="warning"
                      variant="outlined"
                    />
                  </Box>
                </MenuItem>
                <MenuItem value="CUSTOMER">
                  <Box display="flex" alignItems="center" gap={1} justifyContent="space-between" width="100%">
                    <Box display="flex" alignItems="center" gap={1}>
                      <PersonIcon fontSize="small" />
                      <Box>
                        <Typography variant="body2" sx={{ 
                          color: 'text.primary',
                          fontWeight: 'bold',
                          textShadow: theme.palette.mode === 'dark' ? '0 1px 2px rgba(0,0,0,0.3)' : 'none'
                        }}>Customer</Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Regular user access with basic features.
                        </Typography>
                      </Box>
                    </Box>
                    <Chip 
                      label={roleCounts.Customer} 
                      size="small" 
                      color="default"
                      variant="outlined"
                    />
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
