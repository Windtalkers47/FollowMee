import React, { useState, useEffect } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper, 
  Button, 
  IconButton, 
  Chip, 
  Box,
  Typography
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';
import { customerService, Customer } from '../services/customer.service';
import CustomerModal from './CustomerModal';

const CustomerList: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const fetchCustomers = async () => {
    const data = await customerService.getCustomers();
    setCustomers(data);
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleAddCustomer = () => {
    setSelectedCustomer(null);
    setIsModalOpen(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsModalOpen(true);
  };

  const handleDeleteCustomer = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this customer?')) {
      await customerService.deleteCustomer(id);
      fetchCustomers();
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedCustomer(null);
  };

  const handleSubmit = async (customerData: Omit<Customer, 'customerId' | 'createdAt' | 'updatedAt'>) => {
    if (selectedCustomer) {
      await customerService.updateCustomer(selectedCustomer.customerId, customerData);
    } else {
      await customerService.createCustomer(customerData);
    }
    fetchCustomers();
    handleModalClose();
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Customers
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleAddCustomer}
          sx={{ 
            backgroundColor: '#9c27b0', // Pastel purple
            '&:hover': {
              backgroundColor: '#7b1fa2',
            },
          }}
        >
          Add Customer
        </Button>
      </Box>

      <TableContainer component={Paper} elevation={3}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f3e5f5' }}> {/* Light pastel purple */}
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {customers.map((customer) => (
              <TableRow 
                key={customer.customerId}
                sx={{ '&:nth-of-type(odd)': { backgroundColor: '#fafafa' } }}
              >
                <TableCell>
                  {customer.customerName} {customer.customerLastName || ''}
                </TableCell>
                <TableCell>{customer.customerEmail}</TableCell>
                <TableCell>{customer.customerPhone1}</TableCell>
                <TableCell>
                  <Chip 
                    label={customer.isActive ? 'Active' : 'Inactive'}
                    color={customer.isActive ? 'success' : 'default'}
                    size="small"
                    sx={{ 
                      backgroundColor: customer.isActive ? '#c8e6c9' : '#ffcdd2', // Pastel green/red
                    }}
                  />
                </TableCell>
                <TableCell align="right">
                  <IconButton 
                    onClick={() => handleEditCustomer(customer)}
                    color="primary"
                    sx={{ color: '#5e35b1' }} // Deep pastel purple
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton 
                    onClick={() => handleDeleteCustomer(customer.customerId)}
                    color="error"
                    sx={{ color: '#e91e63' }} // Pastel pink
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <CustomerModal
        open={isModalOpen}
        onClose={handleModalClose}
        onSubmit={handleSubmit}
        customer={selectedCustomer}
      />
    </Box>
  );
};

export default CustomerList;
