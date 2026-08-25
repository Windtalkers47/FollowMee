import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import authApi from '../../api/auth.api';
import {
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Link,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import feedback from '../../services/feedback.service';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import AuthShell from '../../components/AuthShell';

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
      });
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      await feedback.fire({
        icon: 'error',
        title: t('auth.forgot.invalidEmailTitle'),
        text: t('validation.emailInvalid'),
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
        timer: 4800,
        showConfirmButton: false,
      });
      navigate('/login');
    } catch {
      await feedback.fire({
        icon: 'error',
        title: t('auth.forgot.sendFailed'),
        text: t('auth.forgot.sendFailedText'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell title={t('auth.forgot.title')}>
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
    </AuthShell>
  );
};

export default ForgotPassword;
