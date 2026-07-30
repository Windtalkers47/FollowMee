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
import feedback from '../../services/feedback.service';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useUserPreferences();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      await feedback.fire({
        icon: 'error',
        title: t('auth.forgot.emailRequiredTitle'),
        text: t('validation.emailRequired'),
        customClass: {
          popup: 'swal2-error-dialog'
        }
      });
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      await feedback.fire({
        icon: 'error',
        title: t('auth.forgot.invalidEmailTitle'),
        text: t('validation.emailInvalid'),
        customClass: {
          popup: 'swal2-error-dialog'
        }
      });
      return;
    }

    try {
      setIsLoading(true);
      await authApi.forgotPassword(email);
      
      await feedback.fire({
        icon: 'success',
        title: t('auth.forgot.sentTitle'),
        text: t('auth.forgot.sentText', { email }),
        confirmButtonText: t('auth.forgot.backToLogin'),
        customClass: {
          popup: 'swal2-success-dialog'
        }
      }).then((result) => {
        if (result.isConfirmed) {
          navigate('/login');
        }
      });
    } catch (error: any) {
      await feedback.fire({
        icon: 'error',
        title: t('auth.forgot.sendFailed'),
        text: error.message || t('auth.forgot.sendFailedText'),
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
          {t('auth.forgot.title')}
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
          <Typography variant="body1" sx={{ mb: 3 }}>
            {t('auth.forgot.instructions')}
          </Typography>
          <Box component="form" onSubmit={handleSubmit} noValidate>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label={t('common.emailAddress')}
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
              {isLoading ? t('auth.forgot.sending') : t('auth.forgot.send')}
            </Button>
          </Box>
          
          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Link component={RouterLink} to="/login" variant="body2">
              {t('auth.forgot.backToLogin')}
            </Link>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default ForgotPassword;
