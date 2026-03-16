import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import authApi from '../../api/auth.api';
import {
  Container,
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Link,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import Swal from 'sweetalert2';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      await Swal.fire({
        icon: 'error',
        title: 'Email Required',
        text: 'Please enter your email address',
        customClass: {
          popup: 'swal2-error-dialog'
        }
      });
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      await Swal.fire({
        icon: 'error',
        title: 'Invalid Email',
        text: 'Please enter a valid email address',
        customClass: {
          popup: 'swal2-error-dialog'
        }
      });
      return;
    }

    try {
      setIsLoading(true);
      await authApi.forgotPassword(email);
      
      await Swal.fire({
        icon: 'success',
        title: 'Reset Email Sent!',
        html: `We've sent a password reset link to <strong>${email}</strong><br><br>If you don't see the email, check your spam folder or try again.`,
        confirmButtonText: 'Back to Login',
        customClass: {
          popup: 'swal2-success-dialog'
        }
      }).then((result) => {
        if (result.isConfirmed) {
          navigate('/login');
        }
      });
    } catch (error: any) {
      await Swal.fire({
        icon: 'error',
        title: 'Send Failed',
        text: error.message || 'Failed to send reset email',
        customClass: {
          popup: 'swal2-error-dialog'
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Typography component="h1" variant="h5">
          Forgot Password
        </Typography>
        <Paper elevation={3} sx={{ 
          p: 4, 
          mt: 3, 
          width: '100%',
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(25px) saturate(200%)',
          WebkitBackdropFilter: 'blur(25px) saturate(200%)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)',
          borderRadius: 4,
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(100, 181, 246, 0.6), transparent)',
            opacity: 0.7,
          },
          '&:hover': {
            transform: 'translateY(-2px) scale(1.02)',
            boxShadow: '0 12px 40px 0 rgba(31, 38, 135, 0.45), inset 0 1px 0 0 rgba(255, 255, 255, 0.15)',
          }
        }}>
          <Typography variant="body1" sx={{ mb: 3 }}>
            Enter your email address and we'll send you a link to reset your password.
          </Typography>
          <Box component="form" onSubmit={handleSubmit} noValidate>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2, py: 1.5 }}
              disabled={isLoading || !email}
              startIcon={isLoading ? <CircularProgress size={20} /> : null}
            >
              {isLoading ? 'Sending...' : 'Send Reset Link'}
            </Button>
          </Box>
          
          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Link component={RouterLink} to="/login" variant="body2">
              Back to Login
            </Link>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default ForgotPassword;
