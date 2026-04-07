import React, { useState, useEffect } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useAppDispatch } from '../../store/store';
import { loginUser } from '../../store/slices/authSlice';
import authApi, { LoginCredentials, RegisterCredentials } from '../../api/auth.api';
import RoleSelector from '../../components/RoleSelector';
import {
  Container,
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Link,
  Divider,
  IconButton,
  InputAdornment,
} from '@mui/material';
import { LockOutlined, Visibility, VisibilityOff } from '@mui/icons-material';
import Swal from 'sweetalert2';

const Register = () => {
  const [formData, setFormData] = useState({
    userName: '',
    userLastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    userPhone1: '',
    selectedRole: 'Moderator', // Default to Moderator
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [roleCounts, setRoleCounts] = useState({
    Customer: 0,
    Moderator: 0,
    Admin: 0,
    Superadmin: 0
  });
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  // Fetch role counts on component mount
  useEffect(() => {
    const fetchRoleCounts = async () => {
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        const response = await fetch(`${API_BASE_URL}/user-management/users`, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            const counts = {
              Customer: 0,
              Moderator: 0,
              Admin: 0,
              Superadmin: 0
            };

            result.data.forEach((user: any) => {
              user.roles.forEach((role: string) => {
                if (counts.hasOwnProperty(role)) {
                  counts[role as keyof typeof counts]++;
                }
              });
            });

            setRoleCounts(counts);
          }
        }
      } catch (error) {
        console.error('Error fetching role counts:', error);
      }
    };

    fetchRoleCounts();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = async () => {
    if (formData.password !== formData.confirmPassword) {
      await Swal.fire({
        icon: 'error',
        title: 'Password Mismatch',
        text: 'Passwords do not match',
        customClass: {
          popup: 'swal2-error-dialog'
        },
        html: true
      });
      return false;
    }
    if (formData.password.length < 8) {
      await Swal.fire({
        icon: 'error',
        title: 'Password Too Short',
        text: 'Password must be at least 8 characters long',
        customClass: {
          popup: 'swal2-error-dialog'
        },
        html: true
      });
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      await Swal.fire({
        icon: 'error',
        title: 'Invalid Email',
        text: 'Please enter a valid email address',
        customClass: {
          popup: 'swal2-error-dialog'
        },
        html: true
      });
      return false;
    }
    if (!formData.userName.trim() || !formData.userLastName.trim()) {
      await Swal.fire({
        icon: 'error',
        title: 'Missing Name',
        text: 'Please enter your full name',
        customClass: {
          popup: 'swal2-error-dialog'
        },
        html: true
      });
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!(await validateForm())) return;

    try {
      setIsLoading(true);
      
      // Show loading
      Swal.showLoading();
      
      // Register the user
      const registrationData: RegisterCredentials = {
        email: formData.email,
        userName: formData.userName,
        userLastName: formData.userLastName,
        userPassword: formData.password,
        userPhone1: formData.userPhone1 || undefined,
        selectedRole: formData.selectedRole
      };
      
      const response = await authApi.register(registrationData);
      
      // Hide loading
      Swal.hideLoading();
      
      // Check if it was a reactivation or new registration
      const isReactivation = response.success && response.message === 'Account reactivated successfully';
      
      // Show appropriate success message
      await Swal.fire({
        icon: 'success',
        title: isReactivation ? 'Welcome Back!' : 'Registration Successful',
        text: isReactivation 
          ? 'Your account has been reactivated successfully. Redirecting to dashboard...'
          : 'Your account has been created successfully. Redirecting to dashboard...',
        timer: 2000,
        timerProgressBar: true,
        customClass: {
          popup: 'swal2-success-dialog'
        },
        // html: true
      });

      // Automatically log in the user after registration
      const loginCredentials: LoginCredentials = {
        email: formData.email,
        password: formData.password,
        rememberMe: false
      };
      
      // Dispatch login action with credentials
      const resultAction = await dispatch(loginUser(loginCredentials));
      
      // Check if login was successful
      if (loginUser.fulfilled.match(resultAction)) {
        // Redirect to dashboard on successful registration and login
        navigate('/dashboard');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      
      // Hide loading
      Swal.hideLoading();
      
      // Show detailed error message
      const errorMessage = error.response?.data?.message || 'Registration failed. Please try again.';
      const isDuplicateEmail = errorMessage.includes('Duplicate entry') || errorMessage.includes('already in use');
      
      await Swal.fire({
        icon: 'error',
        title: isDuplicateEmail ? 'Email Already Exists' : 'Registration Failed',
        text: isDuplicateEmail 
          ? 'This email address is already registered. If you previously had an account, it may have been deactivated. Please try logging in instead.'
          : errorMessage,
        customClass: {
          popup: 'swal2-error-dialog'
        },
        html: true
      });
    } finally {
      setIsLoading(false);
    }
  };

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
          <Typography component="h1" variant="h5">
            Create an account
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Join FollowMee to manage your social media efficiently
          </Typography>
        </Box>

        <Paper elevation={3} sx={{ 
          p: 4, 
          mt: 3, 
          width: '100%',
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(25px) saturate(200%)',
          WebkitBackdropFilter: 'blur(25px) saturate(200%)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)',
          borderRadius: 4,
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
        }}>
          
          <Box component="form" onSubmit={handleSubmit} noValidate>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="userName"
                label="First Name"
                name="userName"
                autoComplete="given-name"
                autoFocus
                value={formData.userName}
                onChange={handleChange}
                disabled={isLoading}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                id="userLastName"
                label="Last Name"
                name="userLastName"
                autoComplete="family-name"
                value={formData.userLastName}
                onChange={handleChange}
                disabled={isLoading}
              />
            </Box>
            
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              value={formData.email}
              onChange={handleChange}
              disabled={isLoading}
            />
            
            <RoleSelector
              value={formData.selectedRole}
              onChange={(value) => setFormData(prev => ({ ...prev, selectedRole: value }))}
              disabled={isLoading}
              roleCounts={roleCounts}
              showCounts={true}
              currentUserRole=""
            />
            
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="new-password"
              value={formData.password}
              onChange={handleChange}
              disabled={isLoading}
              helperText="Minimum 8 characters"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
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
              label="Confirm Password"
              type={showConfirmPassword ? 'text' : 'password'}
              id="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              disabled={isLoading}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      edge="end"
                    >
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            
            <TextField
              margin="normal"
              fullWidth
              name="userPhone1"
              label="Phone Number (Optional)"
              type="tel"
              id="phone"
              autoComplete="tel"
              value={formData.userPhone1}
              onChange={handleChange}
              disabled={isLoading}
            />
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2, py: 1.5 }}
              disabled={isLoading}
              startIcon={isLoading ? <CircularProgress size={20} /> : null}
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </Button>
            
            <Divider sx={{ my: 2 }}>
              <Typography variant="body2" color="text.secondary">
                OR
              </Typography>
            </Divider>
            
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Already have an account?{' '}
                <Link component={RouterLink} to="/login" variant="body2">
                  Sign in
                </Link>
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Register;
