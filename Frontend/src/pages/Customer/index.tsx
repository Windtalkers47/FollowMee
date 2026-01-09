import { useState } from 'react';
import { CustomerStatus } from '../../types/customer.types';
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
  AccessTime as AccessTimeIcon,
  Label as LabelIcon,
} from '@mui/icons-material';

import { useCustomers } from '../../hooks/useCustomers';
import CustomerForm from '../../components/customers/CustomerForm';

interface Customer {
  customerId: string;
  customerName: string;
  customerLastName: string | null;
  customerEmail: string;
  customerPhone1: string | null;
  customerPhone2: string | null;
  customerFacebook: string | null;
  customerInstagram: string | null;
  customerTikTok: string | null;
  customerLine: string | null;
  customerX: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  fullName: string;
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
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
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
    handlePageChange = () => {},
    handlePageSizeChange = () => {},
    handleFilterChange = () => {},
    createCustomer = async () => {},
    updateCustomer = async () => {},
    deleteCustomer = async () => {},
  } = useCustomers();

  const emptyRows = page > 0 ? Math.max(0, (1 + page) * pageSize - customers.length) : 0;

  // Filter customers based on tab value
  const filteredCustomers = customers.filter(customer => {
    if (tabValue === 1) return customer.isActive;
    if (tabValue === 2) return !customer.isActive;
    return true; // tabValue === 0 (All)
  });

  const handlePageChangeEvent = (_: React.MouseEvent<HTMLButtonElement> | null, newPage: number) => {
    handlePageChange(newPage + 1);
  };

  const handleChangeRowsPerPage = (e: React.ChangeEvent<HTMLInputElement>) => {
    handlePageSizeChange(parseInt(e.target.value, 10));
    handlePageChange(1);
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    const statusMap: (CustomerStatus | 'all')[] = ['all', 'active', 'inactive'];
    const selectedStatus = statusMap[newValue] || 'all';
    handleFilterChange({ status: selectedStatus });
  };

  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelected = filteredCustomers.map((n) => n.customerId);
      setSelected(newSelected);
      return;
    }
    setSelected([]);
  };



  const handleClick = (event: React.MouseEvent<unknown>, id: string) => {
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

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleFilterClick = (event: React.MouseEvent<HTMLElement>) => {
    setFilterAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
    setFilterAnchorEl(null);
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
      } catch (error) {
        showSnackbar('Failed to delete customer', 'error');
      }
    }
  };

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
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
            onClick={() => handleOpenForm()}
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
            onChange={handleTabChange}
            aria-label="customer tabs"
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="All" {...a11yProps(0)} />
            <Tab
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  <CheckCircleIcon fontSize="small" color="primary" />
                  <span>Active</span>
                  <Chip
                    label={customers.filter((m) => m.isActive).length}
                    size="small"
                    color="primary"
                    sx={{ height: 20, fontSize: '0.675rem', fontWeight: 600 }}
                  />
                </Box>
              }
              {...a11yProps(1)}
            />
            <Tab
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  <BlockIcon fontSize="small" color="action" />
                  <span>Inactive</span>
                  <Chip
                    label={customers.filter((m) => !m.isActive).length}
                    size="small"
                    color="default"
                    sx={{ height: 20, fontSize: '0.675rem', fontWeight: 600 }}
                  />
                </Box>
              }
              {...a11yProps(2)}
            />
          </Tabs>
        </Box>
      </Box>

      <Box sx={{ p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <TextField
          placeholder="Search customers..."
          variant="outlined"
          size="small"
          value={filter.search || ''}
          onChange={(e) => handleFilterChange({ search: e.target.value })}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ width: 300 }}
        />

        <Box>
          <IconButton>
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader aria-label="customer table">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    color="primary"
                    indeterminate={selected.length > 0 && selected.length < customers.length}
                    checked={customers.length > 0 && selected.length === customers.length}
                    onChange={handleSelectAllClick}
                    inputProps={{ 'aria-label': 'select all customers' }}
                  />
                </TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Joined Date</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                    <Typography color="textSecondary">No customers found</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((customer) => {
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
                      <TableCell>{customer.customerEmail}</TableCell>
                      <TableCell>{customer.customerPhone1 || 'N/A'}</TableCell>
                      <TableCell>
                        <Chip
                          label={customer.isActive ? 'Active' : 'Inactive'}
                          color={customer.isActive ? 'success' : 'default'}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(customer.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <IconButton>
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
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        <MenuItem onClick={handleClose}>
          <ListItemIcon>
            <PersonAddIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Add Single Customer</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleClose}>
          <ListItemIcon>
            <GroupAddIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Add Multiple Customers</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleClose}>
          <ListItemIcon>
            <FileUploadIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Import from CSV</ListItemText>
        </MenuItem>
      </Menu>

      {/* Filter Menu */}
      <Menu
        anchorEl={filterAnchorEl}
        open={Boolean(filterAnchorEl)}
        onClose={handleClose}
      >
        <MenuItem onClick={handleClose}>
          <ListItemIcon>
            <FilterAltIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Filter by Status</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleClose}>
          <ListItemIcon>
            <LabelIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Filter by Tags</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleClose}>
          <ListItemIcon>
            <AccessTimeIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Filter by Last Active</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default CustomerPage;
