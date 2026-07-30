import { useState, useCallback, useEffect, useRef } from 'react';
import { 
  Box, 
  Button, 
  Tooltip,
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
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
  TextField,
  Paper,
} from '@mui/material';
import feedback from '../../services/feedback.service';
import { alpha, styled } from '@mui/material/styles';
import { Link as RouterLink } from 'react-router-dom';
import { Customer as CustomerType, CustomerStatus } from '../../types/customer.types';
import { CustomerFormData, ApiError } from '@/components/customers/CustomerForm';
import { 
  Group as GroupIcon,
  CheckCircle as CheckCircleIcon,
  Block as BlockIcon,
  AccessTime as AccessTimeIcon,
  MusicNote as MusicNoteIcon,
  Message as MessageIcon,
  Refresh as RefreshIcon,
  PersonAdd as PersonAddIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  CalendarToday as CalendarIcon,
  MoreHoriz as MoreHorizIcon,
  Facebook as FacebookIcon,
  Instagram as InstagramIcon,
  Twitter as TwitterIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon
} from '@mui/icons-material';

import { useCustomers } from '../../hooks/useCustomers';
import FilterMenu from '../../components/customers/FilterMenu';
import AddCustomerMenu from '../../components/customers/AddCustomerMenu';
import CustomerForm from '@/components/customers/CustomerForm';
import ActionMenu from '@/components/ActionMenu';
import { FilterBar } from '@/components/FilterBar';
import { customerApi } from '../../api/customer.api';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';

interface Customer extends CustomerType {}

