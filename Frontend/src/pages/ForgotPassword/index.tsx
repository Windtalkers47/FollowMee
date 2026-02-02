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
  Alert,
  CircularProgress,
  Link,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Please enter your email address');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      setIsLoading(true);
      await authApi.forgotPassword(email);
      setIsSuccess(true);
    } catch (error: any) {
      setError(error.message || 'Failed to send reset email');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <Container component="main" maxWidth="sm">
        <Box
          sx={{
            marginTop: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Paper elevation={3} sx={{ p: 4, mt: 3, width: '100%', textAlign: 'center' }}>
            <Typography component="h1" variant="h5" gutterBottom>
              Check Your Email
            </Typography>
            <Typography>
              We've sent a password reset link to <strong>{email}</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              If you don't see the email, check your spam folder or try again.
            </Typography>
            <Button
              variant="contained"
              sx={{ mt: 3 }}
              onClick={() => navigate('/login')}
            >
              Back to Login
            </Button>
          </Paper>
        </Box>
      </Container>
    );
  }

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
        <Paper elevation={3} sx={{ p: 4, mt: 3, width: '100%' }}>
          <Typography variant="body1" sx={{ mb: 3 }}>
            Enter your email address and we'll send you a link to reset your password.
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
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
