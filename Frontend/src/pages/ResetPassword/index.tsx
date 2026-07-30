import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Container,
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  CircularProgress,
  InputAdornment,
  IconButton
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import feedback from '../../services/feedback.service';

// Hide browser's built-in password reveal button
const styles = `
  input[type="password"]::-webkit-credentials-auto-fill-button,
  input[type="password"]::-webkit-credentials-auto-fill-button:hover,
  input[type="password"]::-webkit-credentials-auto-fill-button:active,
  input[type="password"]::-webkit-credentials-auto-fill-button:focus,
  input[type="password"]::-ms-reveal,
  input[type="password"]::-ms-clear {
    display: none !important;
    visibility: hidden !important;
    pointer-events: none !important;
    width: 0 !important;
    height: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    position: absolute !important;
    right: -9999px !important;
  }
`;

// Add styles to the document head
const styleElement = document.createElement('style');
styleElement.textContent = styles;
document.head.appendChild(styleElement);

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const token = searchParams.get('token');

  const handleClickShowPassword = () => setShowPassword((show) => !show);
  const handleClickShowConfirmPassword = () => setShowConfirmPassword((show) => !show);
  
  const handleMouseDownPassword = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  useEffect(() => {
    if (!token) {
      navigate('/login', { replace: true });
    }
  }, [token, navigate]);

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (password !== confirmPassword) {
    await feedback.fire({
      icon: 'error',
      title: 'Password Mismatch',
      text: 'Passwords do not match',
      customClass: {
        popup: 'swal2-error-dialog'
      }
    });
    return;
  }

  if (password.length < 8) {
    await feedback.fire({
      icon: 'error',
      title: 'Password Too Short',
      text: 'Password must be at least 8 characters long',
      customClass: {
        popup: 'swal2-error-dialog'
      }
    });
    return;
  }

  try {
    setIsLoading(true);
    
    const urlToken = searchParams.get('token');
    if (!urlToken) {
      throw new Error('Invalid or missing reset token');
    }

    // Make a POST request to the reset password endpoint
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: urlToken,  // Use the token from URL
        newPassword: password
      })
    });

    const responseData = await response.json();

    if (!response.ok) {
      await feedback.fire({
        icon: 'error',
        title: 'Reset Failed',
        text: responseData.message || 'Failed to reset password',
        customClass: {
          popup: 'swal2-error-dialog'
        }
      });
      throw new Error(responseData.message || 'Failed to reset password');
    }

    await feedback.fire({
      icon: 'success',
      title: 'Password Reset Successful!',
      text: 'Your password has been updated successfully. Redirecting to login page...',
      timer: 3000,
      timerProgressBar: true,
      customClass: {
        popup: 'swal2-success-dialog'
      }
    });
    
    navigate('/login');
  } catch (error: any) {
    console.error('Reset password error:', error);
    await feedback.fire({
      icon: 'error',
      title: 'Reset Failed',
      text: error.message || 'Failed to reset password. Please try again.',
      customClass: {
        popup: 'swal2-error-dialog'
      }
    });
  } finally {
    setIsLoading(false);
  }
};

  if (!token) {
    return null;
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
          Reset Your Password
        </Typography>
        <Paper variant="outlined" sx={{
          p: 4, 
          mt: 3, 
          width: '100%',
          backgroundColor: 'background.paper',
          borderColor: 'divider',
          borderRadius: 3,
          boxShadow: 'none',
        }}>
          <Box component="form" onSubmit={handleSubmit} noValidate>
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="New Password"
              type={showPassword ? 'text' : 'password'}
              id="password"
              value={password}
              autoComplete="new-password"
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={handleClickShowPassword}
                      onMouseDown={handleMouseDownPassword}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="confirmPassword"
              label="Confirm New Password"
              type={showConfirmPassword ? 'text' : 'password'}
              id="confirmPassword"
              value={confirmPassword}
              autoComplete="confirm-password"
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle confirm password visibility"
                      onClick={handleClickShowConfirmPassword}
                      onMouseDown={handleMouseDownPassword}
                      edge="end"
                    >
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2, py: 1.5 }}
              disabled={isLoading}
              startIcon={isLoading ? <CircularProgress size={20} /> : null}
            >
              {isLoading ? 'Resetting...' : 'Reset Password'}
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default ResetPassword;
