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
} from '../../store/slices/authSlice';
import { useNavigate, Link as RouterLink } from 'react-router-dom';

const MAX_ATTEMPTS = 5;

export default function LoginPage() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const theme = useTheme();

  const loading = useSelector(selectAuthLoading);
  const error = useSelector(selectAuthError);
  const isAuthenticated = useSelector(selectIsAuthenticated);

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
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

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
        background: theme.palette.mode === 'dark'
          ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)'
          : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        '&::before': {
          content: '""',
          position: 'absolute',
          width: { xs: '200px', md: '300px' },
          height: { xs: '200px', md: '300px' },
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.3) 0%, transparent 70%)',
          top: { xs: '-100px', md: '-150px' },
          right: { xs: '-100px', md: '-150px' },
          animation: 'float 8s ease-in-out infinite',
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          width: { xs: '150px', md: '250px' },
          height: { xs: '150px', md: '250px' },
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(168, 85, 247, 0.3) 0%, transparent 70%)',
          bottom: { xs: '-75px', md: '-125px' },
          left: { xs: '-75px', md: '-125px' },
          animation: 'float 10s ease-in-out infinite reverse',
        },
      }}
    >
      <style>
        {`
          @keyframes float {
            0%, 100% { transform: translate(0, 0) rotate(0deg); }
            50% { transform: translate(30px, -30px) rotate(180deg); }
          }
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes pulse {
            0%, 100% { opacity: 0.5; }
            50% { opacity: 1; }
          }
        `}
      </style>

      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: 480,
          mx: { xs: 2, sm: 3 },
        }}
      >
        {/* ===== Header ===== */}
        <Box sx={{ textAlign: 'center', mb: { xs: 2, sm: 3 }, animation: 'slideUp 0.6s ease-out' }}>
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: { xs: 64, sm: 80 },
              height: { xs: 64, sm: 80 },
              borderRadius: '24px',
              background: theme.palette.mode === 'dark'
                ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.8), rgba(168, 85, 247, 0.8))'
                : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.7))',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: theme.palette.mode === 'dark'
                ? '1px solid rgba(255, 255, 255, 0.2)'
                : '1px solid rgba(255, 255, 255, 0.5)',
              boxShadow: theme.palette.mode === 'dark'
                ? '0 8px 32px rgba(99, 102, 241, 0.3)'
                : '0 8px 32px rgba(0, 0, 0, 0.1)',
              mb: 3,
              animation: 'float 6s ease-in-out infinite',
            }}
          >
            <LockIcon
              sx={{
                fontSize: { xs: 24, sm: 28 },
                color: theme.palette.mode === 'dark' ? '#fff' : '#6366f1',
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
            Welcome Back
          </Typography>
          <Typography
            variant="body1"
            color={theme.palette.mode === 'dark' ? 'text.secondary' : 'rgba(255, 255, 255, 0.8)'}
            sx={{ fontWeight: 400 }}
          >
            Sign in to continue to FollowMee
          </Typography>
        </Box>

        {/* ===== Form Card ===== */}
        <Box
          sx={{
            p: { xs: 2.5, sm: 3 },
            borderRadius: 3,
            background: theme.palette.mode === 'dark'
              ? 'rgba(30, 41, 59, 0.8)'
              : 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: theme.palette.mode === 'dark'
              ? '1px solid rgba(255, 255, 255, 0.1)'
              : '1px solid rgba(255, 255, 255, 0.5)',
            boxShadow: theme.palette.mode === 'dark'
              ? '0 8px 32px rgba(0, 0, 0, 0.4)'
              : '0 8px 32px rgba(0, 0, 0, 0.1)',
            animation: 'slideUp 0.6s ease-out 0.1s both',
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
              Too many failed attempts. Please try again later.
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
                Email
              </Typography>
              <TextField
                fullWidth
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="Enter your email"
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
                Password
              </Typography>
              <TextField
                fullWidth
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
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
                    Remember me
                  </Typography>
                }
              />

              <Typography
                component={RouterLink}
                to="/forgot-password"
                variant="body2"
                sx={{
                  textDecoration: 'none',
                  color: 'primary.main',
                  fontWeight: 600,
                  '&:hover': {
                    textDecoration: 'underline',
                  },
                }}
              >
                Forgot password?
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
                background: theme.palette.mode === 'dark'
                  ? 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)'
                  : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.4)}`,
                '&:hover': {
                  background: theme.palette.mode === 'dark'
                    ? 'linear-gradient(135deg, #4f46e5 0%, #9333ea 100%)'
                    : 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                  boxShadow: `0 6px 25px ${alpha(theme.palette.primary.main, 0.5)}`,
                  transform: 'translateY(-1px)',
                },
                '&:active': {
                  transform: 'translateY(0)',
                },
                '&.Mui-disabled': {
                  background: theme.palette.mode === 'dark'
                    ? 'rgba(99, 102, 241, 0.3)'
                    : 'rgba(99, 102, 241, 0.3)',
                },
              }}
            >
              {loading ? 'Signing in...' : 'Sign in'}
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
            <Typography
              variant="body2"
              sx={{ color: 'text.secondary' }}
            >
              Don't have an account?{' '}
              <Typography
                component={RouterLink}
                to="/register"
                sx={{
                  fontWeight: 700,
                  textDecoration: 'none',
                  color: 'primary.main',
                  ml: 0.5,
                  '&:hover': {
                    textDecoration: 'underline',
                  },
                }}
              >
                Sign up
              </Typography>
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
