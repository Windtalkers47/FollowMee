import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Button, 
  Tooltip,
  TablePagination, 
  Checkbox, 
  Avatar, 
  Chip, 
  Typography, 
  CircularProgress, 
  IconButton,
  Card,
  CardContent,
  Badge,
  useTheme,
  Paper,
  Alert,
} from '@mui/material';
import feedback from '../../services/feedback.service';
import { alpha } from '@mui/material/styles';
import { CustomerStatus } from '../../types/customer.types';
import { CustomerFormData } from '@/components/customers/CustomerForm';
import { 
  Group as GroupIcon,
  PersonAdd as PersonAddIcon,
  CheckCircle as CheckCircleIcon,
  Block as BlockIcon,
  AccessTime as AccessTimeIcon,
  MusicNote as MusicNoteIcon,
  Message as MessageIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  CalendarToday as CalendarIcon,
  MoreHoriz as MoreHorizIcon,
  Facebook as FacebookIcon,
  Instagram as InstagramIcon,
  Twitter as TwitterIcon
} from '@mui/icons-material';

import { useCustomers } from '../../hooks/useCustomers';
import FilterMenu from '../../components/customers/FilterMenu';
import CustomerForm from '@/components/customers/CustomerForm';
import ActionMenu from '@/components/ActionMenu';
import { FilterBar } from '@/components/FilterBar';
import { customerApi } from '../../api/customer.api';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import { formatLocalizedDate } from '../../utils/localeFormat';
import { normalizeSocialUrl } from '../../utils/socialUrl';
import { useQuery } from '@tanstack/react-query';
import { userApi } from '../../api/user.api';
import CustomerPageHeader from '../../components/customers/CustomerPageHeader';
import {
  CustomerEngagementMeter,
  CustomerStatCard,
} from '../../components/customers/CustomerOverview';
import { getCustomerEngagementScore } from '../../utils/customerEngagement';
import { userFacingMutationError } from '../../utils/userFacingError';
import { useCustomerPageController } from '../../hooks/useCustomerPageController';
import { PageLoading, PageShell } from '../../components/PageState';
import CustomerMergeDialog from '../../components/customers/CustomerMergeDialog';