// ============================================
// Stats Card Component
// ============================================
const StatsCard: React.FC<{
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  trend?: { value: number; direction: 'up' | 'down' };
}> = ({ title, value, subtitle, icon, iconBg, iconColor, trend }) => {
  return (
    <Card sx={{
      borderRadius: 3,
      p: { xs: 1.5, md: 3 },
      position: 'relative',
      overflow: 'hidden',
      boxShadow: 'none',
    }}>
      <CardContent sx={{ p: '0 !important' }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Box>
            <Typography variant="body2" color="text.secondary" fontWeight={500} gutterBottom>
              {title}
            </Typography>
            <Typography variant="h3" fontWeight={700} sx={{ fontSize: { xs: '1.75rem', md: '2.25rem' } }}>
              {value}
            </Typography>
            {subtitle && (
              <Box display="flex" alignItems="center" gap={0.5} mt={1}>
                {trend && (
                  trend.direction === 'up' ? (
                    <TrendingUpIcon fontSize="small" sx={{ color: 'success.main', fontSize: 16 }} />
                  ) : (
                    <TrendingDownIcon fontSize="small" sx={{ color: 'error.main', fontSize: 16 }} />
                  )
                )}
                <Typography variant="caption" color={trend?.direction === 'up' ? 'success.main' : 'text.secondary'} fontWeight={500}>
                  {subtitle}
                </Typography>
              </Box>
            )}
          </Box>
          <Box sx={{
            width: { xs: 42, sm: 52, md: 64 },
            height: { xs: 42, sm: 52, md: 64 },
            borderRadius: '50%',
            background: iconBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: iconColor,
            boxShadow: 'none',
          }}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

// ============================================
// Engagement Meter Component
// ============================================
const EngagementMeter = styled('div')<{ value: number }>(({ value, theme }) => ({
  height: 6,
  borderRadius: 3,
  background: `linear-gradient(90deg, 
    ${value > 70 ? theme.palette.success.main : value > 40 ? theme.palette.warning.main : theme.palette.error.main} 0%,
    ${value > 70 ? theme.palette.success.light : value > 40 ? theme.palette.warning.light : theme.palette.error.light} ${value}%,
    rgba(0,0,0,0.08) ${value}%)`,
  width: '100%',
  marginTop: 6,
  transition: 'all 0.3s ease',
}));

// ============================================
// Helper Functions
// ============================================
const getEngagementScore = (customer: Customer): number => {
  let score = 0;
  if (customer.customerFacebook) score += 25;
  if (customer.customerInstagram) score += 25;
  if (customer.customerTikTok) score += 20;
  if (customer.customerLine) score += 15;
  if (customer.customerX) score += 15;
  return Math.min(100, score);
};

// ============================================
// Main Component
// ============================================
const CustomerPage = () => {
  const { t } = useUserPreferences();
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  const {
    customers,
    loading,
    error,
    page,
    pageSize,
    total,
    statusStats,
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

  const DEFAULT_PAGE_SIZE = 25;

  const [searchInput, setSearchInput] = useState(filter.search || '');
  const [tabValue, setTabValue] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [actionMenuAnchorEl, setActionMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [addMenuAnchorEl, setAddMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedMember, setSelectedMember] = useState<Customer | null>(null);
  const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formApiError, setFormApiError] = useState<ApiError | null>(null);
  const isInitialMount = useRef(true);
  
  const emptyRows = page > 0 ? Math.max(0, (1 + page) * pageSize - customers.length) : 0;

  // Fetch status stats on mount to populate tab counts
  useEffect(() => {
    refetch();
  }, []);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      const statusMap = { 0: 'all', 1: 'active', 2: 'inactive', 3: 'canceled' } as const;
      handleFilterChange({ status: statusMap[tabValue as keyof typeof statusMap] as CustomerStatus | 'all', search: filter.search });
      return;
    }
    const statusMap = { 0: 'all', 1: 'active', 2: 'inactive', 3: 'canceled' } as const;
    handleFilterChange({ status: statusMap[tabValue as keyof typeof statusMap] as CustomerStatus | 'all', search: filter.search });
  }, [tabValue]);

  // ใช้ customers โดยตรงจาก API แทนการ filter ใน frontend
  // เพราะ API ส่งข้อมูลที่มี pagination มาแล้ว
  const displayCustomers = customers;

  const totalCustomers = getStatusCount('active') + getStatusCount('inactive') + getStatusCount('canceled');

  const handlePageChangeEvent = (_: React.MouseEvent<HTMLButtonElement> | null, newPage: number) => {
    handlePageChange(newPage + 1);
  };

  const handleChangeRowsPerPage = (e: React.ChangeEvent<HTMLInputElement>) => {
    handlePageSizeChange(parseInt(e.target.value, 10));
  };

  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelected = displayCustomers.map((n) => n.customerId);
      setSelected(newSelected);
      return;
    }
    setSelected([]);
  };

  const handleClick = (event: React.MouseEvent, id: string) => {
    event.preventDefault();
    event.stopPropagation();
    
    const selectedIndex = selected.indexOf(id);
    let newSelected: string[] = [];

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

  const handleActionMenuOpen = (event: React.MouseEvent<HTMLElement>, customer: Customer) => {
    event.stopPropagation();
    setActionMenuAnchorEl(event.currentTarget);
    setSelectedMember(customer);
  };

  const handleFilterClick = (event: React.MouseEvent<HTMLElement>) => {
    setFilterAnchorEl(event.currentTarget);
  };

  const handleActionMenuClose = () => {
    setActionMenuAnchorEl(null);
    setSelectedMember(null);
  };

  const handleAddMenuClose = () => {
    setAddMenuAnchorEl(null);
  };

  const handleOpenForm = (customer: Customer | null = null) => {
    setFormApiError(null);
    setEditingCustomer(customer);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingCustomer(null);
    setFormApiError(null);
  };

  const handleFormSubmit = async (formData: CustomerFormData & { base64Image?: string }) => {
    setFormApiError(null);
    
    try {
      const payload: Omit<Customer, 'customerId' | 'fullName'> & { base64Image?: string; removeImage?: boolean } = {
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
        status: formData.isActive ? 'active' : 'inactive',
        isActive: formData.isActive || false,
        updatedAt: new Date().toISOString(),
        deletedAt: null,
        ...(formData.base64Image ? { base64Image: formData.base64Image } : {}),
        ...(formData.removeImage ? { removeImage: formData.removeImage } : {}),
        ...(editingCustomer ? { createdAt: editingCustomer.createdAt } : { createdAt: new Date().toISOString() }),
      };
  
      let result;
      if (editingCustomer) {
        result = await updateCustomer(editingCustomer.customerId, payload);
      } else {
        result = await createCustomer(payload);
      }
  
      feedback.close();
  
      if (result && !result.success) {
        await feedback.fire({
          icon: 'error',
          title: t('customers.operationFailed'),
          text: result.message || 'An error occurred',
        });
        
        if (result.message?.toLowerCase().includes('email')) {
          setFormApiError({ field: 'customerEmail', message: result.message });
        }
        return;
      }
  
      await feedback.fire({
        icon: 'success',
        title: t('common.success'),
        text: t('customers.saved'),
        timer: 2000,
        timerProgressBar: true,
        showConfirmButton: false,
      });
      setIsFormOpen(false);
      setEditingCustomer(null);
      refetch();
  
    } catch (error: any) {
      console.error('Error saving customer:', error);
      const message = error?.response?.data?.message || error?.message || 'Failed to save customer';
      
      if (message.toLowerCase().includes('email')) {
        setFormApiError({ field: 'customerEmail', message: message });
      } else {
        await feedback.fire({
          icon: 'error',
          title: t('common.error'),
          text: message,
        });
      }
    }
  };
  
  const isSelected = (id: string) => selected.includes(id);

  useEffect(() => {
    if (error) {
      const showError = async () => {
        await feedback.fire({ icon: 'error', title: t('common.error'), text: error });
      };
      showError();
    }
  }, [error]);

  // Loading state
  if (loading && customers.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <Box textAlign="center">
          <CircularProgress size={60} thickness={4} color="primary" />
          <Typography variant="body1" color="text.secondary" mt={2} fontWeight={500}>
            Loading customers...
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      width: '100%',
      background: theme.palette.background.default,
      minHeight: '100vh',
      pb: 6
    }}>
      <CustomerForm
        open={isFormOpen}
        onClose={handleCloseForm}
        onSubmit={handleFormSubmit}
        initialData={editingCustomer ? {
          ...editingCustomer,
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
        apiError={formApiError}
        onClearApiError={() => setFormApiError(null)}
      />

      <Box sx={{ maxWidth: 1600, mx: 'auto', px: { xs: 2, md: 4 } }}>
        
        {/* Hero Header Section */}
        <Box sx={{ pt: { xs: 4, md: 6 }, pb: { xs: 3, md: 4 }, mb: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={3}>
            <Box>
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: 3,
                    backgroundColor: 'primary.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    boxShadow: 'none',
                  }}
                >
                  <GroupIcon sx={{ fontSize: 32 }} />
                </Box>
                <Box>
                  <Typography variant="h2" component="h1" fontWeight={800} sx={{ fontSize: { xs: '1.75rem', md: '2.5rem' } }}>
                    {t('customers.title')}
                  </Typography>
                  <Typography variant="body1" color="text.secondary" fontWeight={400}>
                    {t('customers.subtitle')}
                  </Typography>
                </Box>
              </Box>
            </Box>

            <Box display="flex" gap={1} flexWrap="wrap" sx={{ width: { xs: '100%', sm: 'auto' } }}>
              <Button
                component={RouterLink}
                to="/customer-profile"
                variant="outlined"
                sx={{ borderRadius: 3, textTransform: 'none', px: 2.5, py: 1.25, fontWeight: 600 }}
              >
                {t('customers.profileCards')}
              </Button>
              <Button
                variant="contained"
                startIcon={<PersonAddIcon />}
                onClick={() => handleOpenForm()}
                sx={{
                  borderRadius: 3,
                  textTransform: 'none',
                  px: 2.5,
                  py: 1.25,
                  fontWeight: 600,
                  fontSize: '0.95rem',
                }}
              >
                {t('customers.add')}
              </Button>

              <Tooltip title={t('customers.refresh')}>
              <IconButton
                aria-label={t('customers.refresh')}
                onClick={refetch}
                disabled={loading}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <RefreshIcon />
              </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Box>

        {/* Stats Dashboard - 4 Cards Grid */}
        <Box 
          display="grid" 
          gridTemplateColumns={{ xs: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, 1fr)' }}
          gap={{ xs: 1.25, sm: 2, md: 3 }}
          mb={{ xs: 3, md: 5 }}
        >
          <StatsCard
            title={t('customers.total')}
            value={totalCustomers}
            subtitle={t('customers.activeCount', { count: getStatusCount('active') })}
            icon={<GroupIcon sx={{ fontSize: 32 }} />}
            iconBg={alpha(theme.palette.primary.main, 0.12)}
            iconColor={theme.palette.primary.main}
          />
          <StatsCard
            title={t('customers.activeNow')}
            value={getStatusCount('active')}
            subtitle={t('customers.percentTotal', { percent: totalCustomers > 0 ? Math.round((getStatusCount('active') / totalCustomers) * 100) : 0 })}
            icon={<CheckCircleIcon sx={{ fontSize: 32 }} />}
            iconBg={alpha(theme.palette.success.main, 0.12)}
            iconColor={theme.palette.success.main}
            trend={{ value: 5, direction: 'up' }}
          />
          <StatsCard
            title={t('customers.inactive')}
            value={getStatusCount('inactive')}
            subtitle={t('customers.needsAttention')}
            icon={<AccessTimeIcon sx={{ fontSize: 32 }} />}
            iconBg={alpha(theme.palette.warning.main, 0.15)}
            iconColor={theme.palette.warning.main}
          />
          <StatsCard
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
            />
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
                  onClick={() => setTabValue(index)}
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
              {selected.length} {selected.length === 1 ? 'customer' : 'customers'} selected
            </Typography>
            <Box display="flex" gap={1} flexWrap="wrap">
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
                    } catch (error) {
                      await feedback.fire({
                        icon: 'error',
                        title: t('common.error'),
                        text: t('customers.updateFailed'),
                      });
                    }
                  }
                }}
              >
                Mark Active
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
                    } catch (error) {
                      await feedback.fire({
                        icon: 'error',
                        title: t('common.error'),
                        text: t('customers.updateFailed'),
                      });
                    }
                  }
                }}
              >
                Mark Inactive
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<BlockIcon />}
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
                    } catch (error) {
                      await feedback.fire({
                        icon: 'error',
                        title: t('common.error'),
                        text: t('customers.deleteFailed'),
                      });
                    }
                  }
                }}
              >
                Delete
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
                Clear
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
                Loading customers...
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
                No customers found
              </Typography>
              <Typography variant="body1" color="text.secondary" mb={3}>
                {searchInput ? 'Try adjusting your search criteria' : 'Get started by adding your first customer'}
              </Typography>
              <Button
                variant="contained"
                startIcon={<PersonAddIcon />}
                onClick={() => handleOpenForm()}
                sx={{
                  borderRadius: 3,
                  textTransform: 'none',
                  px: 4,
                  py: 1.5,
                  fontWeight: 600,
                }}
              >
                Add Your First Customer
              </Button>
            </Card>
          ) : (
            displayCustomers.map((customer) => {
              const engagementScore = getEngagementScore(customer);
              const isItemSelected = isSelected(customer.customerId);
              
              return (
                <Card
                  key={customer.customerId}
                  onClick={(e) => handleClick(e, customer.customerId)}
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
                            onClick={(e) => {
                              e.stopPropagation();
                              handleClick(e, customer.customerId);
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
                              Engagement
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
                          <EngagementMeter value={engagementScore} />
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
                            {new Date(customer.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
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
                            href={customer.customerFacebook || undefined}
                            target={customer.customerFacebook ? "_blank" : undefined}
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation();
                            }}
                            sx={{
                              width: { xs: 30, sm: 32 },
                              height: { xs: 30, sm: 32 },
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
                            href={customer.customerInstagram || undefined}
                            target={customer.customerInstagram ? "_blank" : undefined}
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation();
                            }}
                            sx={{
                              width: { xs: 30, sm: 32 },
                              height: { xs: 30, sm: 32 },
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
                            href={customer.customerTikTok || undefined}
                            target={customer.customerTikTok ? "_blank" : undefined}
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation();
                            }}
                            sx={{
                              width: { xs: 30, sm: 32 },
                              height: { xs: 30, sm: 32 },
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
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation();
                            }}
                            sx={{
                              width: { xs: 30, sm: 32 },
                              height: { xs: 30, sm: 32 },
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
                            href={customer.customerX || undefined}
                            target={customer.customerX ? "_blank" : undefined}
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation();
                            }}
                            sx={{
                              width: { xs: 30, sm: 32 },
                              height: { xs: 30, sm: 32 },
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
                            onClick={(e) => {
                              e.stopPropagation();
                              handleActionMenuOpen(e, customer);
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
              rowsPerPageOptions={[10, 25, 50, 100]}
              component="div"
              count={total}
              rowsPerPage={pageSize}
              page={page - 1}
              onPageChange={handlePageChangeEvent}
              onRowsPerPageChange={handleChangeRowsPerPage}
              labelRowsPerPage="Rows per page:"
              labelDisplayedRows={({ from, to, count }) => `${from}-${to} of ${count}`}
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

      <AddCustomerMenu
        anchorEl={addMenuAnchorEl}
        onClose={handleAddMenuClose}
        onAddSingleCustomer={handleOpenForm}
      />

      <FilterMenu 
        anchorEl={filterAnchorEl}
        onClose={() => setFilterAnchorEl(null)}
      />
      
      <ActionMenu
        anchorEl={actionMenuAnchorEl}
        open={Boolean(actionMenuAnchorEl)}
        onClose={handleActionMenuClose}
        status={selectedMember?.status as 'active' | 'inactive' | 'canceled' | undefined}
        onAction={async (action) => {
          if (!selectedMember) return;

          try {
            switch (action) {
              case 'update':
                handleOpenForm(selectedMember);
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
            handleActionMenuClose();
          }
        }}
      />
    </Box>
  );
};

export default CustomerPage;
