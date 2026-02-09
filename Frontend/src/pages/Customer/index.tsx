import { useState, useCallback } from 'react';
import { 
  Box, 
  Button, 
  Paper,
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
  Tabs, 
  Tab, 
  Typography, 
  CircularProgress, 
  Alert, 
  Snackbar,
  IconButton,
  Card,
  CardContent,
  Badge,
  useTheme,
  alpha,
  InputAdornment,
  TextField
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { Link } from 'react-router-dom';
import { FilterBar } from '@/components/FilterBar';
import { Customer as CustomerType, CustomerStatus } from '../../types/customer.types';
import { CustomerFormData, ApiError } from '@/components/customers/CustomerForm';
import { 
  MoreVert as MoreVertIcon,
  Facebook as FacebookIcon,
  Instagram as InstagramIcon,
  Twitter as TwitterIcon,
  GroupAdd as GroupAddIcon,
  Group as GroupIcon,
  CheckCircle as CheckCircleIcon,
  Block as BlockIcon,
  AccessTime as AccessTimeIcon,
  FileUpload as FileUploadIcon,
  MusicNote as MusicNoteIcon,
  Message as MessageIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Refresh as RefreshIcon,
  PersonAdd as PersonAddIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  CalendarToday as CalendarIcon,
  MoreHoriz as MoreHorizIcon,
  CheckCircle as VerifiedIcon
} from '@mui/icons-material';

import { useCustomers } from '../../hooks/useCustomers';
import FilterMenu from '../../components/customers/FilterMenu';
import AddCustomerMenu from '../../components/customers/AddCustomerMenu';
import CustomerForm from '@/components/customers/CustomerForm';
import ActionMenu from '@/components/ActionMenu';
import { useNotification } from '../../contexts/Notification';

interface Customer extends CustomerType {
  // All properties are now inherited from CustomerType
}

function a11yProps(index: number) {
  return {
    id: `customer-tab-${index}`,
    'aria-controls': `customer-tabpanel-${index}`,
  };
}

// Styled components
const StyledCard = styled(Card)(({ theme }) => ({
  borderRadius: 12,
  boxShadow: '0 4px 20px 0 rgba(0,0,0,0.05)',
  transition: 'transform 0.3s, box-shadow 0.3s',
  '&:hover': {
    boxShadow: '0 8px 30px 0 rgba(0,0,0,0.1)',
    transform: 'translateY(-2px)'
  }
}));

const StatusBadge = styled('span', {
  shouldForwardProp: (prop) => prop !== 'status',
})<{ status: 'active' | 'inactive' | 'canceled' }>(({ theme, status }) => ({
  width: 10,
  height: 10,
  borderRadius: '50%',
  backgroundColor: 
    status === 'active' ? theme.palette.success.main :
    status === 'inactive' ? theme.palette.warning.main :
    theme.palette.error.main,
  marginRight: 8,
  display: 'inline-block'
}));

// Engagement meter component with proper TypeScript types
// Engagement meter component with proper TypeScript types
const EngagementMeter = styled('div')<{ value: number }>(({ theme, value }) => ({
  height: 4,
  borderRadius: 2,
  background: `linear-gradient(90deg, ${theme.palette.primary.main} ${value}%, ${theme.palette.action.disabledBackground} ${value}%)`,
  width: '100%',
  marginTop: 4
}));

/**
 * Calculates an engagement score based on customer's social media presence
 * @param customer - The customer object
 * @returns A score between 0 and 100
 */
const getEngagementScore = (customer: Customer): number => {
  let score = 0;
  if (customer.customerFacebook) score += 25;
  if (customer.customerInstagram) score += 25;
  if (customer.customerTikTok) score += 20;
  if (customer.customerLine) score += 15;
  if (customer.customerX) score += 15;
  return Math.min(100, score);
};

const CustomerPage = () => {
  const theme = useTheme();

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

  // Local state for search input (only submit on search button or ENTER)
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
  const { notify } = useNotification();
  
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string | React.ReactNode;
    severity: 'success' | 'error' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'info',
  });

  const showSnackbar = (message: string | React.ReactNode, severity: 'success' | 'error' | 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const emptyRows = page > 0 ? Math.max(0, (1 + page) * pageSize - customers.length) : 0;

  // Filter customers based on tab value
  const filteredCustomers = customers.filter(customer => {
    if (tabValue === 1) return customer.status === 'active';
    if (tabValue === 2) return customer.status === 'inactive';
    if (tabValue === 3) return customer.status === 'canceled';
    return true; // tabValue === 0 (All)
  });

  // Calculate total count for the "All" tab using the hook's getStatusCount
  const totalCustomers = getStatusCount('active') + getStatusCount('inactive') + getStatusCount('canceled');


  const handlePageChangeEvent = (_: React.MouseEvent<HTMLButtonElement> | null, newPage: number) => {
    handlePageChange(newPage + 1);
  };

  const handleChangeRowsPerPage = (e: React.ChangeEvent<HTMLInputElement>) => {
    handlePageSizeChange(parseInt(e.target.value, 10));
    handlePageChange(1);
  };

  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelected = filteredCustomers.map((n) => n.customerId);
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

  // Handle filter menu open
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
      const payload: Omit<Customer, 'customerId' | 'fullName'> & { base64Image?: string } = {
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
        ...(editingCustomer
          ? { createdAt: editingCustomer.createdAt }
          : { createdAt: new Date().toISOString() }),
      };
  
      let result;
      if (editingCustomer) {
        result = await updateCustomer(editingCustomer.customerId, payload);
      } else {
        result = await createCustomer(payload);
      }
  
      // Check if the result indicates a failure
      if (result && !result.success) {
        if (result.message?.toLowerCase().includes('email')) {
          setFormApiError({
            field: 'customerEmail',
            message: result.message,
          });
        } else {
          notify(result.message || 'An error occurred', 'error');
        }
        return;
      }
  
      notify('Customer saved successfully', 'success');
      setIsFormOpen(false);
      setEditingCustomer(null);
      refetch();
  
    } catch (error: any) {
      console.error('Error saving customer:', error);
      const message = error?.response?.data?.message || error?.message || 'Failed to save customer';
      
      if (message.toLowerCase().includes('email')) {
        setFormApiError({
          field: 'customerEmail',
          message: message,
        });
      } else {
        notify(message, 'error');
      }
    }
  };
  

  const isSelected = (id: string) => selected.includes(id);

  if (loading && customers.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      width: '100%',
      background: theme.palette.mode === 'light' ? '#f8fafc' : theme.palette.background.default,
      minHeight: '100vh',
      p: 3
    }}>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity as any} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

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
      />

      <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
        {/* Header Section */}
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={4} flexWrap="wrap" gap={2}>
          <Box>
            <Typography variant="h3" component="h1" fontWeight="bold" gutterBottom>
              Customer Hub
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600 }}>
              Connect, engage and build relationships with your customers across all platforms
            </Typography>
          </Box>

          <Box display="flex" gap={2} flexWrap="wrap">
            <Button
              variant="contained"
              color="primary"
              startIcon={<PersonAddIcon />}
              onClick={() => handleOpenForm()}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                px: 3,
                py: 1.5,
                fontWeight: 600,
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.1)',
                '&:hover': {
                  boxShadow: '0 6px 20px rgba(0, 0, 0, 0.15)',
                  transform: 'translateY(-1px)'
                },
                transition: 'all 0.3s ease'
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
                borderRadius: 2,
                textTransform: 'none',
                px: 3,
                py: 1.5,
                fontWeight: 500,
                borderWidth: 2,
                '&:hover': {
                  borderWidth: 2
                }
              }}
            >
              Refresh
            </Button>
          </Box>
        </Box>

        {/* Stats Cards */}
        <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }} gap={3} mb={4}>
          <StyledCard>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Total Customers
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {totalCustomers}
                  </Typography>
                  <Typography variant="caption" color="success.main" sx={{ display: 'flex', alignItems: 'center' }}>
                    <CheckCircleIcon color="success" fontSize="small" sx={{ mr: 0.5 }} />
                    {getStatusCount('active')} active
                  </Typography>
                </Box>
                <Box sx={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  bgcolor: 'primary.light',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'primary.contrastText'
                }}>
                  <GroupIcon fontSize="large" />
                </Box>
              </Box>
            </CardContent>
          </StyledCard>

          <StyledCard>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Active Now
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {getStatusCount('active')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {totalCustomers > 0 ? Math.round((getStatusCount('active') / totalCustomers) * 100) : 0}% of total
                  </Typography>
                </Box>
                <Box sx={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  bgcolor: 'success.light',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'success.contrastText'
                }}>
                  <CheckCircleIcon fontSize="large" />
                </Box>
              </Box>
            </CardContent>
          </StyledCard>

          <StyledCard>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Inactive
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {getStatusCount('inactive')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Needs attention
                  </Typography>
                </Box>
                <Box sx={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  bgcolor: 'warning.light',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'warning.contrastText'
                }}>
                  <AccessTimeIcon fontSize="large" />
                </Box>
              </Box>
            </CardContent>
          </StyledCard>

          <StyledCard>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Canceled
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {getStatusCount('canceled')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Not active anymore
                  </Typography>
                </Box>
                <Box sx={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  bgcolor: 'error.light',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'error.contrastText'
                }}>
                  <BlockIcon fontSize="large" />
                </Box>
              </Box>
            </CardContent>
          </StyledCard>
        </Box>

      {/* Local state for search input */}
      <FilterBar
        searchValue={searchInput}
        onSearchChange={(value) => {
          setSearchInput(value);
          if (value.trim() === '') {
            handleFilterChange({ search: '' });
            handlePageSizeChange(25);
            handlePageChange(1);
          }
        }}
        onSearch={(value) => {
          if (!value || value.trim() === '') {
            setSearchInput('');
            handleFilterChange({ search: '' });
            handlePageSizeChange(25);
            handlePageChange(1);
          } else {
            handleFilterChange({ search: value });
          }
        }}
        onClear={() => {
          setSearchInput('');
          handleFilterChange({ search: '' });
          handlePageSizeChange(25);
          handlePageChange(1);
        }}
        onRefresh={refetch}
        searchPlaceholder="Search customers..."
        loading={loading}
        sx={{
          px: 3,
          py: 2,
          borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
          bgcolor: 'background.paper',
          position: 'sticky',
          top: 64, // Adjust based on your header height
          zIndex: (theme) => theme.zIndex.appBar - 1,
          boxShadow: (theme) => theme.shadows[1]
        }}
      />

              {/* Tabs */}
              <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
          <Tabs
            value={tabValue}
            onChange={(_, newValue) => {
              setTabValue(newValue);
              const statusMap = {
                0: 'all',
                1: 'active',
                2: 'inactive',
                3: 'canceled'
              } as const;
              
              handlePageChange(1);
              handleFilterChange({ 
                status: statusMap[newValue as keyof typeof statusMap] as CustomerStatus | 'all',
                search: filter.search 
              });
            }}
            variant="scrollable"
            scrollButtons="auto"
            aria-label="customer status tabs"
            sx={{
              '& .MuiTabs-indicator': {
                height: 3,
                borderRadius: '3px 3px 0 0',
              },
              '& .MuiTab-root': {
                minHeight: 52,
                minWidth: 'auto',
                px: 2,
                mx: 0.5,
                '&.Mui-selected': {
                  color: theme.palette.primary.main,
                  fontWeight: 600,
                },
              },
            }}
          >
            <Tab 
              icon={<GroupIcon />}
              iconPosition="start"
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  <span>All</span>
                  <Chip 
                    label={getStatusCount('active') + getStatusCount('inactive') + getStatusCount('canceled')}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      bgcolor: tabValue === 0 ? 'primary.50' : 'action.selected',
                      color: tabValue === 0 ? 'primary.main' : 'text.secondary',
                    }}
                  />
                </Box>
              }
              {...a11yProps(0)}
              sx={{
                textTransform: 'none',
                minHeight: 48,
              }}
            />
            <Tab 
              icon={<CheckCircleIcon color={tabValue === 1 ? 'success' : 'inherit'} />}
              iconPosition="start"
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  <span>Active</span>
                  <Chip 
                    label={getStatusCount('active')}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      bgcolor: tabValue === 1 ? 'success.50' : 'action.selected',
                      color: tabValue === 1 ? 'success.main' : 'text.secondary',
                    }}
                  />
                </Box>
              }
              {...a11yProps(1)}
              sx={{
                textTransform: 'none',
                minHeight: 48,
                color: tabValue === 1 ? 'success.main' : 'inherit',
              }}
            />
            <Tab 
              icon={<AccessTimeIcon color={tabValue === 2 ? 'warning' : 'inherit'} />}
              iconPosition="start"
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  <span>Inactive</span>
                  <Chip 
                    label={getStatusCount('inactive')}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      bgcolor: tabValue === 2 ? 'warning.50' : 'action.selected',
                      color: tabValue === 2 ? 'warning.dark' : 'text.secondary',
                    }}
                  />
                </Box>
              }
              {...a11yProps(2)}
              sx={{
                textTransform: 'none',
                minHeight: 48,
                color: tabValue === 2 ? 'warning.dark' : 'inherit',
              }}
            />
            <Tab 
              icon={<BlockIcon color={tabValue === 3 ? 'error' : 'inherit'} />}
              iconPosition="start"
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  <span>Canceled</span>
                  <Chip 
                    label={getStatusCount('canceled')}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      bgcolor: tabValue === 3 ? 'error.50' : 'action.selected',
                      color: tabValue === 3 ? 'error.main' : 'text.secondary',
                    }}
                  />
                </Box>
              }
              {...a11yProps(3)}
              sx={{
                textTransform: 'none',
                minHeight: 48,
                color: tabValue === 3 ? 'error.main' : 'inherit',
              }}
            />
          </Tabs>
        </Box>

      {/* Customer List */}
      <Card sx={{ borderRadius: 3, overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
        <TableContainer>
          <Table sx={{ minWidth: 1050 }}>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox" sx={{ pl: 3 }}>
                  <Checkbox
                    color="primary"
                    indeterminate={selected.length > 0 && selected.length < filteredCustomers.length}
                    checked={filteredCustomers.length > 0 && selected.length === filteredCustomers.length}
                    onChange={handleSelectAllClick}
                    inputProps={{ 'aria-label': 'select all customers' }}
                    sx={{
                      '&.Mui-checked': {
                        color: theme.palette.primary.main,
                      },
                    }}
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>CUSTOMER</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>STATUS</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>ENGAGEMENT</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>CONTACT</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>JOINED</TableCell>
                <TableCell align="right" sx={{ pr: 3, fontWeight: 600, color: 'text.secondary' }}>ACTIONS</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && filteredCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <CircularProgress />
                    <Typography variant="body2" color="text.secondary" mt={1}>
                      Loading customers...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : filteredCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <Box sx={{ maxWidth: 360, mx: 'auto', textAlign: 'center' }}>
                      <GroupIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2, opacity: 0.5 }} />
                      <Typography variant="h6" gutterBottom>
                        No customers found
                      </Typography>
                      <Typography variant="body2" color="text.secondary" mb={3}>
                        {searchInput ? 'Try adjusting your search or filter criteria' : 'Get started by adding your first customer'}
                      </Typography>
                      <Button
                        variant="contained"
                        color="primary"
                        startIcon={<PersonAddIcon />}
                        onClick={() => handleOpenForm()}
                        sx={{ borderRadius: 2, textTransform: 'none' }}
                      >
                        Add Your First Customer
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                filteredCustomers.map((customer) => {
                  const isItemSelected = isSelected(customer.customerId);
                  const engagementScore = getEngagementScore(customer);
                  
                  return (
                    <TableRow
                      hover
                      key={customer.customerId}
                      selected={isItemSelected}
                      onClick={(event) => handleClick(event, customer.customerId)}
                      sx={{
                        cursor: 'pointer',
                        '&:hover': {
                          '& .customer-actions': {
                            opacity: 1,
                            visibility: 'visible',
                          },
                        },
                      }}
                    >
                      <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()} sx={{ pl: 3 }}>
                        <Checkbox
                          color="primary"
                          checked={isItemSelected}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleClick(event, customer.customerId);
                          }}
                          sx={{
                            '&.Mui-checked': {
                              color: theme.palette.primary.main,
                            },
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={2}>
                          <Badge
                            overlap="circular"
                            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                            badgeContent={
                              <Box
                                sx={{
                                  width: 12,
                                  height: 12,
                                  borderRadius: '50%',
                                  bgcolor: 
                                    customer.status === 'active' ? 'success.main' :
                                    customer.status === 'inactive' ? 'warning.main' : 'error.main',
                                  border: `2px solid ${theme.palette.background.paper}`,
                                }}
                              />
                            }
                          >
                            <Avatar
                              sx={{
                                width: 40,
                                height: 40,
                                bgcolor: 'primary.light',
                                color: 'primary.contrastText',
                                fontWeight: 600,
                                fontSize: '1rem',
                              }}
                            >
                              {customer.customerName.charAt(0).toUpperCase()}
                              {customer.customerLastName?.charAt(0).toUpperCase() || ''}
                            </Avatar>
                          </Badge>
                          <Box>
                            <Box display="flex" alignItems="center" gap={1}>
                              <Typography variant="subtitle2" fontWeight={500}>
                                {customer.fullName ||
                                  `${customer.customerName} ${customer.customerLastName || ''}`.trim()}
                              </Typography>
                              {customer.status === 'active' && (
                                <Tooltip title="Verified" arrow>
                                  <VerifiedIcon 
                                    color="primary" 
                                    fontSize="small" 
                                    sx={{ 
                                      color: 'success.main',
                                      fontSize: 16,
                                    }} 
                                  />
                                </Tooltip>
                              )}
                            </Box>
                            <Box display="flex" alignItems="center" gap={0.5} mt={0.5}>
                              <EmailIcon 
                                color="action" 
                                fontSize="small" 
                                sx={{ 
                                  fontSize: 14,
                                  opacity: 0.7,
                                }} 
                              />
                              <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 180 }}>
                                {customer.customerEmail}
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center">
                          <StatusBadge status={customer.status as 'active' | 'inactive' | 'canceled'} />
                          <Typography 
                            variant="body2" 
                            sx={{
                              fontWeight: 500,
                              color: 
                                customer.status === 'active' ? 'success.main' :
                                customer.status === 'inactive' ? 'warning.dark' : 'error.main',
                              textTransform: 'capitalize',
                            }}
                          >
                            {customer.status}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ width: 100 }}>
                          <Box display="flex" alignItems="center" justifyContent="space-between">
                            <Typography variant="body2" color="text.secondary" fontSize="0.75rem">
                              Engagement
                            </Typography>
                            <Typography 
                              variant="body2" 
                              fontWeight={600}
                              color={
                                engagementScore > 70 ? 'success.main' :
                                engagementScore > 40 ? 'warning.main' : 'error.main'
                              }
                            >
                              {engagementScore}%
                            </Typography>
                          </Box>
                          <EngagementMeter 
                            value={engagementScore}
                            sx={{
                              background: engagementScore > 70 
                                ? `linear-gradient(90deg, ${theme.palette.success.main} ${engagementScore}%, ${theme.palette.action.disabledBackground} ${engagementScore}%)`
                                : engagementScore > 40
                                  ? `linear-gradient(90deg, ${theme.palette.warning.main} ${engagementScore}%, ${theme.palette.action.disabledBackground} ${engagementScore}%)`
                                  : `linear-gradient(90deg, ${theme.palette.error.main} ${engagementScore}%, ${theme.palette.action.disabledBackground} ${engagementScore}%)`
                            }}
                          />
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box 
                          display="flex" 
                          gap={1} 
                          minHeight={40}
                          alignItems="center"
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
                                  '&:hover': { bgcolor: '#166FE5' },
                                  width: 28,
                                  height: 28
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
                                  '&:hover': { opacity: 0.9 },
                                  width: 28,
                                  height: 28
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
                                  '&:hover': { bgcolor: '#333333' },
                                  width: 28,
                                  height: 28
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
                                  '&:hover': { bgcolor: '#05a548' },
                                  width: 28,
                                  height: 28
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
                                  '&:hover': { bgcolor: '#333333' },
                                  width: 28,
                                  height: 28
                                }}
                              >
                                <TwitterIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>

                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          {customer.customerPhone1 ? (
                            <>
                              <PhoneIcon 
                                color="action" 
                                fontSize="small" 
                                sx={{ 
                                  fontSize: 14,
                                  opacity: 0.7,
                                }} 
                              />
                              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                {customer.customerPhone1}
                              </Typography>
                            </>
                          ) : (
                            <Typography variant="body2" color="text.disabled">
                              -
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <CalendarIcon 
                            color="action" 
                            fontSize="small" 
                            sx={{ 
                              fontSize: 14,
                              opacity: 0.7,
                            }} 
                          />
                          <Typography variant="body2">
                            {new Date(customer.createdAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right" sx={{ pr: 3 }}>
                        <Box 
                          className="customer-actions"
                          sx={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            opacity: 0,
                            visibility: 'hidden',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              opacity: '1 !important',
                              visibility: 'visible !important',
                            },
                          }}
                        >
                          <Tooltip title="More actions">
                            <IconButton 
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleActionMenuOpen(e, customer);
                              }}
                              sx={{
                                '&:hover': {
                                  bgcolor: 'action.hover',
                                },
                              }}
                            >
                              <MoreHorizIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                }))}
              {emptyRows > 0 && (
                <TableRow style={{ height: 53 * emptyRows }}>
                  <TableCell colSpan={7} />
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={total}
          rowsPerPage={pageSize}
          page={page - 1}
          onPageChange={handlePageChangeEvent}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Card>

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
                // Create a clean update object with only the fields we want to update
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
                showSnackbar(`Customer marked as ${status}`, 'success');
                refetch(); // Refresh the list to show updated status
                break;
              }
                
              case 'report':
                showSnackbar('Report submitted', 'info');
                break;
                
              default:
                console.log('Action not handled:', action);
            }
          } catch (error) {
            console.error('Error handling action:', error);
            showSnackbar('Failed to update customer status', 'error');
          } finally {
            handleActionMenuClose();
          }
        }}
      />


      </Box>
    </Box>
  );
};



export default CustomerPage;