// ============================================
// Main Component
// ============================================
const CustomerPage = () => {
  const [mergeOpen, setMergeOpen] = React.useState(false);
  const navigate = useNavigate();
  const { t, locale } = useUserPreferences();
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const {
    customers,
    loading,
    error,
    page,
    pageSize,
    total,
    filter,
    handlePageChange,
    handlePageSizeChange,
    handleFilterChange,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    refetch,
    getStatusCount,
  } = useCustomers();

  const { data: activeUsers = [] } = useQuery({ queryKey: ['assignable-users'], queryFn: userApi.getAssignableUsers });
  const {
    focusMissingImage, clearFocus,
    searchInput, setSearchInput, tabValue, setTabValue,
    selected, setSelected, toggleSelected,
    actionMenuAnchorEl, openActionMenu, closeActionMenu,
    selectedMember,
    filterAnchorEl, setFilterAnchorEl,
    isFormOpen, setIsFormOpen,
    editingCustomer, setEditingCustomer,
    formApiError, setFormApiError,
    openForm, closeForm,
  } = useCustomerPageController({ customers, filterSearch: filter.search, onFilterChange: handleFilterChange });

  // Keep all hooks above this branch so the initial loading transition cannot
  // change the hook order when the first customer request is in flight.
  if (loading && customers.length === 0) {
    return <PageShell maxWidth={1600}><PageLoading label={t('customers.loading')} /></PageShell>;
  }

  // ใช้ customers โดยตรงจาก API แทนการ filter ใน frontend
  // เพราะ API ส่งข้อมูลที่มี pagination มาแล้ว
  const displayCustomers = customers;
  const canDeleteSelected = selected.length > 0 && selected.every(id => displayCustomers.find(customer => customer.customerId === id)?.capabilities.canDelete);

  const totalCustomers = getStatusCount('active') + getStatusCount('inactive') + getStatusCount('canceled');

  const handlePageChangeEvent = (_: React.MouseEvent<HTMLButtonElement> | null, newPage: number) => {
    handlePageChange(newPage + 1);
  };

  const handleChangeRowsPerPage = (e: React.ChangeEvent<HTMLInputElement>) => {
    handlePageSizeChange(parseInt(e.target.value, 10));
  };

  const handleFilterClick = (event: React.MouseEvent<HTMLElement>) => {
    setFilterAnchorEl(event.currentTarget);
  };

  const handleFormSubmit = async (formData: CustomerFormData & { base64Image?: string }) => {
    setFormApiError(null);
    
    try {
      const payload = {
        assignedTo: formData.assignedTo,
        customerName: formData.customerName || '',
        customerLastName: formData.customerLastName || null,
        customerEmail: formData.customerEmail || '',
        customerPhone1: formData.customerPhone1 || null,
        customerPhone2: formData.customerPhone2 || null,
        customerFacebook: formData.customerFacebook || null,
        customerInstagram: formData.customerInstagram || null,
        customerTikTok: formData.customerTikTok || null,
        customerLine: formData.customerLine || null,
        customerX: formData.customerX || null,
        customerAddress: formData.customerAddress || null,
        imageCrop: formData.imageCrop || null,
        status: (formData.isActive ? 'active' : 'inactive') as CustomerStatus,
        isActive: formData.isActive || false,
        updatedAt: new Date().toISOString(),
        deletedAt: null,
        ...(formData.base64Image ? { base64Image: formData.base64Image } : {}),
        ...(formData.removeImage ? { removeImage: formData.removeImage } : {}),
        ...(editingCustomer ? { createdAt: editingCustomer.createdAt } : { createdAt: new Date().toISOString() }),
      };
      const duplicateCheck = await customerApi.checkDuplicates(payload, editingCustomer?.customerId);
      if (duplicateCheck.emailConflict) {
        setFormApiError({ field: 'customerEmail', message: t('customers.emailConflict') });
        return;
      }
      if (duplicateCheck.matches.length) {
        const confirmation = await feedback.confirm({ title: t('customers.duplicatePossible'), message: duplicateCheck.matches.map(match => match.displayName).join(', '), consequence: t('customers.duplicateConsequence'), confirmLabel: t('customers.saveAnyway'), cancelLabel: t('common.cancel') });
        if (!confirmation.isConfirmed) return;
      }
  
      let result;
      if (editingCustomer) {
        result = await updateCustomer(editingCustomer.customerId, payload);
        if (result.success && formData.assignedTo && formData.assignedTo !== editingCustomer.assignedTo) {
          await customerApi.reassignCustomer(editingCustomer.customerId, formData.assignedTo);
        }
      } else {
        result = await createCustomer(payload);
      }
  
      feedback.close();
  
      if (result && !result.success) {
        const isEmailError = result.message?.toLowerCase().includes('email');
        await feedback.fire({
          icon: 'error',
          title: t('customers.operationFailed'),
          text: isEmailError ? t('customers.emailConflict') : t('feedback.tryAgain'),
        });
        
        if (isEmailError) {
          setFormApiError({ field: 'customerEmail', message: t('customers.emailConflict') });
        }
        return;
      }
  
      const savedFeedback = await feedback.fire({
        icon: 'success',
        title: t('common.success'),
        text: t('customers.saved'),
        timer: 2000,
        timerProgressBar: true,
        showConfirmButton: !editingCustomer,
        showCancelButton: !editingCustomer,
        confirmButtonText: t('customers.createProfileNow'),
        cancelButtonText: t('common.later'),
      });
      const createdCustomerId = (result as { data?: { customerId?: string } })?.data?.customerId;
      if (!editingCustomer && savedFeedback.isConfirmed && createdCustomerId) navigate(`/customer-profile/new?customerId=${createdCustomerId}`);
      setIsFormOpen(false);
      setEditingCustomer(null);
      refetch();
  
    } catch (error: unknown) {
      console.error('Error saving customer:', error);
      const message = userFacingMutationError(error, t);
      await feedback.fire({ icon: 'error', title: message.title, text: message.message });
    }
  };
  
  const isSelected = (id: string) => selected.includes(id);

  return (
    <PageShell maxWidth={1600} sx={{
      width: '100%',
      background: theme.palette.background.default,
      minHeight: '100vh',
      pb: { xs: 'calc(88px + env(safe-area-inset-bottom, 0px))', md: 6 },
    }}>
      <CustomerMergeDialog open={mergeOpen} customers={displayCustomers.filter(customer => selected.includes(customer.customerId))} onClose={() => setMergeOpen(false)} onMerged={() => { setSelected([]); refetch(); }} />
      <CustomerForm
        open={isFormOpen}
        onClose={closeForm}
        onSubmit={handleFormSubmit}
        initialData={editingCustomer ? {
          ...editingCustomer,
          assignedTo: editingCustomer.assignedTo || undefined,
          isActive: editingCustomer.status === 'active',
          customerLastName: editingCustomer.customerLastName || undefined,
          customerPhone1: editingCustomer.customerPhone1 || undefined,
          customerPhone2: editingCustomer.customerPhone2 || undefined,
          customerFacebook: editingCustomer.customerFacebook || undefined,
          customerInstagram: editingCustomer.customerInstagram || undefined,
          customerTikTok: editingCustomer.customerTikTok || undefined,
          customerLine: editingCustomer.customerLine || undefined,
          customerX: editingCustomer.customerX || undefined,
          customerAddress: editingCustomer.customerAddress || undefined,
        } : undefined}
        canReassign={editingCustomer?.capabilities.canReassign ?? true}
        apiError={formApiError}
        onClearApiError={() => setFormApiError(null)}
      />

      <Box sx={{ maxWidth: 1600, mx: 'auto' }}>
        
        <Box sx={{ pt: { xs: 4, md: 6 } }}><CustomerPageHeader loading={loading} t={t} onAdd={() => openForm()} onRefresh={refetch} /></Box>

        {focusMissingImage && (
          <Alert severity="info" sx={{ mb: 3 }} action={<Button color="inherit" onClick={clearFocus}>{t('customers.showAll')}</Button>}>
            {t('customers.missingImageFocus')}
          </Alert>
        )}

        {error && (
          <Alert
            severity={customers.length ? 'warning' : 'error'}
            sx={{ mb: 3 }}
            action={<Button color="inherit" size="small" onClick={refetch}>{t('feedback.retry')}</Button>}
          >
            <Typography fontWeight={700}>
              {customers.length ? t('customers.staleDataTitle') : t('customers.loadFailedTitle')}
            </Typography>
            <Typography variant="body2">
              {customers.length ? t('customers.staleDataText') : t('feedback.networkHelp')}
              {error.requestId ? ` · ${t('customers.requestId', { id: error.requestId })}` : ''}
            </Typography>
          </Alert>
        )}

        {/* Stats Dashboard - 4 Cards Grid */}
        <Box 
          display="grid" 
          gridTemplateColumns={{ xs: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, 1fr)' }}
          gap={{ xs: 1.25, sm: 2, md: 3 }}
          mb={{ xs: 3, md: 5 }}
        >
          <CustomerStatCard
            title={t('customers.total')}
            value={totalCustomers}
            subtitle={t('customers.activeCount', { count: getStatusCount('active') })}
            icon={<GroupIcon sx={{ fontSize: 32 }} />}
            iconBg={alpha(theme.palette.primary.main, 0.12)}
            iconColor={theme.palette.primary.main}
          />
          <CustomerStatCard
            title={t('customers.activeNow')}
            value={getStatusCount('active')}
            subtitle={t('customers.percentTotal', { percent: totalCustomers > 0 ? Math.round((getStatusCount('active') / totalCustomers) * 100) : 0 })}
            icon={<CheckCircleIcon sx={{ fontSize: 32 }} />}
            iconBg={alpha(theme.palette.success.main, 0.12)}
            iconColor={theme.palette.success.main}
            trend={{ value: 5, direction: 'up' }}
          />
          <CustomerStatCard
            title={t('customers.inactive')}
            value={getStatusCount('inactive')}
            subtitle={t('customers.needsAttention')}
            icon={<AccessTimeIcon sx={{ fontSize: 32 }} />}
            iconBg={alpha(theme.palette.warning.main, 0.15)}
            iconColor={theme.palette.warning.main}
          />
          <CustomerStatCard
            title={t('customers.canceled')}
            value={getStatusCount('canceled')}
            subtitle={t('customers.noLongerActive')}
            icon={<BlockIcon sx={{ fontSize: 32 }} />}
            iconBg={alpha(theme.palette.error.main, 0.15)}
            iconColor={theme.palette.error.main}
          />
        </Box>

        {/* Search & Filter Bar - Floating Design */}
        <Box mb={4}>
          <Card
            sx={{
              borderRadius: 3,
              overflow: 'hidden',
              background: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: 'none',
            }}
          >
            <FilterBar
              searchValue={searchInput}
              onSearchChange={(value) => {
                setSearchInput(value);
                if (value.trim() === '') {
                  handleFilterChange({ search: '' });
                }
              }}
              onSearch={(value) => {
                if (!value || value.trim() === '') {
                  setSearchInput('');
                  // iOS 2026: Clear search → Reset to default state (show all data)
                  handleFilterChange({ search: '' });
                } else {
                  handleFilterChange({ search: value });
                }
              }}
              onClear={() => {
                setSearchInput('');
                // iOS 2026: Instant reset to default state
                // handleFilterChange จะ reset pageSize เป็น 100 อัตโนมัติ
                handleFilterChange({ search: '' });
              }}
              onRefresh={() => {
                // iOS 2026: Refetch โดย reset page เป็น 1
                handlePageChange(1);
              }}
              searchPlaceholder={t('customers.searchPlaceholder')}
              loading={loading}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 3,
                  bgcolor: isDarkMode ? 'rgba(51, 65, 85, 0.5)' : 'rgba(255, 255, 255, 0.8)',
                },
              }}
            >
              <Button variant="outlined" onClick={handleFilterClick}>
                {t('schedule.moreFilters')}
              </Button>
            </FilterBar>
          </Card>
        </Box>

        {/* Tabs - iOS Segmented Control Style with Horizontal Scroll on Mobile */}
        <Box mb={4} sx={{ overflowX: 'auto', overflowY: 'hidden', '&::-webkit-scrollbar': { display: 'none' }, scrollbarWidth: 'none' }}>
          <Box
            sx={{
              display: 'inline-flex',
              backgroundColor: 'action.hover',
              borderRadius: 3,
              p: 1,
              minWidth: '100%',
            }}
          >
            {[
              { label: t('customers.all'), icon: GroupIcon, count: totalCustomers },
              { label: t('common.active'), icon: CheckCircleIcon, count: getStatusCount('active') },
              { label: t('common.inactive'), icon: AccessTimeIcon, count: getStatusCount('inactive') },
              { label: t('common.canceled'), icon: BlockIcon, count: getStatusCount('canceled') },
            ].map((tab, index) => {
              const isActive = tabValue === index;
              const getIconColor = () => {
                if (index === 0) return 'primary';
                if (index === 1) return 'success';
                if (index === 2) return 'warning';
                return 'error';
              };
              
              return (
                <Button
                  key={tab.label}
                  onClick={() => {
                    setTabValue(index);
                    const statuses = ['all', 'active', 'inactive', 'canceled'] as const;
                    handleFilterChange({ status: statuses[index], search: filter.search });
                  }}
                  startIcon={<tab.icon fontSize="small" color={isActive ? getIconColor() : 'inherit'} />}
                  endIcon={
                    <Chip
                      label={tab.count}
                      size="small"
                      sx={{
                        ml: 0.5,
                        height: 20,
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        bgcolor: isActive ? 'rgba(255,255,255,0.3)' : 'transparent',
                        color: isActive ? 'inherit' : 'text.secondary',
                        minWidth: 24,
                      }}
                    />
                  }
                  sx={{
                    borderRadius: 2,
                    px: { xs: 2, sm: 3 },
                    py: 1.5,
                    minHeight: 44,
                    minWidth: 'auto',
                    mx: 0.5,
                    textTransform: 'none',
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? 'primary.main' : 'text.secondary',
                    backgroundColor: isActive ? 'background.paper' : 'transparent',
                    boxShadow: 'none',
                    transition: 'background-color .18s ease, color .18s ease',
                    whiteSpace: 'nowrap',
                    '&:hover': {
                      backgroundColor: 'background.paper',
                    },
                  }}
                >
                  {tab.label}
                </Button>
              );
            })}
          </Box>
        </Box>

        {/* Bulk Actions Bar */}
        {selected.length > 0 && (
          <Paper 
            sx={{ 
              p: 2, 
              mb: 3, 
              borderRadius: 3, 
              backgroundColor: 'background.paper',
              color: 'text.primary',
              border: '1px solid',
              borderColor: 'divider',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              animation: 'slideDown 0.3s ease',
              position: 'sticky',
              top: 0,
              zIndex: 1000,
              boxShadow: 'none',
              flexWrap: 'wrap',
              gap: 1.5,
            }}
          >
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              {t('customers.selectedCount', { count: selected.length })}
            </Typography>
            <Box display="flex" gap={1} flexWrap="wrap">
              {selected.length === 2 && <Button size="small" variant="outlined" disabled={!canDeleteSelected} onClick={() => setMergeOpen(true)}>{t('customers.merge.action')}</Button>}
              <Button 
                size="small" 
                variant="contained"
                startIcon={<CheckCircleIcon />}
                sx={{ 
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  fontWeight: 600,
                  px: 2,
                  '&:hover': { bgcolor: 'primary.dark' }
                }}
                onClick={async () => {
                  const result = await feedback.fire({
                    title: t('common.active'),
                    text: t('customers.markQuestion', { count: selected.length, status: t('common.active') }),
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonText: t('customers.markConfirm', { status: t('common.active') })
                  });
                  
                  if (result.isConfirmed) {
                    try {
                      await customerApi.bulkUpdateStatus(selected, 'active');
                      await feedback.fire({
                        icon: 'success',
                        title: t('common.success'),
                        text: t('customers.marked', { count: selected.length, status: t('common.active') }),
                        timer: 2000,
                        timerProgressBar: true,
                        showConfirmButton: false
                      });
                      setSelected([]);
                      refetch();
                    } catch {
                      await feedback.fire({
                        icon: 'error',
                        title: t('common.error'),
                        text: t('customers.updateFailed'),
                      });
                    }
                  }
                }}
              >
                {t('customers.markActive')}
              </Button>
              <Button 
                size="small" 
                variant="outlined"
                startIcon={<AccessTimeIcon />}
                sx={{ 
                  color: 'text.primary',
                  fontWeight: 600,
                  px: 2,
                  '&:hover': { bgcolor: 'action.hover' }
                }}
                onClick={async () => {
                  const result = await feedback.fire({
                    title: t('common.inactive'),
                    text: t('customers.markQuestion', { count: selected.length, status: t('common.inactive') }),
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonText: t('customers.markConfirm', { status: t('common.inactive') })
                  });
                  
                  if (result.isConfirmed) {
                    try {
                      await customerApi.bulkUpdateStatus(selected, 'inactive');
                      await feedback.fire({
                        icon: 'success',
                        title: t('common.success'),
                        text: t('customers.marked', { count: selected.length, status: t('common.inactive') }),
                        timer: 2000,
                        timerProgressBar: true,
                        showConfirmButton: false
                      });
                      setSelected([]);
                      refetch();
                    } catch {
                      await feedback.fire({
                        icon: 'error',
                        title: t('common.error'),
                        text: t('customers.updateFailed'),
                      });
                    }
                  }
                }}
              >
                {t('customers.markInactive')}
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<BlockIcon />}
                disabled={!canDeleteSelected}
                sx={{
                  color: 'error.main',
                  borderColor: 'error.main',
                  fontWeight: 600,
                  px: 2,
                  '&:hover': { bgcolor: 'error.main', color: 'error.contrastText' }
                }}
                onClick={async () => {
                  const result = await feedback.fire({
                    title: t('customers.deleteManyTitle'),
                    text: t('customers.deleteManyQuestion', { count: selected.length }),
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: t('customers.deleteConfirm'),
                  });

                  if (result.isConfirmed) {
                    try {
                      await customerApi.bulkDelete(selected);
                      await feedback.fire({
                        icon: 'success',
                        title: t('common.deleted'),
                        text: t('customers.deletedMany', { count: selected.length }),
                        timer: 2000,
                        timerProgressBar: true,
                        showConfirmButton: false,
                      });
                      setSelected([]);
                      refetch();
                    } catch {
                      await feedback.fire({
                        icon: 'error',
                        title: t('common.error'),
                        text: t('customers.deleteFailed'),
                      });
                    }
                  }
                }}
              >
                {t('common.delete')}
              </Button>
              <Button
                size="small"
                variant="outlined"
                sx={{
                  color: 'text.secondary',
                  borderColor: 'divider',
                  borderWidth: 1.5,
                  '&:hover': {
                    bgcolor: 'action.hover',
                    borderColor: 'text.secondary',
                  }
                }}
                onClick={() => setSelected([])}
              >
                {t('customers.clearSelection')}
              </Button>
            </Box>
          </Paper>
        )}

        {/* Customer List - Card-based Layout with Mobile Responsive */}
        <Box>
          {loading && displayCustomers.length === 0 ? (
            <Box textAlign="center" py={8}>
              <CircularProgress size={40} color="primary" />
              <Typography variant="body2" color="text.secondary" mt={2}>
                {t('customers.loading')}
              </Typography>
            </Box>
          ) : displayCustomers.length === 0 ? (
            <Card
              sx={{
                borderRadius: 4,
                p: 8,
                textAlign: 'center',
                backgroundColor: 'background.paper',
              }}
            >
              <GroupIcon sx={{ fontSize: 80, color: 'text.disabled', mb: 3, opacity: 0.3 }} />
              <Typography variant="h5" fontWeight={600} gutterBottom>
                {t('customers.empty')}
              </Typography>
              <Typography variant="body1" color="text.secondary" mb={3}>
                {focusMissingImage
                  ? t('customers.missingImageEmptyHint')
                  : searchInput ? t('customers.searchEmptyHint') : t('customers.addEmptyHint')}
              </Typography>
              <Button
                variant="contained"
                startIcon={focusMissingImage ? undefined : <PersonAddIcon />}
                onClick={focusMissingImage ? clearFocus : () => openForm()}
                sx={{
                  borderRadius: 3,
                  textTransform: 'none',
                  px: 4,
                  py: 1.5,
                  fontWeight: 600,
                }}
              >
                {focusMissingImage ? t('customers.showAll') : t('customers.addFirst')}
              </Button>
            </Card>
          ) : (
            displayCustomers.map((customer) => {
              const engagementScore = getCustomerEngagementScore(customer);
              const isItemSelected = isSelected(customer.customerId);
              
              return (
                <Card
                  key={customer.customerId}
                  onClick={(e) => toggleSelected(e, customer.customerId)}
                  sx={{
                    backgroundColor: 'background.paper',
                    boxShadow: 'none',
                    borderRadius: 3,
                    mb: 2,
                    transition: 'border-color .18s ease, background-color .18s ease',
                    cursor: 'pointer',
                    border: isItemSelected ? `2px solid ${theme.palette.primary.main}` : `1px solid ${theme.palette.divider}`,
                    '&:hover': {
                      borderColor: 'primary.main',
                      backgroundColor: 'action.hover',
                    },
                  }}
                >
                  <CardContent sx={{ p: { xs: 2, sm: 2.5 }, '&:last-child': { pb: { xs: 2, sm: 2.5 } } }}>
                    {/* Desktop Layout - Horizontal */}
                    <Box display={{ xs: 'block', sm: 'flex' }} alignItems="center" gap={3} flexWrap="wrap">
                      {/* Checkbox & Avatar - Always on left/top */}
                      <Box display="flex" alignItems="center" gap={2}>
                        <Box onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            color="primary"
                            checked={isItemSelected}
                            disabled={!customer.capabilities.canEdit}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSelected(e, customer.customerId);
                            }}
                            sx={{ '&.Mui-checked': { color: theme.palette.primary.main } }}
                          />
                        </Box>
                        
                        {/* Avatar with Status Badge */}
                        <Badge
                          overlap="circular"
                          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                          badgeContent={
                            <Box
                              sx={{
                                width: 14,
                                height: 14,
                                borderRadius: '50%',
                                bgcolor:
                                  customer.status === 'active' ? 'success.main' :
                                  customer.status === 'inactive' ? 'warning.main' : 'error.main',
                                border: `3px solid ${isDarkMode ? '#1e293b' : '#fff'}`,
                                boxShadow: customer.status === 'active' ? '0 0 8px rgba(16, 185, 129, 0.5)' : 'none',
                              }}
                            />
                          }
                        >
                          <Avatar
                            src={customer.customerImageUrl || undefined}
                            imgProps={{ crossOrigin: 'anonymous' }}
                            alt={customer.fullName || customer.customerName}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              if (target) target.src = '';
                            }}
                            sx={{
                              width: { xs: 44, sm: 52 },
                              height: { xs: 44, sm: 52 },
                              bgcolor: 'primary.light',
                              color: 'primary.contrastText',
                              fontSize: { xs: '1.1rem', sm: '1.25rem' },
                              fontWeight: 600,
                              '& .MuiAvatar-img': { objectFit: 'cover' }
                            }}
                          >
                            {(!customer.customerImageUrl || customer.customerImageUrl === '') && (
                              <>
                                {customer.customerName.charAt(0).toUpperCase()}
                                {customer.customerLastName?.charAt(0).toUpperCase() || ''}
                              </>
                            )}
                          </Avatar>
                        </Badge>
                      </Box>
                      
                      {/* Customer Info - Full width on mobile */}
                      <Box sx={{ flex: 1, minWidth: 0, width: { xs: '100%', sm: 'auto' } }}>
                        <Box display="flex" alignItems="center" gap={1} mb={0.5} flexWrap="wrap">
                          <Typography variant="subtitle1" fontWeight={600} noWrap sx={{ maxWidth: { xs: '100%', sm: '200px' } }}>
                            {customer.fullName || `${customer.customerName} ${customer.customerLastName || ''}`.trim()}
                          </Typography>
                          {customer.status === 'active' && (
                            <Tooltip title={t('customers.verified')} arrow>
                              <CheckCircleIcon fontSize="small" sx={{ color: 'success.main', fontSize: 18 }} />
                            </Tooltip>
                          )}
                        </Box>
                        <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                          <EmailIcon fontSize="small" sx={{ color: 'text.secondary', opacity: 0.7, flexShrink: 0 }} />
                          <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: { xs: '100%', sm: '200px' } }}>
                            {customer.customerEmail}
                          </Typography>
                        </Box>
                      </Box>
                      
                      {/* Status Chip & Engagement - Row on mobile */}
                      <Box display="flex" alignItems="center" gap={2} flexWrap="wrap" sx={{ width: { xs: '100%', sm: 'auto' } }}>
                        <Chip
                          label={customer.status}
                          size="small"
                          sx={{
                            minWidth: 80,
                            height: 28,
                            borderRadius: 2,
                            fontWeight: 600,
                            fontSize: { xs: '0.7rem', sm: '0.75rem' },
                            bgcolor: alpha(
                              customer.status === 'active' ? theme.palette.success.main :
                              customer.status === 'inactive' ? theme.palette.warning.main : theme.palette.error.main,
                              0.12,
                            ),
                            color:
                              customer.status === 'active' ? 'success.main' :
                              customer.status === 'inactive' ? 'warning.main' : 'error.main',
                            border: `1px solid ${alpha(
                              customer.status === 'active' ? theme.palette.success.main :
                              customer.status === 'inactive' ? theme.palette.warning.main : theme.palette.error.main,
                              0.3,
                            )}`,
                          }}
                        />
                        
                        {/* Engagement */}
                        <Box sx={{ minWidth: 100, flex: { xs: 1, sm: 0 } }}>
                          <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.5}>
                            <Typography variant="caption" color="text.secondary" fontWeight={500}>
                              {t('customers.engagement')}
                            </Typography>
                            <Typography 
                              variant="body2" 
                              fontWeight={700}
                              sx={{
                                color: engagementScore > 70 ? 'success.main' : engagementScore > 40 ? 'warning.main' : 'error.main'
                              }}
                            >
                              {engagementScore}%
                            </Typography>
                          </Box>
                          <CustomerEngagementMeter value={engagementScore} />
                        </Box>
                      </Box>
                      
                      {/* Contact Info - Full width on mobile */}
                      <Box display="flex" alignItems="center" gap={2} flexWrap="wrap" sx={{ width: { xs: '100%', sm: 'auto' }, pt: { xs: 1, sm: 0 } }}>
                        <Box display="flex" alignItems="center" gap={1}>
                          <PhoneIcon fontSize="small" sx={{ color: 'text.secondary', opacity: 0.7, flexShrink: 0 }} />
                          {customer.customerPhone1 ? (
                            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                              {customer.customerPhone1}
                            </Typography>
                          ) : (
                            <Typography variant="body2" color="text.disabled">-</Typography>
                          )}
                        </Box>
                        <Box display="flex" alignItems="center" gap={1}>
                          <CalendarIcon fontSize="small" sx={{ color: 'text.secondary', opacity: 0.7, flexShrink: 0 }} />
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                            {formatLocalizedDate(customer.createdAt, locale)}
                          </Typography>
                        </Box>
                      </Box>
                      
                      {/* Social Media & Actions - Consistent Grid Layout */}
                      <Box 
                        display="flex" 
                        alignItems="center" 
                        gap={0.5}
                        sx={{ 
                          width: { xs: '100%', sm: 'auto' },
                          pt: { xs: 1, sm: 0 },
                        }}
                      >
                        {/* Facebook */}
                        <Tooltip 
                          title={customer.customerFacebook ? "Facebook" : t('customers.noSocialData', { network: 'Facebook' })}
                          arrow
                        >
                          <Box
                            component={customer.customerFacebook ? 'a' : 'span'}
                            href={normalizeSocialUrl(customer.customerFacebook, 'facebook')}
                            target={customer.customerFacebook ? "_blank" : undefined}
                            rel={customer.customerFacebook ? 'noopener noreferrer' : undefined}
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation();
                            }}
                            sx={{
                              width: { xs: 44, sm: 44 },
                              height: { xs: 44, sm: 44 },
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              bgcolor: customer.customerFacebook ? '#1877F2' : 'rgba(128, 128, 128, 0.3)',
                              color: customer.customerFacebook ? 'white' : 'rgba(255, 255, 255, 0.5)',
                              opacity: customer.customerFacebook ? 1 : 0.5,
                              cursor: customer.customerFacebook ? 'pointer' : 'not-allowed',
                              transition: 'all 0.2s ease',
                              '&:hover': customer.customerFacebook ? { 
                                bgcolor: '#166FE5', 
                                transform: 'scale(1.1)',
                              } : {},
                            }}
                          >
                            <FacebookIcon fontSize="small" />
                          </Box>
                        </Tooltip>

                        {/* Instagram */}
                        <Tooltip 
                          title={customer.customerInstagram ? "Instagram" : t('customers.noSocialData', { network: 'Instagram' })}
                          arrow
                        >
                          <Box
                            component={customer.customerInstagram ? 'a' : 'span'}
                            href={normalizeSocialUrl(customer.customerInstagram, 'instagram')}
                            target={customer.customerInstagram ? "_blank" : undefined}
                            rel={customer.customerInstagram ? 'noopener noreferrer' : undefined}
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation();
                            }}
                            sx={{
                              width: { xs: 44, sm: 44 },
                              height: { xs: 44, sm: 44 },
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              background: customer.customerInstagram 
                                ? 'radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%,#d6249f 60%,#285AEB 90%)'
                                : 'rgba(128, 128, 128, 0.3)',
                              color: customer.customerInstagram ? 'white' : 'rgba(255, 255, 255, 0.5)',
                              opacity: customer.customerInstagram ? 1 : 0.5,
                              cursor: customer.customerInstagram ? 'pointer' : 'not-allowed',
                              transition: 'all 0.2s ease',
                              '&:hover': customer.customerInstagram ? { 
                                opacity: 0.9,
                                transform: 'scale(1.1)',
                              } : {},
                            }}
                          >
                            <InstagramIcon fontSize="small" />
                          </Box>
                        </Tooltip>

                        {/* TikTok */}
                        <Tooltip 
                          title={customer.customerTikTok ? "TikTok" : t('customers.noSocialData', { network: 'TikTok' })}
                          arrow
                        >
                          <Box
                            component={customer.customerTikTok ? 'a' : 'span'}
                            href={normalizeSocialUrl(customer.customerTikTok, 'tiktok')}
                            target={customer.customerTikTok ? "_blank" : undefined}
                            rel={customer.customerTikTok ? 'noopener noreferrer' : undefined}
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation();
                            }}
                            sx={{
                              width: { xs: 44, sm: 44 },
                              height: { xs: 44, sm: 44 },
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              bgcolor: customer.customerTikTok ? '#000000' : 'rgba(128, 128, 128, 0.3)',
                              color: customer.customerTikTok ? 'white' : 'rgba(255, 255, 255, 0.5)',
                              opacity: customer.customerTikTok ? 1 : 0.5,
                              cursor: customer.customerTikTok ? 'pointer' : 'not-allowed',
                              transition: 'all 0.2s ease',
                              '&:hover': customer.customerTikTok ? { 
                                bgcolor: '#333333',
                                transform: 'scale(1.1)',
                              } : {},
                            }}
                          >
                            <MusicNoteIcon fontSize="small" />
                          </Box>
                        </Tooltip>

                        {/* Line */}
                        <Tooltip 
                          title={customer.customerLine ? "Line" : t('customers.noSocialData', { network: 'Line' })}
                          arrow
                        >
                          <Box
                            component={customer.customerLine ? 'a' : 'span'}
                            href={customer.customerLine ? `https://line.me/ti/p/${customer.customerLine}` : undefined}
                            target={customer.customerLine ? "_blank" : undefined}
                            rel={customer.customerLine ? 'noopener noreferrer' : undefined}
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation();
                            }}
                            sx={{
                              width: { xs: 44, sm: 44 },
                              height: { xs: 44, sm: 44 },
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              bgcolor: customer.customerLine ? '#06C755' : 'rgba(128, 128, 128, 0.3)',
                              color: customer.customerLine ? 'white' : 'rgba(255, 255, 255, 0.5)',
                              opacity: customer.customerLine ? 1 : 0.5,
                              cursor: customer.customerLine ? 'pointer' : 'not-allowed',
                              transition: 'all 0.2s ease',
                              '&:hover': customer.customerLine ? { 
                                bgcolor: '#05a548',
                                transform: 'scale(1.1)',
                              } : {},
                            }}
                          >
                            <MessageIcon fontSize="small" />
                          </Box>
                        </Tooltip>

                        {/* X (Twitter) */}
                        <Tooltip 
                          title={customer.customerX ? "X (Twitter)" : t('customers.noSocialData', { network: 'X (Twitter)' })}
                          arrow
                        >
                          <Box
                            component={customer.customerX ? 'a' : 'span'}
                            href={normalizeSocialUrl(customer.customerX, 'x')}
                            target={customer.customerX ? "_blank" : undefined}
                            rel={customer.customerX ? 'noopener noreferrer' : undefined}
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation();
                            }}
                            sx={{
                              width: { xs: 44, sm: 44 },
                              height: { xs: 44, sm: 44 },
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              bgcolor: customer.customerX ? '#000000' : 'rgba(128, 128, 128, 0.3)',
                              color: customer.customerX ? 'white' : 'rgba(255, 255, 255, 0.5)',
                              opacity: customer.customerX ? 1 : 0.5,
                              cursor: customer.customerX ? 'pointer' : 'not-allowed',
                              transition: 'all 0.2s ease',
                              '&:hover': customer.customerX ? { 
                                bgcolor: '#333333',
                                transform: 'scale(1.1)',
                              } : {},
                            }}
                          >
                            <TwitterIcon fontSize="small" />
                          </Box>
                        </Tooltip>

                        {/* More Actions */}
                        <Tooltip title={t('customers.moreActions')}>
                          <IconButton 
                            size="small"
                            aria-label={t('customers.moreActions')}
                            onClick={(e) => {
                              e.stopPropagation();
                              openActionMenu(e, customer);
                            }}
                            sx={{
                              width: { xs: 30, sm: 32 },
                              height: { xs: 30, sm: 32 },
                              flexShrink: 0,
                              '&:hover': { bgcolor: 'action.hover' },
                            }}
                          >
                            <MoreHorizIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              );
            })
          )}
        </Box>

        {/* Pagination - แสดงเฉพาะเมื่อข้อมูลมากกว่า 50 รายการ (iOS 2026 Design Pattern) */}
        {total > 50 && (
          <Box display="flex" justifyContent="flex-end" mt={4}>
            <TablePagination
              rowsPerPageOptions={[25, 50, 100]}
              component="div"
              count={total}
              rowsPerPage={pageSize}
              page={page - 1}
              onPageChange={handlePageChangeEvent}
              onRowsPerPageChange={handleChangeRowsPerPage}
              labelRowsPerPage={t('customers.rowsPerPage')}
              labelDisplayedRows={({ from, to, count }) => t('customers.displayedRows', { from, to, count })}
              sx={{
                '& .MuiTablePagination-toolbar': {
                  borderRadius: 3,
                  backgroundColor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                },
                '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                },
              }}
            />
          </Box>
        )}

      </Box>

      <FilterMenu 
        anchorEl={filterAnchorEl}
        onClose={() => setFilterAnchorEl(null)}
        users={activeUsers}
        onCreator={(createdBy) => handleFilterChange({ createdBy })}
        onAssignee={(assignedTo) => handleFilterChange({ assignedTo })}
      />
      
      <ActionMenu
        anchorEl={actionMenuAnchorEl}
        open={Boolean(actionMenuAnchorEl)}
        onClose={closeActionMenu}
        status={selectedMember?.status as 'active' | 'inactive' | 'canceled' | undefined}
        canEdit={selectedMember?.capabilities.canEdit ?? false}
        canDelete={selectedMember?.capabilities.canDelete ?? false}
        onAction={async (action) => {
          if (!selectedMember) return;

          try {
            switch (action) {
              case 'update':
                openForm(selectedMember);
                break;

              case 'setActive':
              case 'setInactive':
              case 'setCanceled': {
                const status = action.replace('set', '').toLowerCase() as CustomerStatus;
                const updateData = {
                  customerName: selectedMember.customerName,
                  customerLastName: selectedMember.customerLastName,
                  customerEmail: selectedMember.customerEmail,
                  customerPhone1: selectedMember.customerPhone1,
                  customerPhone2: selectedMember.customerPhone2,
                  customerFacebook: selectedMember.customerFacebook,
                  customerInstagram: selectedMember.customerInstagram,
                  customerTikTok: selectedMember.customerTikTok,
                  customerLine: selectedMember.customerLine,
                  customerX: selectedMember.customerX,
                  customerAddress: selectedMember.customerAddress,
                  status,
                  isActive: status === 'active'
                };

                await updateCustomer(selectedMember.customerId, updateData);
                await feedback.fire({
                  icon: 'success',
                  title: t('task.statusUpdated'),
                  text: t('customers.statusUpdated', { status }),
                  timer: 2000,
                  timerProgressBar: true,
                  showConfirmButton: false,
                });
                refetch();
                break;
              }

              case 'delete': {
                const result = await feedback.fire({
                  title: t('customers.deleteOneTitle'),
                  text: t('customers.deleteOneQuestion', { name: selectedMember.fullName || selectedMember.customerName }),
                  icon: 'warning',
                  showCancelButton: true,
                  confirmButtonText: t('customers.deleteConfirm'),
                  cancelButtonText: t('common.cancel'),
                });

                if (result.isConfirmed) {
                  const deleteResult = await deleteCustomer(selectedMember.customerId);
                  if (deleteResult.success) {
                    await feedback.fire({
                      icon: 'success',
                      title: t('common.deleted'),
                      text: t('customers.deletedOne'),
                      timer: 2000,
                      timerProgressBar: true,
                      showConfirmButton: false,
                    });
                    refetch();
                  } else {
                    await feedback.fire({
                      icon: 'error',
                      title: t('common.error'),
                      text: deleteResult.message || t('customers.deleteFailed'),
                    });
                  }
                }
                break;
              }

              case 'report':
                await feedback.fire({
                  icon: 'info',
                  title: t('customers.reportSubmitted'),
                  text: t('customers.reportSubmittedText'),
                  timer: 2000,
                  timerProgressBar: true,
                  showConfirmButton: false,
                });
                break;

              default:
                console.log('Action not handled:', action);
            }
          } catch (error) {
            console.error('Error handling action:', error);
            await feedback.fire({
              icon: 'error',
              title: t('feedback.failed'),
              text: t('customers.actionFailed'),
            });
          } finally {
            closeActionMenu();
          }
        }}
      />
    </PageShell>
  );
};

export default CustomerPage;
