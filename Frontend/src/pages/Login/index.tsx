import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Checkbox,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Alert,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email as EmailIcon,
  Lock as LockIcon,
  ArrowForward as ArrowForwardIcon,
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '../../store/store';
import {
  loginUser,
  clearAuthError,
  selectAuthError,
  selectAuthLoading,
  selectIsAuthenticated,
  selectCurrentUser,
} from '../../store/slices/authSlice';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import { env } from '../../utils/env';
import { canUsePublicRegistration } from '../../utils/registrationPolicy';

const MAX_ATTEMPTS = 5;

export default function LoginPage() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const theme = useTheme();
  const { t } = useUserPreferences();
  const accessibleAccent = theme.palette.mode === 'dark' ? theme.palette.primary.light : '#17692D';

  const loading = useSelector(selectAuthLoading);
  const error = useSelector(selectAuthError);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const currentUser = useSelector(selectCurrentUser);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null);

  /* ================= Effects ================= */
  useEffect(() => {
    if (error) {
      dispatch(clearAuthError());
    }
  }, [email, password]);

  useEffect(() => {
    if (isAuthenticated) {
      setAttempts(0);
      navigate(currentUser?.roles?.some((role) => ['Admin', 'Owner', 'Superadmin'].includes(role)) ? '/dashboard' : '/my-work');
    }
  }, [isAuthenticated, navigate, currentUser]);

  /* ================= Handlers ================= */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (attempts >= MAX_ATTEMPTS) return;

    const result = await dispatch(
      loginUser({ email, password, rememberMe })
    );

    if (loginUser.rejected.match(result)) {
      setAttempts(prev => prev + 1);
    }
  };

  const isLocked = attempts >= MAX_ATTEMPTS;

  /* ================= UI ================= */
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        py: { xs: 1, sm: 2 },
        bgcolor: 'background.default',
      }}
    >
      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: 1040,
          mx: { xs: 2, sm: 3 },
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 480px' },
          alignItems: 'center',
          gap: { md: 7 },
        }}
      >
        <Box sx={{ display: { xs: 'none', md: 'block' }, pr: 2 }}>
          <Typography variant="overline" sx={{ color: accessibleAccent }} fontWeight={800}>
            {t('auth.login.eyebrow')}
          </Typography>
          <Typography variant="h2" fontWeight={800} sx={{ mt: 1, mb: 2, maxWidth: 540 }}>
            {t('auth.login.heroTitle')}
          </Typography>
          <Typography color="text.secondary" sx={{ maxWidth: 500, mb: 4, fontSize: '1.05rem' }}>
            {t('auth.login.heroBody')}
          </Typography>
          <Box
            sx={{
              width: 300,
              p: 3,
              borderRadius: 4,
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: 'none',
            }}
          >
            <Box sx={{ width: 64, height: 64, borderRadius: '50%', bgcolor: 'rgba(52,199,89,.16)', mb: 3 }} />
            <Typography variant="h5" fontWeight={800}>{t('auth.login.previewName')}</Typography>
            <Typography color="text.secondary" sx={{ mt: 0.5 }}>{t('auth.login.previewBody')}</Typography>
            <Button fullWidth variant="contained" sx={{ mt: 3, pointerEvents: 'none' }}>{t('auth.login.viewProfile')}</Button>
          </Box>
        </Box>
        <Box>
        {/* ===== Header ===== */}
        <Box sx={{ textAlign: 'center', mb: { xs: 2, sm: 3 } }}>
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: { xs: 64, sm: 80 },
              height: { xs: 64, sm: 80 },
              borderRadius: '24px',
              bgcolor: 'rgba(52,199,89,.14)',
              border: '1px solid',
              borderColor: 'rgba(52,199,89,.24)',
              boxShadow: 'none',
              mb: 3,
            }}
          >
            <LockIcon
              sx={{
                fontSize: { xs: 24, sm: 28 },
                color: theme.palette.mode === 'dark' ? '#07120A' : '#248A3D',
              }}
            />
          </Box>

          <Typography
            variant="h3"
            fontWeight={800}
            sx={{
              mb: 1,
              color: theme.palette.mode === 'dark' ? '#fff' : '#1e293b',
            }}
          >
            {t('auth.login.title')}
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ fontWeight: 400 }}
          >
            {t('auth.login.subtitle')}
          </Typography>
        </Box>

        {/* ===== Form Card ===== */}
        <Box
          sx={{
            p: { xs: 2.5, sm: 3 },
            borderRadius: 3,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: 'none',
          }}
        >
          {/* ===== Errors ===== */}
          {error && (
            <Alert
              severity="error"
              sx={{
                mb: 2,
                borderRadius: 2,
                background: alpha(theme.palette.error.main, 0.1),
                border: `1px solid ${alpha(theme.palette.error.main, 0.3)}`,
                py: 0.5,
              }}
            >
              {error.message}
            </Alert>
          )}

          {isLocked && (
            <Alert
              severity="warning"
              sx={{
                mb: 2,
                borderRadius: 2,
                background: alpha(theme.palette.warning.main, 0.1),
                border: `1px solid ${alpha(theme.palette.warning.main, 0.3)}`,
                py: 0.5,
              }}
            >
              {t('auth.login.locked')}
            </Alert>
          )}

          {/* ===== Form ===== */}
          <Box component="form" onSubmit={handleSubmit}>
            <Box sx={{ mb: 3 }}>
              <Typography
                variant="body2"
                sx={{
                  mb: 1,
                  fontWeight: 600,
                  color: theme.palette.mode === 'dark' ? 'text.primary' : 'text.primary',
                }}
              >
                {t('common.email')}
              </Typography>
              <TextField
                fullWidth
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder={t('auth.login.emailPlaceholder')}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon
                        sx={{
                          color: focusedField === 'email' ? 'primary.main' : 'text.secondary',
                          transition: 'color 0.2s',
                        }}
                      />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    backgroundColor: theme.palette.mode === 'dark'
                      ? 'rgba(15, 23, 42, 0.5)'
                      : 'rgba(255, 255, 255, 0.8)',
                    },
                  '& .MuiOutlinedInput-root.Mui-focused': {
                    boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.2)}`,
                  },
                }}
              />
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography
                variant="body2"
                sx={{
                  mb: 1,
                  fontWeight: 600,
                  color: theme.palette.mode === 'dark' ? 'text.primary' : 'text.primary',
                }}
              >
                {t('common.password')}
              </Typography>
              <TextField
                fullWidth
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder={t('auth.login.passwordPlaceholder')}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon
                        sx={{
                          color: focusedField === 'password' ? 'primary.main' : 'text.secondary',
                          transition: 'color 0.2s',
                        }}
                      />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(prev => !prev)}
                        edge="end"
                        aria-label={showPassword ? t('common.hidePassword') : t('common.showPassword')}
                        sx={{ color: 'text.secondary' }}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    backgroundColor: theme.palette.mode === 'dark'
                      ? 'rgba(15, 23, 42, 0.5)'
                      : 'rgba(255, 255, 255, 0.8)',
                  },
                  '& .MuiOutlinedInput-root.Mui-focused': {
                    boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.2)}`,
                  },
                }}
              />
            </Box>

            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 2.5,
              }}
            >
              <FormControlLabel
                control={
                  <Checkbox
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    sx={{
                      color: 'text.secondary',
                      '&.Mui-checked': {
                        color: 'primary.main',
                      },
                    }}
                  />
                }
                label={
                  <Typography
                    variant="body2"
                    sx={{ color: 'text.secondary' }}
                  >
                    {t('auth.login.remember')}
                  </Typography>
                }
              />

              <Typography
                component={RouterLink}
                to="/forgot-password"
                variant="body2"
                sx={{
                  textDecoration: 'none',
                  color: accessibleAccent,
                  fontWeight: 600,
                  minHeight: 44,
                  display: 'inline-flex',
                  alignItems: 'center',
                  '&:hover': {
                    textDecoration: 'underline',
                  },
                }}
              >
                {t('auth.login.forgot')}
              </Typography>
            </Box>

            <Button
              type="submit"
              fullWidth
              size="large"
              variant="contained"
              endIcon={!loading && <ArrowForwardIcon />}
              disabled={loading || isLocked}
              sx={{
                py: 1.5,
                borderRadius: 2,
                fontWeight: 600,
                fontSize: '0.9375rem',
                textTransform: 'none',
                backgroundColor: 'primary.main',
                color: 'primary.contrastText',
                boxShadow: 'none',
                '&:hover': {
                  backgroundColor: 'primary.dark',
                  boxShadow: 'none',
                },
                '&.Mui-disabled': {
                  background: theme.palette.mode === 'dark'
                    ? 'rgba(48, 209, 88, 0.25)'
                    : 'rgba(52, 199, 89, 0.25)',
                },
              }}
            >
              {loading ? t('auth.login.signingIn') : t('auth.login.signIn')}
            </Button>
          </Box>

          {/* ===== Footer ===== */}
          <Box
            sx={{
              mt: 2.5,
              pt: 1.5,
              borderTop: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
              textAlign: 'center',
            }}
          >
            {canUsePublicRegistration(env.isDev, env.features.registration) ? <Typography
              variant="body2"
              sx={{ color: 'text.secondary' }}
            >
              {t('auth.login.noAccount')}{' '}
              <Typography
                component={RouterLink}
                to="/register"
                sx={{
                  fontWeight: 700,
                  textDecoration: 'none',
                  color: accessibleAccent,
                  ml: 0.5,
                  minHeight: 44,
                  display: 'inline-flex',
                  alignItems: 'center',
                  '&:hover': {
                    textDecoration: 'underline',
                  },
                }}
              >
                {t('auth.login.signUp')}
              </Typography>
            </Typography> : <Typography variant="body2" color="text.secondary">{t('auth.login.inviteOnly')}</Typography>}
          </Box>
        </Box>
        </Box>
      </Box>
    </Box>
  );
}
