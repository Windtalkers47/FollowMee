import { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Checkbox,
  FormControlLabel,
  Box,
  IconButton,
  InputAdornment,
  Divider,
  Alert,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  LockOutlined,
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

  const loading = useSelector(selectAuthLoading);
  const error = useSelector(selectAuthError);
  const isAuthenticated = useSelector(selectIsAuthenticated);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [showPassword, setShowPassword] = useState(false);

  /* ================= Effects ================= */
  useEffect(() => {
    if (error) {
      dispatch(clearAuthError());
    }
  }, [email, password]);

  useEffect(() => {
    if (isAuthenticated) {
      setAttempts(0);
      navigate('/');
    }
  }, [isAuthenticated]);

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
    <Container
      maxWidth="xs"
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: '100%',
          p: 4,
          borderRadius: 4,
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(25px) saturate(200%)',
          WebkitBackdropFilter: 'blur(25px) saturate(200%)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)',
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
        }}
      >
        {/* ===== Brand ===== */}
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(74, 108, 247, 0.8), rgba(166, 77, 255, 0.8))',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 1.5,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              animation: 'float 3s ease-in-out infinite',
              '&:hover': {
                transform: 'scale(1.1)',
                boxShadow: '0 8px 25px rgba(74, 108, 247, 0.4)',
              }
            }}
          >
            <LockOutlined sx={{ color: 'white' }} />
          </Box>

          <Typography variant="h5" fontWeight="bold">
            Welcome back
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Sign in to continue to FollowMee
          </Typography>
        </Box>

        {/* ===== Errors ===== */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error.message}
          </Alert>
        )}

        {isLocked && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Too many failed attempts. Please try again later.
          </Alert>
        )}

        {/* ===== Form ===== */}
        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Email"
            type="email"
            margin="normal"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />

          <TextField
            fullWidth
            label="Password"
            margin="normal"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(prev => !prev)}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mt: 1,
            }}
          >
            <FormControlLabel
              control={
                <Checkbox
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                />
              }
              label="Remember me"
            />

            <Typography
              component={RouterLink}
              to="/forgot-password"
              variant="body2"
              sx={{
                textDecoration: 'none',
                color: 'primary.main',
                fontWeight: 500,
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
            sx={{ mt: 3, borderRadius: 2 }}
            disabled={loading || isLocked}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </Box>

        {/* ===== Footer ===== */}
        <Divider sx={{ my: 3 }} />

        <Typography textAlign="center" variant="body2">
          Don’t have an account?{' '}
          <Typography
            component={RouterLink}
            to="/register"
            sx={{
              fontWeight: 600,
              textDecoration: 'none',
              color: 'primary.main',
            }}
          >
            Sign up
          </Typography>
        </Typography>
      </Paper>
    </Container>
  );
}
