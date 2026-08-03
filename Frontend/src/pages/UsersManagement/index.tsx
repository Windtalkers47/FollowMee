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
  Chip,
  Typography,
  CircularProgress,
  IconButton,
  Card,
  CardContent,
  useTheme,
  useMediaQuery,
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
import { alpha, styled } from '@mui/material/styles';
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
import feedback from '../../services/feedback.service';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import { formatLocalizedDate } from '../../utils/localeFormat';
import SmartAvatar from '../../components/SmartAvatar';
import { useAppSelector } from '../../store/store';

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
    case 'Owner':
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
    case 'Owner':
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
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { t, locale } = useUserPreferences();
  const {
    users,
    roles,
    loading,
    assigningRole,
    error,
    fetchUsers,
    assignRoleToUser,
    removeRoleFromUser,
    createUser,
    deleteUser,
    transferOwnership,
  } = useUsersManagement();
  const currentUser = useAppSelector((state) => state.auth.user);
  const currentUserIsOwner = Boolean(currentUser?.roles?.some((role) => normalizeRoleName(role) === ROLE_NAMES.OWNER));

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
  const [assignRoleError, setAssignRoleError] = useState('');

  // Calculate role counts
  const getRoleCounts = () => {
    const counts = {
      'Owner': 0,
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

  const isOwnerTaken = roleCounts.Owner >= 1;

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
  const selectedUserIsOwner = Boolean(
    assignRoleDialog.user?.roles?.some((role) => normalizeRoleName(role) === ROLE_NAMES.OWNER),
  );
  const [ownerTransferDialog, setOwnerTransferDialog] = useState<{ open: boolean; user: User | null; password: string; error: string }>({ open: false, user: null, password: '', error: '' });

  const handleAssignRoleOpen = useCallback((user: User) => {
    const normalizedRole = user.roles[0] ? normalizeRoleName(user.roles[0]) : undefined;
    const selectedRole = normalizedRole === ROLE_NAMES.OWNER
      ? 'OWNER'
      : normalizedRole?.toUpperCase() || '';
    setAssignRoleDialog({
      open: true,
      user,
      selectedRole,
      availableRoles: roles
    });
    setAssignRoleError('');
  }, [roles]);

  const handleAssignRoleClose = useCallback(() => {
    setAssignRoleDialog({
      open: false,
      user: null,
      selectedRole: '',
      availableRoles: []
    });
    setAssignRoleError('');
  }, []);

  const handleCreateUser = async () => {
    if (!newUser.userName.trim() || !newUser.userLastName.trim() ||
        !newUser.userEmail.trim() || newUser.userPassword.length < 8 || !newUser.roleId) {
      setCreateError(t('users.requiredFields'));
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
      const displayName = `${newUser.userName} ${newUser.userLastName}`.trim();
      setCreateDialogOpen(false);
      setNewUser(emptyNewUser);
      await feedback.success({
        title: t('users.createdTitle'),
        message: t('users.createdText', { name: displayName }),
        importance: 'milestone',
        dedupeKey: `user-created-${newUser.userEmail}`,
      });
    } else {
      setCreateError(t('users.createFailed'));
    }
  };

  const handleAssignRoleConfirm = useCallback(async () => {
    if (!assignRoleDialog.user || !assignRoleDialog.selectedRole) return;

    try {
      const normalizedSelectedRole = normalizeRoleName(assignRoleDialog.selectedRole);
      if (normalizedSelectedRole === ROLE_NAMES.OWNER) {
        setAssignRoleError(t('users.ownerTransferRequired'));
        await feedback.warning({
          title: t('users.ownerTransferTitle'),
          message: t('users.ownerTransferRequired'),
          dedupeKey: 'owner-transfer-required',
        });
        return;
      }

      const selectedRoleObj = roles.find(r => r.roleName === normalizedSelectedRole);
      
      if (!selectedRoleObj) {
        setAssignRoleError(t('users.invalidRole'));
        await feedback.error({
          title: t('users.assignmentFailed'),
          message: t('users.invalidRole'),
        });
        return;
      }

      setAssignRoleError('');
      const updatedUser = await assignRoleToUser(assignRoleDialog.user.userId, selectedRoleObj.roleId);

      if (updatedUser) {
        const displayName = `${updatedUser.userName} ${updatedUser.userLastName || ''}`.trim();
        const canonicalRole = updatedUser.role?.roleName || updatedUser.roles[0] || selectedRoleObj.roleName;
        handleAssignRoleClose();
        await feedback.success({
          title: t('users.roleChanged'),
          message: t('users.roleChangedText', { name: displayName, role: canonicalRole }),
          importance: 'milestone',
          entity: { type: 'user', id: updatedUser.userId, label: displayName },
          dedupeKey: `role-changed-${updatedUser.userId}-${canonicalRole}`,
          nextAction: {
            label: t('users.viewUser'),
            onClick: () => {
              document.querySelector(`[data-user-id="${updatedUser.userId}"]`)?.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
              });
            },
          },
        });
      } else {
        setAssignRoleError(t('users.assignmentTryAgain'));
        await feedback.error({
          title: t('users.assignmentFailed'),
          message: t('users.assignmentTryAgain'),
          retryAction: {
            label: t('feedback.retry'),
            onClick: () => document.getElementById('assign-role-submit')?.click(),
          },
          persistent: true,
          dedupeKey: `role-change-failed-${assignRoleDialog.user.userId}`,
        });
      }
    } catch (error) {
      console.error('Error assigning role:', error);
      setAssignRoleError(t('users.assignmentTryAgain'));
      await feedback.error({
        title: t('users.assignmentFailed'),
        message: error instanceof Error ? error.message : t('users.assignmentTryAgain'),
        persistent: true,
      });
    }
  }, [assignRoleDialog, roles, assignRoleToUser, handleAssignRoleClose, t]);

  const handleTransferOwner = useCallback(async () => {
    const target = ownerTransferDialog.user;
    if (!target || !ownerTransferDialog.password) return;
    const ok = await transferOwnership(target.userId, ownerTransferDialog.password);
    if (!ok) {
      setOwnerTransferDialog((value) => ({ ...value, error: t('users.ownerTransferFailed') }));
      return;
    }
    setOwnerTransferDialog({ open: false, user: null, password: '', error: '' });
    handleAssignRoleClose();
    await feedback.success({
      title: t('users.ownerTransferred'),
      message: t('users.ownerTransferredText', { name: `${target.userName} ${target.userLastName || ''}`.trim() }),
      importance: 'milestone',
      dedupeKey: `owner-transfer-${target.userId}`,
    });
  }, [handleAssignRoleClose, ownerTransferDialog, t, transferOwnership]);

  const handleRoleChange = useCallback((role: string) => {
    setAssignRoleDialog(prev => ({
      ...prev,
      selectedRole: role
    }));
  }, []);

  const handleDeleteUser = useCallback(async (user: User) => {
    const result = await feedback.fire({
      title: 'Are you sure?',
      text: t('users.deleteQuestion', { name: `${user.userName} ${user.userLastName || ''}`.trim() }),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: t('users.deleteConfirm'),
      cancelButtonText: t('common.cancel'),
      reverseButtons: true,
    });

    if (result.isConfirmed) {
      try {
        const success = await deleteUser(user.userId);
        if (success) {
          await feedback.fire({
            icon: 'success',
            importance: 'milestone',
            title: t('users.deletedTitle'),
            text: t('users.deletedText', { name: user.userName }),
            timer: 5000,
            timerProgressBar: true,
            showConfirmButton: false,
          });
        }
      } catch (error) {
        await feedback.fire({
          icon: 'error',
          title: t('feedback.failed'),
          text: t('users.deleteFailed'),
        });
      }
    }
  }, [deleteUser, t]);

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
        {t('users.title')}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        {t('users.intro')}
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
            {t('users.addMember')}
        </Button>
      )}

      <Box aria-hidden={!isMobile} sx={{ display: { xs: 'grid', md: 'none' }, gap: 1.5, mb: 2 }}>
        {users?.map((user) => (
          <Paper key={user.userId} variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
            <Box display="flex" alignItems="flex-start" gap={1.5}>
              <SmartAvatar user={user} size={40} />
              <Box flex={1} minWidth={0}>
                <Typography fontWeight={700}>{user.userName} {user.userLastName}</Typography>
                <Typography variant="body2" color="text.secondary" noWrap>{user.userEmail}</Typography>
                <Box display="flex" gap={0.75} flexWrap="wrap" sx={{ mt: 1.5 }}>
                  {user.roles?.map((role) => <Chip key={role} label={role.replace('_', ' ')} size="small" variant="outlined" />)}
                  {user.roles?.length === 0 && <Chip label={t('users.unassignedRole')} size="small" variant="outlined" color="warning" />}
                  <Chip label={user.isActive ? t('common.active') : t('common.inactive')} size="small" color={user.isActive ? 'success' : 'default'} variant="outlined" />
                </Box>
              </Box>
              <Box>
                <IconButton size="small" aria-label={t('users.manageRoles')} onClick={() => handleAssignRoleOpen(user)}><EditIcon fontSize="small" /></IconButton>
                <IconButton size="small" aria-label={t('users.deleteUser')} color="error" onClick={() => handleDeleteUser(user)}><DeleteIcon fontSize="small" /></IconButton>
              </Box>
            </Box>
          </Paper>
        ))}
      </Box>

      <StyledCard aria-hidden={isMobile} sx={{ display: { xs: 'none', md: 'block' } }}>
        <CardContent sx={{ p: 0 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t('common.user')}</TableCell>
                  <TableCell>{t('common.email')}</TableCell>
                  <TableCell>{t('common.roles')}</TableCell>
                  <TableCell>{t('common.status')}</TableCell>
                  <TableCell>{t('common.created')}</TableCell>
                  <TableCell align="center">{t('common.actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users?.map((user) => (
                  <TableRow key={user.userId} hover data-user-id={user.userId}>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={2}>
                        <SmartAvatar
                          user={user}
                          sx={{
                            bgcolor: user.userImageUrl ? 'transparent' : (user.isActive
                              ? theme.palette.primary.main
                              : theme.palette.grey[500]),
                          }}
                        />
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
                        {user.roles?.length === 0 && (
                          <Chip label={t('users.unassignedRole')} size="small" color="warning" variant="outlined" />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.isActive ? t('common.active') : t('common.inactive')}
                        size="small"
                        sx={{
                          bgcolor: alpha(user.isActive ? theme.palette.success.main : theme.palette.error.main, 0.12),
                          color: user.isActive ? 'success.main' : 'error.main',
                          border: `1px solid ${alpha(user.isActive ? theme.palette.success.main : theme.palette.error.main, 0.3)}`,
                          fontWeight: 600,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      {formatLocalizedDate(user.createdAt, locale)}
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title={t('users.manageRoles')}>
                        <IconButton
                          size="small"
                          onClick={() => handleAssignRoleOpen(user)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t('users.deleteUser')}>
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
        <DialogTitle>{t('users.addMember')}</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            {t('users.createHelp')}
          </Typography>
          {createError && <Alert severity="error" sx={{ mb: 2 }}>{createError}</Alert>}
          <Box component="form" autoComplete="off" sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <TextField required autoComplete="off" label={t('common.firstName')} value={newUser.userName} onChange={(e) => setNewUser((value) => ({ ...value, userName: e.target.value }))} />
            <TextField required autoComplete="off" label={t('common.lastName')} value={newUser.userLastName} onChange={(e) => setNewUser((value) => ({ ...value, userLastName: e.target.value }))} />
            <TextField required type="email" autoComplete="off" label={t('common.email')} value={newUser.userEmail} onChange={(e) => setNewUser((value) => ({ ...value, userEmail: e.target.value }))} sx={{ gridColumn: { sm: '1 / -1' } }} />
            <TextField required type="password" autoComplete="new-password" label={t('users.temporaryPassword')} helperText={t('users.passwordHint')} value={newUser.userPassword} onChange={(e) => setNewUser((value) => ({ ...value, userPassword: e.target.value }))} />
            <TextField autoComplete="off" label={t('common.phoneOptional')} value={newUser.userPhone1} onChange={(e) => setNewUser((value) => ({ ...value, userPhone1: e.target.value }))} />
            <FormControl required sx={{ gridColumn: { sm: '1 / -1' } }}>
              <InputLabel>{t('common.role')}</InputLabel>
              <Select label={t('common.role')} value={newUser.roleId || ''} onChange={(e) => setNewUser((value) => ({ ...value, roleId: Number(e.target.value) }))}>
                {roles.filter((role) => normalizeRoleName(role.roleName) !== ROLE_NAMES.OWNER).map((role) => (
                  <MenuItem key={role.roleId} value={role.roleId}>{role.roleName}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setCreateDialogOpen(false)} disabled={creatingUser}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={handleCreateUser} disabled={creatingUser}>
            {creatingUser ? t('users.creating') : t('users.createUser')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Assign Role Dialog */}
      <Dialog
        open={assignRoleDialog.open}
        onClose={() => !assigningRole && handleAssignRoleClose()}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {t('users.manageRolesFor', { name: `${assignRoleDialog.user?.userName || ''} ${assignRoleDialog.user?.userLastName || ''}`.trim() })}
        </DialogTitle>
        <DialogContent>
          <Box mt={2}>
            {assignRoleError && (
              <Alert severity="error" sx={{ mb: 2 }}>{assignRoleError}</Alert>
            )}
            <FormControl fullWidth>
              <InputLabel>{t('common.role')}</InputLabel>
              <Select
                value={assignRoleDialog.selectedRole}
                label={t('common.role')}
                onChange={(e) => handleRoleChange(e.target.value)}
                disabled={assigningRole}
              >
                <MenuItem 
                  value="OWNER"
                  disabled
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
                          {t('role.owner')}
                          {isOwnerTaken && (
                            <Typography component="span" variant="caption" color="error.main" sx={{ ml: 1, fontWeight: 600 }}>
                              ({t('users.ownerTransferOnly')})
                            </Typography>
                          )}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {t('role.ownerDescription')}
                        </Typography>
                      </Box>
                    </Box>
                    <Chip 
                      label={`${roleCounts.Owner}/1`}
                      size="small" 
                      color={isOwnerTaken ? "error" : "success"}
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
                        }}>{t('role.admin')}</Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {t('role.adminDescription')}
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
                        }}>{t('role.moderator')}</Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {t('role.moderatorDescription')}
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
                        }}>{t('role.customer')}</Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {t('role.customerDescription')}
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
          {currentUserIsOwner && assignRoleDialog.user && !selectedUserIsOwner && (
            <Button
              color="warning"
              onClick={() => setOwnerTransferDialog({ open: true, user: assignRoleDialog.user, password: '', error: '' })}
              disabled={assigningRole}
            >
              {t('users.transferOwner')}
            </Button>
          )}
          <Button onClick={handleAssignRoleClose} disabled={assigningRole}>{t('common.cancel')}</Button>
          <Button
            id="assign-role-submit"
            onClick={handleAssignRoleConfirm}
            variant="contained"
            disabled={!assignRoleDialog.selectedRole || assigningRole}
          >
            {assigningRole ? t('users.assigningRole') : t('users.assignRole')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={ownerTransferDialog.open} onClose={() => !assigningRole && setOwnerTransferDialog({ open: false, user: null, password: '', error: '' })} maxWidth="xs" fullWidth>
        <DialogTitle>{t('users.ownerTransferTitle')}</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            {t('users.ownerTransferConsequence', { name: `${ownerTransferDialog.user?.userName || ''} ${ownerTransferDialog.user?.userLastName || ''}`.trim() })}
          </Typography>
          {ownerTransferDialog.error && <Alert severity="error" sx={{ mb: 2 }}>{ownerTransferDialog.error}</Alert>}
          <TextField
            autoFocus
            fullWidth
            type="password"
            label={t('users.currentPassword')}
            value={ownerTransferDialog.password}
            disabled={assigningRole}
            onChange={(event) => setOwnerTransferDialog((value) => ({ ...value, password: event.target.value, error: '' }))}
          />
        </DialogContent>
        <DialogActions>
          <Button color="inherit" disabled={assigningRole} onClick={() => setOwnerTransferDialog({ open: false, user: null, password: '', error: '' })}>{t('common.cancel')}</Button>
          <Button color="warning" variant="contained" disabled={assigningRole || !ownerTransferDialog.password} onClick={handleTransferOwner}>
            {assigningRole ? t('users.transferringOwner') : t('users.confirmTransferOwner')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UsersPage;
