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
} from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '../../store/store';
import {
  loginUser,
  clearAuthError,
  selectAuthError,
  selectAuthLoading,
  selectIsAuthenticated,
} from '../../store/slices/authSlice';
import { useNavigate } from 'react-router-dom';

const MAX_ATTEMPTS = 5;

export default function LoginPage() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const loading = useSelector(selectAuthLoading);
  const error = useSelector(selectAuthError); // string | null
  const isAuthenticated = useSelector(selectIsAuthenticated);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [attempts, setAttempts] = useState(0);

  // Clear error when user edits inputs
  useEffect(() => {
    if (error) {
      dispatch(clearAuthError());
    }
  }, [email, password]);

  // Redirect on success + reset attempts
  useEffect(() => {
    if (isAuthenticated) {
      setAttempts(0);
      navigate('/');
    }
  }, [isAuthenticated]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (attempts >= MAX_ATTEMPTS) return;

    const result = await dispatch(
      loginUser({ email, password, rememberMe })
    );

    if (loginUser.rejected.match(result)) {
      setAttempts((prev) => prev + 1);
    }
  };

  const isLocked = attempts >= MAX_ATTEMPTS;

  return (
    <Container component="main" maxWidth="xs">
      <Paper sx={{ mt: 8, p: 4 }}>
        <Typography variant="h5" textAlign="center">
          Sign in
        </Typography>

        {error && (
          <Typography color="error" sx={{ mt: 2 }}>
            {error.message}
          </Typography>
        )}

        {isLocked && (
          <Typography color="error" sx={{ mt: 1 }}>
            Too many failed attempts. Please try again later.
          </Typography>
        )}

        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
          <TextField
            fullWidth
            margin="normal"
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <TextField
            fullWidth
            margin="normal"
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
            }
            label="Remember me"
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 2 }}
            disabled={loading || isLocked}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
