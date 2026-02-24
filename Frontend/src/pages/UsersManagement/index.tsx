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
  Alert,
  Snackbar,
  IconButton,
  Card,
  CardContent,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  PersonAdd as PersonAddIcon,
  MoreHoriz as MoreHorizIcon,
  AdminPanelSettings as AdminIcon,
  SupervisorAccount as SupervisorIcon,
  Person as PersonIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

import { useUsersManagement, User, Role } from '../../hooks/useUsersManagement';

// Styled components
const StyledCard = styled(Card)(({ theme }) => ({
  borderRadius: 12,
  boxShadow: '0 4px 20px 0 rgba(0,0,0,0.05)',
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
    removeRoleFromUser
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

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'info'
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
        setSnackbar({
          open: true,
          message: 'Selected role not found',
          severity: 'error'
        });
        return;
      }

      const success = await assignRoleToUser(assignRoleDialog.user.userId, selectedRoleObj.roleId);

      if (success) {
        setSnackbar({
          open: true,
          message: `Role "${assignRoleDialog.selectedRole}" assigned successfully`,
          severity: 'success'
        });
      } else {
        setSnackbar({
          open: true,
          message: 'Failed to assign role',
          severity: 'error'
        });
      }
    } catch (error) {
      console.error('Error assigning role:', error);
      setSnackbar({
        open: true,
        message: 'An error occurred while assigning the role',
        severity: 'error'
      });
    }

    handleAssignRoleClose();
  }, [assignRoleDialog, roles, assignRoleToUser, handleAssignRoleClose]);

  const handleSnackbarClose = useCallback(() => {
    setSnackbar(prev => ({ ...prev, open: false }));
  }, []);

  const handleRoleChange = useCallback((role: string) => {
    setAssignRoleDialog(prev => ({
      ...prev,
      selectedRole: role
    }));
  }, []);

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
                          sx={{
                            bgcolor: user.isActive
                              ? theme.palette.primary.main
                              : theme.palette.grey[500]
                          }}
                        >
                          {user.userName.charAt(0)}
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
                      <Tooltip title="More Actions">
                        <IconButton size="small">
                          <MoreHorizIcon fontSize="small" />
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

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default UsersPage;
