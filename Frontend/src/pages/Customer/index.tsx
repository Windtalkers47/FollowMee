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
import { useLiquidGlass } from '../../contexts/LiquidGlassContext';
import { getGlassCardStyles, gradientPresets } from '../../styles/liquidGlassStyles';
import { FilterBar } from '@/components/FilterBar';

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
  liquidGlassSettings: any;
  isDarkMode: boolean;
}> = ({ title, value, subtitle, icon, iconBg, iconColor, trend, liquidGlassSettings, isDarkMode }) => {
  const glassStyles = getGlassCardStyles(liquidGlassSettings, isDarkMode);
  
  return (
    <Card sx={{
      ...glassStyles,
      borderRadius: 4,
      p: { xs: 2, md: 3 },
      position: 'relative',
      overflow: 'visible',
      transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
      '&:hover': {
        transform: 'translateY(-6px)',
        boxShadow: '0 24px 64px 0 rgba(16, 185, 129, 0.25)',
      },
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
            boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
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
  const { isLiquidGlassEnabled, liquidGlassSettings } = useLiquidGlass();
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

  // Get gradient colors from preset
  const preset = gradientPresets[liquidGlassSettings.gradientPreset];

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
      background: theme.palette.mode === 'light' 
        ? 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 50%, #f0f9ff 100%)'
        : theme.palette.background.default,
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
                    background: `linear-gradient(135deg, ${preset.primary}, ${preset.secondary})`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    boxShadow: `0 8px 24px ${preset.primary}66`,
                  }}
                >
                  <GroupIcon sx={{ fontSize: 32 }} />
                </Box>
                <Box>
                  <Typography variant="h2" component="h1" fontWeight={800} sx={{ fontSize: { xs: '1.75rem', md: '2.5rem' } }}>
                    Customer Hub
                  </Typography>
                  <Typography variant="body1" color="text.secondary" fontWeight={400}>
                    Connect, engage & build meaningful relationships
                  </Typography>
                </Box>
              </Box>
            </Box>

            <Box display="flex" gap={2} flexWrap="wrap">
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
                  fontSize: '0.95rem',
                  background: `linear-gradient(135deg, ${preset.primary}, ${preset.secondary})`,
                  boxShadow: `0 8px 24px ${preset.primary}66`,
                  '&:hover': {
                    boxShadow: `0 12px 32px ${preset.primary}99`,
                    transform: 'translateY(-2px)',
                  },
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
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
                  px: 4,
                  py: 1.5,
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  borderWidth: 2,
                  '&:hover': {
                    borderWidth: 2,
                    transform: 'translateY(-2px)',
                  },
                  transition: 'all 0.3s ease',
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
            iconBg="rgba(16, 185, 129, 0.15)"
            iconColor="#10b981"
            liquidGlassSettings={liquidGlassSettings}
            isDarkMode={isDarkMode}
          />
          <StatsCard
            title="Active Now"
            value={getStatusCount('active')}
            subtitle={totalCustomers > 0 ? `${Math.round((getStatusCount('active') / totalCustomers) * 100)}% of total` : '0% of total'}
            icon={<CheckCircleIcon sx={{ fontSize: 32 }} />}
            iconBg="rgba(16, 185, 129, 0.15)"
            iconColor="#10b981"
            trend={{ value: 5, direction: 'up' }}
            liquidGlassSettings={liquidGlassSettings}
            isDarkMode={isDarkMode}
          />
          <StatsCard
            title="Inactive"
            value={getStatusCount('inactive')}
            subtitle="Needs attention"
            icon={<AccessTimeIcon sx={{ fontSize: 32 }} />}
            iconBg="rgba(245, 158, 11, 0.15)"
            iconColor="#f59e0b"
            liquidGlassSettings={liquidGlassSettings}
            isDarkMode={isDarkMode}
          />
          <StatsCard
            title="Canceled"
            value={getStatusCount('canceled')}
            subtitle="Not active anymore"
            icon={<BlockIcon sx={{ fontSize: 32 }} />}
            iconBg="rgba(239, 68, 68, 0.15)"
            iconColor="#ef4444"
            liquidGlassSettings={liquidGlassSettings}
            isDarkMode={isDarkMode}
          />
        </Box>

        {/* Search & Filter Bar - Floating Design */}
        <Box mb={4}>
          <Card
            sx={{
              borderRadius: 4,
              overflow: 'hidden',
              background: isDarkMode ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.08)',
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
                  // Reset pageSize และ fetch ข้อมูลทั้งหมด
                  handlePageSizeChange(DEFAULT_PAGE_SIZE);
                  // ใช้ handleFilterChange พร้อม limit parameter
                  handleFilterChange({ search: '', limit: DEFAULT_PAGE_SIZE });
                } else {
                  handleFilterChange({ search: value });
                }
              }}
              onClear={() => {
                setSearchInput('');
                // Reset pageSize และ fetch ข้อมูลทั้งหมด
                handlePageSizeChange(DEFAULT_PAGE_SIZE);
                // ใช้ handleFilterChange พร้อม limit parameter
                handleFilterChange({ search: '', limit: DEFAULT_PAGE_SIZE });
              }}
              onRefresh={() => {
                // Reset pageSize และ fetch ข้อมูลทั้งหมด
                handlePageSizeChange(DEFAULT_PAGE_SIZE);
                // ใช้ handleFilterChange พร้อม limit parameter
                handleFilterChange({ ...filter, limit: DEFAULT_PAGE_SIZE });
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
              background: isDarkMode ? 'rgba(51, 65, 85, 0.6)' : 'rgba(230, 230, 235, 0.6)',
              borderRadius: 3,
              p: 1,
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
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
                    background: isActive ? (isDarkMode ? 'rgba(51, 65, 85, 0.8)' : 'rgba(255, 255, 255, 0.8)') : 'transparent',
                    boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                    transition: 'all 0.2s ease',
                    whiteSpace: 'nowrap',
                    '&:hover': {
                      background: isDarkMode ? 'rgba(51, 65, 85, 0.5)' : 'rgba(255, 255, 255, 0.5)',
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
              background: `linear-gradient(135deg, ${preset.primary}, ${preset.secondary})`,
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              animation: 'slideDown 0.3s ease',
              position: 'sticky',
              top: 0,
              zIndex: 1000,
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
            }}
          >
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              {selected.length} {selected.length === 1 ? 'customer' : 'customers'} selected
            </Typography>
            <Box display="flex" gap={1}>
              <Button 
                size="small" 
                variant="contained"
                startIcon={<CheckCircleIcon />}
                sx={{ 
                  bgcolor: 'rgba(255,255,255,0.2)', 
                  color: 'white',
                  fontWeight: 600,
                  px: 2,
                  '&:hover': { 
                    bgcolor: 'rgba(255,255,255,0.3)',
                    transform: 'translateY(-1px)',
                  }
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
                      for (const customerId of selected) {
                        const customer = customers.find(c => c.customerId === customerId);
                        if (customer) {
                          await updateCustomer(customerId, {
                            customerName: customer.customerName,
                            customerLastName: customer.customerLastName,
                            customerEmail: customer.customerEmail,
                            customerPhone1: customer.customerPhone1,
                            customerPhone2: customer.customerPhone2,
                            customerFacebook: customer.customerFacebook,
                            customerInstagram: customer.customerInstagram,
                            customerTikTok: customer.customerTikTok,
                            customerLine: customer.customerLine,
                            customerX: customer.customerX,
                            customerAddress: customer.customerAddress,
                            status: 'active',
                            isActive: true
                          });
                        }
                      }
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
                variant="contained"
                startIcon={<AccessTimeIcon />}
                sx={{ 
                  bgcolor: 'rgba(255,255,255,0.2)', 
                  color: 'white',
                  fontWeight: 600,
                  px: 2,
                  '&:hover': { 
                    bgcolor: 'rgba(255,255,255,0.3)',
                    transform: 'translateY(-1px)',
                  }
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
                      for (const customerId of selected) {
                        const customer = customers.find(c => c.customerId === customerId);
                        if (customer) {
                          await updateCustomer(customerId, {
                            customerName: customer.customerName,
                            customerLastName: customer.customerLastName,
                            customerEmail: customer.customerEmail,
                            customerPhone1: customer.customerPhone1,
                            customerPhone2: customer.customerPhone2,
                            customerFacebook: customer.customerFacebook,
                            customerInstagram: customer.customerInstagram,
                            customerTikTok: customer.customerTikTok,
                            customerLine: customer.customerLine,
                            customerX: customer.customerX,
                            customerAddress: customer.customerAddress,
                            status: 'inactive',
                            isActive: false
                          });
                        }
                      }
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
                variant="contained"
                startIcon={<BlockIcon />}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  fontWeight: 600,
                  px: 2,
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.3)',
                    transform: 'translateY(-1px)',
                  }
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
                      for (const customerId of selected) {
                        await deleteCustomer(customerId);
                      }
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
                variant="text"
                sx={{
                  color: 'white',
                  borderColor: 'rgba(255,255,255,0.5)',
                  borderWidth: 1,
                  borderStyle: 'solid',
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.1)',
                    borderColor: 'white'
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
                background: isDarkMode ? 'rgba(30, 41, 59, 0.5)' : 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(12px)',
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
                  background: `linear-gradient(135deg, ${preset.primary}, ${preset.secondary})`,
                }}
              >
                Add Your First Customer
              </Button>
            </Card>
          ) : (
            displayCustomers.map((customer) => {
              const engagementScore = getEngagementScore(customer);
              const glassStyles = getGlassCardStyles(liquidGlassSettings, isDarkMode);
              const isItemSelected = isSelected(customer.customerId);
              
              return (
                <Card
                  key={customer.customerId}
                  onClick={(e) => handleClick(e, customer.customerId)}
                  sx={{
                    ...glassStyles,
                    borderRadius: 3,
                    mb: 2,
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    cursor: 'pointer',
                    border: isItemSelected ? `2px solid ${theme.palette.primary.main}` : '1px solid rgba(255,255,255,0.5)',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 8px 32px 0 rgba(16, 185, 129, 0.15)',
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
                      
                      {/* Social Media & Actions - Scrollable on mobile */}
                      <Box 
                        display="flex" 
                        alignItems="center" 
                        gap={0.5}
                        sx={{ 
                          width: { xs: '100%', sm: 'auto' },
                          overflowX: { xs: 'auto', sm: 'visible' },
                          pt: { xs: 1, sm: 0 },
                          pb: { xs: 0.5, sm: 0 },
                          '&::-webkit-scrollbar': { display: 'none' },
                          scrollbarWidth: 'none',
                        }}
                      >
                        {customer.customerFacebook && (
                          <Tooltip title="Facebook" arrow>
                            <IconButton
                              size="small"
                              href={customer.customerFacebook}
                              target="_blank"
                              onClick={(e) => e.stopPropagation()}
                              sx={{
                                bgcolor: '#1877F2',
                                color: 'white',
                                width: { xs: 30, sm: 32 },
                                height: { xs: 30, sm: 32 },
                                flexShrink: 0,
                                '&:hover': { bgcolor: '#166FE5', transform: 'scale(1.1)' },
                                transition: 'all 0.2s ease',
                              }}
                            >
                              <FacebookIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {customer.customerInstagram && (
                          <Tooltip title="Instagram" arrow>
                            <IconButton
                              size="small"
                              href={customer.customerInstagram}
                              target="_blank"
                              onClick={(e) => e.stopPropagation()}
                              sx={{
                                background: 'radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%,#d6249f 60%,#285AEB 90%)',
                                color: 'white',
                                width: { xs: 30, sm: 32 },
                                height: { xs: 30, sm: 32 },
                                flexShrink: 0,
                                '&:hover': { opacity: 0.9, transform: 'scale(1.1)' },
                                transition: 'all 0.2s ease',
                              }}
                            >
                              <InstagramIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {customer.customerTikTok && (
                          <Tooltip title="TikTok" arrow>
                            <IconButton
                              size="small"
                              href={customer.customerTikTok}
                              target="_blank"
                              onClick={(e) => e.stopPropagation()}
                              sx={{
                                bgcolor: '#000000',
                                color: 'white',
                                width: { xs: 30, sm: 32 },
                                height: { xs: 30, sm: 32 },
                                flexShrink: 0,
                                '&:hover': { bgcolor: '#333333', transform: 'scale(1.1)' },
                                transition: 'all 0.2s ease',
                              }}
                            >
                              <MusicNoteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {customer.customerLine && (
                          <Tooltip title="Line" arrow>
                            <IconButton
                              size="small"
                              href={`https://line.me/ti/p/${customer.customerLine}`}
                              target="_blank"
                              onClick={(e) => e.stopPropagation()}
                              sx={{
                                bgcolor: '#06C755',
                                color: 'white',
                                width: { xs: 30, sm: 32 },
                                height: { xs: 30, sm: 32 },
                                flexShrink: 0,
                                '&:hover': { bgcolor: '#05a548', transform: 'scale(1.1)' },
                                transition: 'all 0.2s ease',
                              }}
                            >
                              <MessageIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {customer.customerX && (
                          <Tooltip title="X (Twitter)" arrow>
                            <IconButton
                              size="small"
                              href={customer.customerX}
                              target="_blank"
                              onClick={(e) => e.stopPropagation()}
                              sx={{
                                bgcolor: '#000000',
                                color: 'white',
                                width: { xs: 30, sm: 32 },
                                height: { xs: 30, sm: 32 },
                                flexShrink: 0,
                                '&:hover': { bgcolor: '#333333', transform: 'scale(1.1)' },
                                transition: 'all 0.2s ease',
                              }}
                            >
                              <TwitterIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
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

        {/* Pagination - แสดงเสมอเมื่อมีข้อมูลรวม */}
        {total > 0 && (
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
                  background: isDarkMode ? 'rgba(30, 41, 59, 0.6)' : 'rgba(255, 255, 255, 0.8)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
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