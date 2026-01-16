import { useState } from 'react';
import { Customer as CustomerType, CustomerStatus } from '../../types/customer.types';
import {
  Box,
  Typography,
  Paper,
  Button,
  IconButton,
  TextField,
  InputAdornment,
  Avatar,
  Chip,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
  TablePagination,
  Checkbox,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Alert,
  Snackbar,
} from '@mui/material';

import {
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  GroupAdd as GroupAddIcon,
  FileUpload as FileUploadIcon,
  CheckCircle as CheckCircleIcon,
  Block as BlockIcon,
  Refresh as RefreshIcon,
  FilterAlt as FilterAltIcon,
  PersonAdd as PersonAddIcon,
  PersonRemove as PersonRemoveIcon,
  AccessTime as AccessTimeIcon,
  Label as LabelIcon,
  Email as EmailIcon,
  Flag as FlagIcon,
  Facebook as FacebookIcon,
  Instagram as InstagramIcon,
  MusicNote as MusicNoteIcon,
  Message as MessageIcon,
  Twitter as TwitterIcon,
  Group as GroupIcon,
} from '@mui/icons-material';

import { useCustomers } from '../../hooks/useCustomers';
import CustomerForm from '../../components/customers/CustomerForm';

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
  const [tabValue, setTabValue] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [actionMenuAnchorEl, setActionMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [addMenuAnchorEl, setAddMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedMember, setSelectedMember] = useState<Customer | null>(null);
  const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [snackbar, setSnackbar] = useState({ 
    open: false, 
    message: '', 
    severity: 'success' as 'success' | 'error' | 'info' 
  });

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
    deleteCustomer = async () => {},
  } = useCustomers();

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

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    const statusMap: (CustomerStatus | 'all')[] = ['all', 'active', 'inactive', 'canceled'];
    const selectedStatus = statusMap[newValue] || 'all';
    
    // Reset to first page when changing tabs
    handlePageChange(1);
    
    // Update the filter based on the selected tab
    handleFilterChange({ 
      status: selectedStatus as CustomerStatus | 'all',
      // Preserve existing search filter
      search: filter.search 
    });
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
    setEditingCustomer(customer);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingCustomer(null);
  };

  const handleFormSubmit = async (formData: any) => {
    try {
      if (editingCustomer) {
        // Create an update object that only includes changed fields
        const updateData = { ...formData };
        
        // Remove any fields that weren't actually changed
        Object.keys(updateData).forEach(key => {
          if (JSON.stringify(editingCustomer[key as keyof Customer]) === JSON.stringify(updateData[key])) {
            delete updateData[key];
          }
        });
        
        // Only proceed with the update if there are changes
        if (Object.keys(updateData).length > 0) {
          await updateCustomer(editingCustomer.customerId, updateData);
          showSnackbar('Customer updated successfully', 'success');
        } else {
          showSnackbar('No changes detected', 'info');
        }
      } else {
        await createCustomer(formData);
        showSnackbar('Customer created successfully', 'success');
      }
      handleCloseForm();
    } catch (error) {
      showSnackbar('An error occurred. Please try again.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this customer?')) {
      try {
        await deleteCustomer(id);
        showSnackbar('Customer deleted successfully', 'success');
        // The useCustomers hook will automatically refresh the customer list
        // when the delete operation is successful through Redux state updates
      } catch (error) {
        showSnackbar('Error deleting customer', 'error');
      }
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, member: AudienceMember) => {
  //   setAnchorEl(event.currentTarget);
  //   setSelectedMember(member);
  // };



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
          customerLastName: editingCustomer.customerLastName || undefined,
          customerPhone1: editingCustomer.customerPhone1 || undefined,
          customerPhone2: editingCustomer.customerPhone2 || undefined,
          customerFacebook: editingCustomer.customerFacebook || undefined,
          customerInstagram: editingCustomer.customerInstagram || undefined,
          customerTikTok: editingCustomer.customerTikTok || undefined,
          customerLine: editingCustomer.customerLine || undefined,
          customerX: editingCustomer.customerX || undefined
        } : undefined}
        isLoading={loading}
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

      <Box sx={{ p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <TextField
            fullWidth
            variant="outlined"
            placeholder="Search customer..."
            value={filter.search || ''}
            onChange={(e) => handleFilterChange({ search: e.target.value })}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
              sx: {
                borderRadius: 2,
                bgcolor: 'background.paper',
                maxWidth: 400,
              },
            }}
          />

        <Box>
          <IconButton>
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

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

      {/* Add Customer Menu */}
      <Menu
        anchorEl={addMenuAnchorEl}
        open={Boolean(addMenuAnchorEl)}
        onClose={handleAddMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={() => {
          handleAddMenuClose();
          handleOpenForm();
        }}>
          <ListItemIcon>
            <PersonAddIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Add Single Customer</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleAddMenuClose}>
          <ListItemIcon>
            <GroupAddIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Add Multiple Customers</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleAddMenuClose}>
          <ListItemIcon>
            <FileUploadIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Import from CSV</ListItemText>
        </MenuItem>
      </Menu>

      {/* Filter Menu */}
      {/* Filter Menu */}
      <Menu
        anchorEl={filterAnchorEl}
        open={Boolean(filterAnchorEl)}
        onClose={() => setFilterAnchorEl(null)}
      >
        <MenuItem onClick={() => setFilterAnchorEl(null)}>
          <ListItemIcon>
            <FilterAltIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Filter by Status</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => setFilterAnchorEl(null)}>
          <ListItemIcon>
            <LabelIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Filter by Tags</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => setFilterAnchorEl(null)}>
          <ListItemIcon>
            <AccessTimeIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Filter by Last Active</ListItemText>
        </MenuItem>
      </Menu>

      {/* Action Menu */}
      <Menu
        anchorEl={actionMenuAnchorEl}
        open={Boolean(actionMenuAnchorEl)}
        onClose={handleActionMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          elevation: 1,
          sx: {
            borderRadius: 2,
            minWidth: 200,
            boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.1)',
          },
        }}
      >
        <MenuItem onClick={handleActionMenuClose}>
          <ListItemIcon>
            <EmailIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Send Message</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleActionMenuClose}>
          <ListItemIcon>
            <PersonAddIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Add to Group</ListItemText>
        </MenuItem>
        <Divider />
        {selectedMember?.isActive ? (
          <MenuItem onClick={handleActionMenuClose}>
            <ListItemIcon>
              <PersonRemoveIcon fontSize="small" color="warning" />
            </ListItemIcon>
            <ListItemText>Mark as Inactive</ListItemText>
          </MenuItem>
        ) : (
          <MenuItem onClick={handleActionMenuClose}>
            <ListItemIcon>
              <CheckCircleIcon fontSize="small" color="success" />
            </ListItemIcon>
            <ListItemText>Mark as Active</ListItemText>
          </MenuItem>
        )}
        <MenuItem onClick={handleActionMenuClose}>
          <ListItemIcon>
            <BlockIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Ban User</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleActionMenuClose}>
          <ListItemIcon>
            <FlagIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Report</ListItemText>
        </MenuItem>
      </Menu>


    </Box>
  );
};

export default CustomerPage;
