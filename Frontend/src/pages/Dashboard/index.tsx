import React from 'react';
import { Box, Typography, Button, Container } from '@mui/material';
import { useAppDispatch } from '../../store/store';
import { logout } from '../../features/auth/authSlice';

const DashboardPage = () => {
  const dispatch = useAppDispatch();

  const handleLogout = () => {
    // TODO: Implement proper logout with cookie clearing
    dispatch(logout());
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Dashboard
        </Typography>
        <Typography variant="body1" paragraph>
          Welcome to your FollowMee dashboard! This is a protected route that only authenticated users can access.
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={handleLogout}
          sx={{ mt: 2 }}
        >
          Logout
        </Button>
      </Box>
    </Container>
  );
};

export default DashboardPage;
