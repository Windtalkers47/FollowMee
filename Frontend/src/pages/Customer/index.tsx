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
import Swal from 'sweetalert2';
import { styled } from '@mui/material/styles';
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
      p: { xs: 2, md: 3 },
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
                    <TrendingUpIcon fontSize="small" sx={{ color: '#10b981', fontSize: 16 }} />
                  ) : (
                    <TrendingDownIcon fontSize="small" sx={{ color: '#ef4444', fontSize: 16 }} />
                  )
                )}
                <Typography variant="caption" color={trend?.direction === 'up' ? 'success.main' : 'text.secondary'} fontWeight={500}>
                  {subtitle}
                </Typography>
              </Box>
            )}
          </Box>
          <Box sx={{
            width: 64,
            height: 64,
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
const EngagementMeter = styled('div')<{ value: number }>(({ value }) => ({
  height: 6,
  borderRadius: 3,
  background: `linear-gradient(90deg, 
    ${value > 70 ? '#10b981' : value > 40 ? '#f59e0b' : '#ef4444'} 0%, 
    ${value > 70 ? '#34d399' : value > 40 ? '#fbbf24' : '#f87171'} ${value}%, 
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
  
      Swal.close();
  
      if (result && !result.success) {
        await Swal.fire({
          icon: 'error',
          title: 'Operation Failed',
          text: result.message || 'An error occurred',
          confirmButtonColor: '#d33',
        });
        
        if (result.message?.toLowerCase().includes('email')) {
          setFormApiError({ field: 'customerEmail', message: result.message });
        }
        return;
      }
  
      await Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: 'Customer saved successfully',
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
        await Swal.fire({
          icon: 'error',
          title: 'Error',
          text: message,
          confirmButtonColor: '#d33',
        });
      }
    }
  };
  
  const isSelected = (id: string) => selected.includes(id);

  useEffect(() => {
    if (error) {
      const showError = async () => {
        await Swal.fire({ icon: 'error', title: 'Error', text: error, confirmButtonColor: '#d33' });
      };
      showError();
    }
  }, [error]);

  // Loading state
  if (loading && customers.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <Box textAlign="center">
          <CircularProgress size={60} thickness={4} sx={{ color: '#10b981' }} />
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
                    Customers
                  </Typography>
                  <Typography variant="body1" color="text.secondary" fontWeight={400}>
                    Private CRM records. Public Profile Cards are managed separately.
                  </Typography>
                </Box>
              </Box>
            </Box>

            <Box display="flex" gap={2} flexWrap="wrap">
              <Button
                component={RouterLink}
                to="/customer-profile"
                variant="outlined"
                sx={{ borderRadius: 3, textTransform: 'none', px: 2.5, py: 1.25, fontWeight: 600 }}
              >
                Manage Profile Cards
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
                Add New Customer
              </Button>

              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={refetch}
                disabled={loading}
                sx={{
                  borderRadius: 3,
                  textTransform: 'none',
                  px: 2.5,
                  py: 1.25,
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  borderWidth: 2,
                  '&:hover': { borderWidth: 2 },
                }}
              >
                Refresh
              </Button>
            </Box>
          </Box>
        </Box>

        {/* Stats Dashboard - 4 Cards Grid */}
        <Box 
          display="grid" 
          gridTemplateColumns={{ xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }} 
          gap={{ xs: 2, sm: 3, md: 4 }} 
          mb={{ xs: 4, md: 6 }}
        >
          <StatsCard
            title="Total Customers"
            value={totalCustomers}
            subtitle={`${getStatusCount('active')} active`}
            icon={<GroupIcon sx={{ fontSize: 32 }} />}
            iconBg="rgba(16, 185, 129, 0.12)"
            iconColor="#10b981"
          />
          <StatsCard
            title="Active Now"
            value={getStatusCount('active')}
            subtitle={totalCustomers > 0 ? `${Math.round((getStatusCount('active') / totalCustomers) * 100)}% of total` : '0% of total'}
            icon={<CheckCircleIcon sx={{ fontSize: 32 }} />}
            iconBg="rgba(16, 185, 129, 0.12)"
            iconColor="#10b981"
            trend={{ value: 5, direction: 'up' }}
          />
          <StatsCard
            title="Inactive"
            value={getStatusCount('inactive')}
            subtitle="Needs attention"
            icon={<AccessTimeIcon sx={{ fontSize: 32 }} />}
            iconBg="rgba(245, 158, 11, 0.15)"
            iconColor="#f59e0b"
          />
          <StatsCard
            title="Canceled"
            value={getStatusCount('canceled')}
            subtitle="Not active anymore"
            icon={<BlockIcon sx={{ fontSize: 32 }} />}
            iconBg="rgba(239, 68, 68, 0.15)"
            iconColor="#ef4444"
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
              searchPlaceholder="Search customers by name, email..."
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
              { label: 'All', icon: GroupIcon, count: totalCustomers },
              { label: 'Active', icon: CheckCircleIcon, count: getStatusCount('active') },
              { label: 'Inactive', icon: AccessTimeIcon, count: getStatusCount('inactive') },
              { label: 'Canceled', icon: BlockIcon, count: getStatusCount('canceled') },
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
                  const result = await Swal.fire({
                    title: 'Mark as Active',
                    text: `Are you sure you want to mark ${selected.length} customer(s) as active?`,
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonColor: '#28a745',
                    cancelButtonColor: '#6c757d',
                    confirmButtonText: 'Yes, mark as active'
                  });
                  
                  if (result.isConfirmed) {
                    try {
                      await customerApi.bulkUpdateStatus(selected, 'active');
                      await Swal.fire({
                        icon: 'success',
                        title: 'Success',
                        text: `${selected.length} customer(s) marked as active`,
                        timer: 2000,
                        timerProgressBar: true,
                        showConfirmButton: false
                      });
                      setSelected([]);
                      refetch();
                    } catch (error) {
                      await Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'Failed to update customers',
                        confirmButtonColor: '#d33'
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
                  const result = await Swal.fire({
                    title: 'Mark as Inactive',
                    text: `Are you sure you want to mark ${selected.length} customer(s) as inactive?`,
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonColor: '#ffc107',
                    cancelButtonColor: '#6c757d',
                    confirmButtonText: 'Yes, mark as inactive'
                  });
                  
                  if (result.isConfirmed) {
                    try {
                      await customerApi.bulkUpdateStatus(selected, 'inactive');
                      await Swal.fire({
                        icon: 'success',
                        title: 'Success',
                        text: `${selected.length} customer(s) marked as inactive`,
                        timer: 2000,
                        timerProgressBar: true,
                        showConfirmButton: false
                      });
                      setSelected([]);
                      refetch();
                    } catch (error) {
                      await Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'Failed to update customers',
                        confirmButtonColor: '#d33'
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
                  const result = await Swal.fire({
                    title: 'Delete Customers',
                    text: `Are you sure you want to delete ${selected.length} customer(s)?`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#dc3545',
                    cancelButtonColor: '#6c757d',
                    confirmButtonText: 'Yes, delete',
                  });

                  if (result.isConfirmed) {
                    try {
                      await customerApi.bulkDelete(selected);
                      await Swal.fire({
                        icon: 'success',
                        title: 'Deleted',
                        text: `${selected.length} customer(s) deleted`,
                        timer: 2000,
                        timerProgressBar: true,
                        showConfirmButton: false,
                      });
                      setSelected([]);
                      refetch();
                    } catch (error) {
                      await Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'Failed to delete customers',
                        confirmButtonColor: '#d33'
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
              <CircularProgress size={40} sx={{ color: '#10b981' }} />
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
                                  customer.status === 'active' ? '#10b981' :
                                  customer.status === 'inactive' ? '#f59e0b' : '#ef4444',
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
                            <Tooltip title="Verified" arrow>
                              <CheckCircleIcon fontSize="small" sx={{ color: '#10b981', fontSize: 18 }} />
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
                            bgcolor: 
                              customer.status === 'active' ? 'rgba(16, 185, 129, 0.12)' :
                              customer.status === 'inactive' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                            color: 
                              customer.status === 'active' ? '#10b981' :
                              customer.status === 'inactive' ? '#f59e0b' : '#ef4444',
                            border: `1px solid ${
                              customer.status === 'active' ? 'rgba(16, 185, 129, 0.3)' :
                              customer.status === 'inactive' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(239, 68, 68, 0.3)'
                            }`,
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
                                color: engagementScore > 70 ? '#10b981' : engagementScore > 40 ? '#f59e0b' : '#ef4444'
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
                          title={customer.customerFacebook ? "Facebook" : "ยังไม่มีข้อมูล Facebook"} 
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
                          title={customer.customerInstagram ? "Instagram" : "ยังไม่มีข้อมูล Instagram"} 
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
                          title={customer.customerTikTok ? "TikTok" : "ยังไม่มีข้อมูล TikTok"} 
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
                          title={customer.customerLine ? "Line" : "ยังไม่มีข้อมูล Line"} 
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
                          title={customer.customerX ? "X (Twitter)" : "ยังไม่มีข้อมูล X (Twitter)"} 
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
                        <Tooltip title="More actions">
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
                await Swal.fire({
                  icon: 'success',
                  title: 'Status Updated',
                  text: `Customer marked as ${status}`,
                  timer: 2000,
                  timerProgressBar: true,
                  showConfirmButton: false,
                });
                refetch();
                break;
              }

              case 'delete': {
                const result = await Swal.fire({
                  title: 'Delete Customer',
                  text: `Are you sure you want to delete ${selectedMember.fullName || selectedMember.customerName}?`,
                  icon: 'warning',
                  showCancelButton: true,
                  confirmButtonColor: '#d33',
                  cancelButtonColor: '#6c757d',
                  confirmButtonText: 'Yes, delete',
                  cancelButtonText: 'Cancel',
                });

                if (result.isConfirmed) {
                  const deleteResult = await deleteCustomer(selectedMember.customerId);
                  if (deleteResult.success) {
                    await Swal.fire({
                      icon: 'success',
                      title: 'Deleted',
                      text: 'Customer has been deleted successfully',
                      timer: 2000,
                      timerProgressBar: true,
                      showConfirmButton: false,
                    });
                    refetch();
                  } else {
                    await Swal.fire({
                      icon: 'error',
                      title: 'Error',
                      text: deleteResult.message || 'Failed to delete customer',
                      confirmButtonColor: '#d33',
                    });
                  }
                }
                break;
              }

              case 'report':
                await Swal.fire({
                  icon: 'info',
                  title: 'Report Submitted',
                  text: 'The report has been submitted successfully.',
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
            await Swal.fire({
              icon: 'error',
              title: 'Action Failed',
              text: 'Failed to perform the requested action',
              confirmButtonColor: '#d33',
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
