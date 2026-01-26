import { useState } from 'react';
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
  IconButton
} from '@mui/material';
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
} from '@mui/icons-material';

import { useCustomers } from '../../hooks/useCustomers';
import FilterMenu from '../../components/customers/FilterMenu';
import AddCustomerMenu from '../../components/customers/AddCustomerMenu';
import CustomerForm from '@/components/customers/CustomerForm';
import ActionMenu from '@/components/ActionMenu';

interface Customer extends CustomerType {
  // All properties are now inherited from CustomerType
}

function a11yProps(index: number) {
  return {
    id: `customer-tab-${index}`,
    'aria-controls': `customer-tabpanel-${index}`,
  };
}

const CustomerPage = () => {

  const {
    customers = [],
    loading = false,
    error = null,
    page = 0,
    pageSize = 10,
    total = 0,
    filter = { status: 'all', search: '' },
    statusStats,
    handlePageChange = () => {},
    handlePageSizeChange = () => {},
    handleFilterChange = () => {},
    createCustomer = async () => {},
    updateCustomer = async () => {},
    refetch = () => {},
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

  // Get count for a specific status
  const getStatusCount = (status: 'active' | 'inactive' | 'canceled'): number => {
    if (!statusStats?.statuses) return 0;
    const statusData = statusStats.statuses.find(s => s.status === status);
    return statusData?.count || 0;
  };

  const emptyRows = page > 0 ? Math.max(0, (1 + page) * pageSize - customers.length) : 0;

  // Filter customers based on tab value
  const filteredCustomers = customers.filter(customer => {
    if (tabValue === 1) return customer.status === 'active';
    if (tabValue === 2) return customer.status === 'inactive';
    if (tabValue === 3) return customer.status === 'canceled';
    return true; // tabValue === 0 (All)
  });

  // Calculate total count for the "All" tab
  const totalCustomers = statusStats?.totalStatus || total || 0;


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

  const handleFormSubmit = async (formData: CustomerFormData) => {
    setFormApiError(null);
  
    try {
      const payload: Omit<Customer, 'customerId' | 'fullName'> = {
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
        status: formData.isActive ? 'active' : 'inactive',
        isActive: formData.isActive || false,
        updatedAt: new Date().toISOString(),
        deletedAt: null,
        ...(editingCustomer
          ? { createdAt: editingCustomer.createdAt }
          : { createdAt: new Date().toISOString() }),
      };
  
      if (editingCustomer) {
        await updateCustomer(editingCustomer.customerId, payload);
      } else {
        await createCustomer(payload);
      }
  
      showSnackbar('Customer saved successfully', 'success');
      setIsFormOpen(false);
      setEditingCustomer(null);
      refetch();
  
    } catch (error: any) {
      const message = error?.message || 'Something went wrong';
  
      if (message.toLowerCase().includes('email')) {
        setFormApiError({
          field: 'customerEmail',
          message,
        });
      } else {
        showSnackbar(message, 'error');
      }
  
      throw error;
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
    <Box sx={{ width: '100%' }}>
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
          customerX: editingCustomer.customerX || undefined
        } : undefined}
        apiError={formApiError}
      />

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
            Customers
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage and engage with your customers
          </Typography>
        </Box>

        <Box display="flex" gap={2}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<GroupAddIcon />}
            sx={{ borderRadius: 2, textTransform: 'none', mr: 1 }}
            onClick={(e) => setAddMenuAnchorEl(e.currentTarget)}
          >
            Add Customer
          </Button>

          <Button
            variant="outlined"
            startIcon={<FileUploadIcon />}
            sx={{ borderRadius: 2, textTransform: 'none' }}
            disabled
          >
            Import
          </Button>
        </Box>
      </Box>

      <Box sx={{ width: '100%', mb: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={tabValue}
            onChange={(_, newValue) => {
              setTabValue(newValue);
              // Update the filter based on the selected tab
              const statusMap = {
                0: 'all',
                1: 'active',
                2: 'inactive',
                3: 'canceled'
              } as const;
              
              // Reset to first page when changing tabs
              handlePageChange(1);
              
              // Update the filter
              handleFilterChange({ 
                status: statusMap[newValue as keyof typeof statusMap] as CustomerStatus | 'all',
                // Preserve existing search filter
                search: filter.search 
              });
            }}
            variant="scrollable"
            scrollButtons="auto"
            aria-label="customer status tabs"
            sx={{
              minHeight: 44,
              '& .MuiTab-root': { minWidth: 'auto', p: 1, mr: 1 },
            }}
          >
            <Tab 
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  <GroupIcon fontSize="small" color="primary" />
                  <span>All</span>
                  <Chip 
                    label={totalCustomers}
                    size="small"
                    color="default"
                    sx={{ height: 20, fontSize: '0.675rem', fontWeight: 600 }}
                  />
                </Box>
              } 
              {...a11yProps(0)} 
            />
            <Tab 
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  <CheckCircleIcon fontSize="small" color="success" />
                  <span>Active</span>
                  <Chip 
                    label={getStatusCount('active')} 
                    size="small" 
                    color="success" 
                    sx={{ height: 20, fontSize: '0.675rem', fontWeight: 600 }}
                  />
                </Box>
              } 
              {...a11yProps(1)} 
            />
            <Tab 
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  <AccessTimeIcon fontSize="small" color="warning" />
                  <span>Inactive</span>
                  <Chip 
                    label={getStatusCount('inactive')} 
                    size="small" 
                    color="warning" 
                    sx={{ height: 20, fontSize: '0.675rem', fontWeight: 600 }}
                  />
                </Box>
              } 
              {...a11yProps(2)} 
            />
            <Tab 
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  <BlockIcon fontSize="small" color="error" />
                  <span>Canceled</span>
                  <Chip 
                    label={getStatusCount('canceled')} 
                    size="small" 
                    color="error" 
                    sx={{ height: 20, fontSize: '0.675rem', fontWeight: 600 }}
                  />
                </Box>
              } 
              {...a11yProps(3)} 
            />
          </Tabs>
        </Box>
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

      <Paper sx={{ width: '100%', mb: 2, borderRadius: 3, overflow: 'hidden' }}>
      <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    color="primary"
                    indeterminate={selected.length > 0 && selected.length < filteredCustomers.length}
                    checked={filteredCustomers.length > 0 && selected.length === filteredCustomers.length}
                    onChange={handleSelectAllClick}
                    inputProps={{ 'aria-label': 'select all customers' }}
                  />
                </TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Platform</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Joined</TableCell>
                <TableCell>Location</TableCell>
                <TableCell align="right">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && filteredCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : filteredCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                    <Typography color="textSecondary">No customers found</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredCustomers.map((customer) => {
                  const isItemSelected = isSelected(customer.customerId);
                  return (
                    <TableRow
                      hover
                      key={customer.customerId}
                      selected={isItemSelected}
                      onClick={(event) => handleClick(event, customer.customerId)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          color="primary"
                          checked={isItemSelected}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleClick(event, customer.customerId);
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={2}>
                          <Avatar>
                            {customer.customerName.charAt(0).toUpperCase()}
                            {customer.customerLastName?.charAt(0).toUpperCase() || ''}
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle2">
                              {customer.fullName ||
                                `${customer.customerName} ${customer.customerLastName || ''}`.trim()}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {customer.customerEmail}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={customer.status === 'active' ? 'Active' : customer.status === 'inactive' ? 'Inactive' : 'Canceled'}
                          color={customer.status === 'active' ? 'success' : customer.status === 'inactive' ? 'default' : 'error'}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Box display="flex" gap={1}>
                          {customer.customerFacebook && <FacebookIcon color="primary" />}
                          {customer.customerInstagram && <InstagramIcon color="secondary" />}
                          {customer.customerTikTok && <MusicNoteIcon color="action" />}
                          {customer.customerLine && <MessageIcon color="success" />}
                          {customer.customerX && <TwitterIcon color="info" />}
                        </Box>
                      </TableCell>
                      <TableCell>{customer.customerPhone1 || 'N/A'}</TableCell>
                      <TableCell>{customer.customerEmail}</TableCell>
                      <TableCell>
                        {new Date(customer.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>N/A</TableCell>
                      <TableCell>
                        <IconButton onClick={(e) => {
                          e.stopPropagation();
                          handleActionMenuOpen(e, customer);
                        }}>
                          <MoreVertIcon />
                        </IconButton>
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
      </Paper>

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
        onAction={(action) => {
          // Handle different actions here
          switch (action) {
            case 'sendMessage':
              // Handle send message
              console.log('Send message to:', selectedMember?.customerId);
              break;
            case 'addToGroup':
              // Handle add to group
              console.log('Add to group:', selectedMember?.customerId);
              break;
            case 'toggleStatus':
              // Handle toggle status
              if (selectedMember) {
                const newStatus = selectedMember.isActive ? 'inactive' : 'active';
                updateCustomer(selectedMember.customerId, { status: newStatus });
                showSnackbar(
                  `Customer marked as ${newStatus} successfully`,
                  'success'
                );
              }
              break;
            case 'banUser':
              // Handle ban user
              if (selectedMember) {
                updateCustomer(selectedMember.customerId, { status: 'canceled' });
                showSnackbar('Customer has been banned', 'success');
              }
              break;
            case 'report':
              // Handle report
              console.log('Report user:', selectedMember?.customerId);
              showSnackbar('User has been reported', 'info');
              break;
            default:
              break;
          }
        }}
        isActive={selectedMember?.isActive}
      />


    </Box>
  );
};

export default CustomerPage;
