import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  FormControlLabel,
  Checkbox,
  Grid,
  IconButton,
  Typography,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { Customer } from '../services/customer.service';

interface CustomerModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Customer, 'customerId' | 'createdAt' | 'updatedAt'>) => void;
  customer: Customer | null;
}

const CustomerModal: React.FC<CustomerModalProps> = ({ 
  open, 
  onClose, 
  onSubmit, 
  customer 
}) => {
  const [formData, setFormData] = useState<Omit<Customer, 'customerId' | 'createdAt' | 'updatedAt'>>({
    customerName: '',
    customerLastName: '',
    customerEmail: '',
    customerPhone1: '',
    customerPhone2: '',
    customerFacebook: '',
    customerInstagram: '',
    customerTikTok: '',
    customerLine: '',
    customerX: '',
    isActive: true,
  });

  useEffect(() => {
    if (customer) {
      setFormData({
        customerName: customer.customerName,
        customerLastName: customer.customerLastName || '',
        customerEmail: customer.customerEmail,
        customerPhone1: customer.customerPhone1 || '',
        customerPhone2: customer.customerPhone2 || '',
        customerFacebook: customer.customerFacebook || '',
        customerInstagram: customer.customerInstagram || '',
        customerTikTok: customer.customerTikTok || '',
        customerLine: customer.customerLine || '',
        customerX: customer.customerX || '',
        isActive: customer.isActive,
      });
    } else {
      setFormData({
        customerName: '',
        customerLastName: '',
        customerEmail: '',
        customerPhone1: '',
        customerPhone2: '',
        customerFacebook: '',
        customerInstagram: '',
        customerTikTok: '',
        customerLine: '',
        customerX: '',
        isActive: true,
      });
    }
  }, [customer, open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          background: 'linear-gradient(145deg, #f8f4ff, #f0e5ff)',
        },
      }}
    >
      <DialogTitle 
        sx={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#9c27b0',
          color: 'white',
          py: 1.5,
          px: 3,
        }}
      >
        <Typography variant="h6">
          {customer ? 'Edit Customer' : 'Add New Customer'}
        </Typography>
        <IconButton 
          onClick={onClose} 
          size="small"
          sx={{ color: 'white' }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ p: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="First Name"
                name="customerName"
                value={formData.customerName}
                onChange={handleChange}
                required
                margin="normal"
                variant="outlined"
                sx={{ backgroundColor: 'white' }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Last Name"
                name="customerLastName"
                value={formData.customerLastName}
                onChange={handleChange}
                margin="normal"
                variant="outlined"
                sx={{ backgroundColor: 'white' }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="email"
                label="Email"
                name="customerEmail"
                value={formData.customerEmail}
                onChange={handleChange}
                required
                margin="normal"
                variant="outlined"
                sx={{ backgroundColor: 'white' }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Phone 1"
                name="customerPhone1"
                value={formData.customerPhone1}
                onChange={handleChange}
                margin="normal"
                variant="outlined"
                sx={{ backgroundColor: 'white' }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Phone 2"
                name="customerPhone2"
                value={formData.customerPhone2}
                onChange={handleChange}
                margin="normal"
                variant="outlined"
                sx={{ backgroundColor: 'white' }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Facebook"
                name="customerFacebook"
                value={formData.customerFacebook}
                onChange={handleChange}
                margin="normal"
                variant="outlined"
                sx={{ backgroundColor: 'white' }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Instagram"
                name="customerInstagram"
                value={formData.customerInstagram}
                onChange={handleChange}
                margin="normal"
                variant="outlined"
                sx={{ backgroundColor: 'white' }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="TikTok"
                name="customerTikTok"
                value={formData.customerTikTok}
                onChange={handleChange}
                margin="normal"
                variant="outlined"
                sx={{ backgroundColor: 'white' }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Line ID"
                name="customerLine"
                value={formData.customerLine}
                onChange={handleChange}
                margin="normal"
                variant="outlined"
                sx={{ backgroundColor: 'white' }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="X (Twitter)"
                name="customerX"
                value={formData.customerX}
                onChange={handleChange}
                margin="normal"
                variant="outlined"
                sx={{ backgroundColor: 'white' }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.isActive}
                    onChange={handleChange}
                    name="isActive"
                    color="primary"
                  />
                }
                label="Active Customer"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button 
            onClick={onClose}
            sx={{
              color: '#9c27b0',
              borderColor: '#9c27b0',
              '&:hover': {
                borderColor: '#7b1fa2',
                backgroundColor: 'rgba(156, 39, 176, 0.04)',
              },
            }}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="contained"
            sx={{
              backgroundColor: '#9c27b0',
              '&:hover': {
                backgroundColor: '#7b1fa2',
              },
            }}
          >
            {customer ? 'Update' : 'Create'} Customer
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default CustomerModal;
