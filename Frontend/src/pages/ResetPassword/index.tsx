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
import { useUserPreferences } from '../../contexts/UserPreferencesContext';

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
  const { t } = useUserPreferences();

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
      title: t('auth.reset.mismatchTitle'),
      text: t('validation.passwordMismatch'),
    });
    return;
  }

  if (password.length < 8) {
    await feedback.fire({
      icon: 'error',
      title: t('auth.reset.shortTitle'),
      text: t('validation.passwordMin'),
    });
    return;
  }

  try {
    setIsLoading(true);
    
    const urlToken = searchParams.get('token');
    if (!urlToken) {
      throw new Error(t('auth.reset.invalidToken'));
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
        title: t('auth.reset.failedTitle'),
        text: responseData.message || t('auth.reset.failedText'),
      });
      throw new Error(responseData.message || t('auth.reset.failedText'));
    }

    await feedback.fire({
      icon: 'success',
      title: t('auth.reset.successTitle'),
      text: t('auth.reset.successText'),
      timer: 3000,
      timerProgressBar: true,
    });
    
    navigate('/login');
  } catch (error: any) {
    console.error('Reset password error:', error);
    await feedback.fire({
      icon: 'error',
      title: t('auth.reset.failedTitle'),
      text: error.message || t('auth.reset.failedText'),
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
          {t('auth.reset.title')}
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
              label={t('auth.reset.newPassword')}
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
                      aria-label={t('auth.reset.togglePassword')}
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
              label={t('auth.reset.confirmPassword')}
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
                      aria-label={t('auth.reset.toggleConfirmPassword')}
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
              {isLoading ? t('auth.reset.resetting') : t('auth.reset.submit')}
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default ResetPassword;
