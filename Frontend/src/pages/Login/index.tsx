import React, { useState } from 'react';
import { 
  Box, 
  TextField, 
  Button, 
  Typography, 
  Container, 
  Paper, 
  Link,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../api/auth.api';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', severity: 'success' });
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement login logic with cookies
    console.log('Login submitted', { email, password });
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) {
      setMessage({ text: 'Please enter your email', severity: 'error' });
      return;
    }

    try {
      setIsLoading(true);
      setMessage({ text: '', severity: 'success' });
      await authApi.forgotPassword(forgotEmail);
      setMessage({ 
        text: 'Password reset link has been sent to your email', 
        severity: 'success' 
      });
      setForgotEmail('');
      setTimeout(() => setForgotOpen(false), 3000);
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to send reset email';
      setMessage({ text: errorMessage, severity: 'error' });
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
          Sign in to FollowMee
        </Typography>
        <Paper elevation={3} sx={{ p: 4, mt: 3, width: '100%' }}>
          <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
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
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Box sx={{ textAlign: 'right', mb: 2 }}>
              <Link 
                component="button" 
                variant="body2"
                onClick={() => setForgotOpen(true)}
                sx={{ textDecoration: 'none' }}
              >
                Forgot password?
              </Link>
            </Box>
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 1, mb: 2, py: 1.5 }}
            >
              Sign In
            </Button>
            <Box sx={{ textAlign: 'center' }}>
              <Link 
                component="button" 
                variant="body2" 
                onClick={() => navigate('/register')}
                sx={{ textDecoration: 'none' }}
              >
                Don't have an account? Sign Up
              </Link>
            </Box>
          </Box>
        </Paper>
      </Box>

      {/* Forgot Password Dialog */}
      <Dialog open={forgotOpen} onClose={() => setForgotOpen(false)}>
        <DialogTitle>Reset Your Password</DialogTitle>
        <form onSubmit={handleForgotPassword}>
          <DialogContent>
            <Typography variant="body1" gutterBottom>
              Enter your email address and we'll send you a link to reset your password.
            </Typography>
            {message.text && (
              <Alert 
                severity={message.severity as 'success' | 'error'} 
                sx={{ mb: 2 }}
              >
                {message.text}
              </Alert>
            )}
            <TextField
              autoFocus
              margin="dense"
              id="forgot-email"
              label="Email Address"
              type="email"
              fullWidth
              variant="outlined"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              disabled={isLoading}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button 
              onClick={() => {
                setForgotOpen(false);
                setMessage({ text: '', severity: 'success' });
              }}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="contained" 
              disabled={isLoading}
              endIcon={isLoading ? <CircularProgress size={20} /> : null}
            >
              {isLoading ? 'Sending...' : 'Send Reset Link'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Container>
  );
};

export default LoginPage;
