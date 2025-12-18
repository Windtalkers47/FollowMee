import React from 'react';
import { Box, Typography, Button, Container } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import CustomerList from '../../components/CustomerList';
import { customerService } from '../../services/customer.service';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

export const Customers: React.FC = () => {
  const { data: customers = [], isLoading, error } = useQuery({
    queryKey: ['customers'],
    queryFn: () => customerService.getCustomers(),
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return <LoadingSpinner fullScreen />;
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box textAlign="center" py={4}>
          <Typography color="error" gutterBottom>
            Error loading customers. Please try again later.
          </Typography>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={() => window.location.reload()}
            sx={{ mt: 2 }}
          >
            Retry
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <CustomerList customers={customers} />
    </Box>
  );
};

export default Customers;
