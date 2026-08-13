import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, Link as RouterLink, useSearchParams } from 'react-router-dom';
import { useAppDispatch } from '../../store/store';
import { loginUser } from '../../store/slices/authSlice';
import authApi, { LoginCredentials, RegisterCredentials } from '../../api/auth.api';
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
  Alert,
  IconButton,
  InputAdornment,
} from '@mui/material';
import { LockOutlined, Visibility, VisibilityOff } from '@mui/icons-material';
import feedback from '../../services/feedback.service';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import { env } from '../../utils/env';
import { canUsePublicRegistration } from '../../utils/registrationPolicy';

interface FormErrors {
  userName: string;
  userLastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface FormTouched {
  userName: boolean;
  userLastName: boolean;
  email: boolean;
  password: boolean;
  confirmPassword: boolean;
}

const Register = () => {
  const [searchParams] = useSearchParams();
  const invitationToken = searchParams.get('invite') || '';
  const publicRegistrationAllowed = canUsePublicRegistration(env.isDev, env.features.registration);
  const [invitationState, setInvitationState] = useState<'loading' | 'valid' | 'invalid' | 'public'>(invitationToken ? 'loading' : 'public');
  const [formData, setFormData] = useState({
    userName: '',
    userLastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    userPhone1: '',
  });
  const [errors, setErrors] = useState<FormErrors>({
    userName: '',
    userLastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [touched, setTouched] = useState<FormTouched>({
    userName: false,
    userLastName: false,
    email: false,
    password: false,
    confirmPassword: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { t } = useUserPreferences();

  useEffect(() => {
    if (!invitationToken) return;
    let active = true;
    authApi.invitation(invitationToken).then(response => {
      if (!active) return;
      setFormData(current => ({ ...current, email: response.data?.email || current.email }));
      setInvitationState('valid');
    }).catch(() => active && setInvitationState('invalid'));
    return () => { active = false; };
  }, [invitationToken]);
  
  // Refs for scrolling to error fields
  const userNameRef = useRef<HTMLInputElement>(null);
  const userLastNameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name } = e.target;
    setTouched(prev => ({
      ...prev,
      [name]: true
    }));
    validateField(name, formData[name as keyof typeof formData]);
  };

  const validateField = (name: string, value: string): boolean => {
    let isValid = true;
    let errorMessage = '';

    switch (name) {
      case 'userName':
        if (!value.trim()) {
          errorMessage = t('validation.firstNameRequired');
          isValid = false;
        }
        break;
      case 'userLastName':
        if (!value.trim()) {
          errorMessage = t('validation.lastNameRequired');
          isValid = false;
        }
        break;
      case 'email':
        if (!value.trim()) {
          errorMessage = t('validation.emailRequired');
          isValid = false;
        } else if (!/\S+@\S+\.\S+/.test(value)) {
          errorMessage = t('validation.emailInvalid');
          isValid = false;
        }
        break;
      case 'password':
        if (!value) {
          errorMessage = t('validation.passwordRequired');
          isValid = false;
        } else if (value.length < 8) {
          errorMessage = t('validation.passwordMin');
          isValid = false;
        }
        break;
      case 'confirmPassword':
        if (!value) {
          errorMessage = t('validation.confirmPasswordRequired');
          isValid = false;
        } else if (value !== formData.password) {
          errorMessage = t('validation.passwordMismatch');
          isValid = false;
        }
        break;
    }

    setErrors(prev => ({
      ...prev,
      [name]: errorMessage
    }));

    return isValid;
  };

  const scrollToFirstError = (errorFields: (keyof FormErrors)[]) => {
    const fieldRefs: Record<string, React.RefObject<HTMLInputElement | null>> = {
      userName: userNameRef,
      userLastName: userLastNameRef,
      email: emailRef,
      password: passwordRef,
      confirmPassword: confirmPasswordRef,
    };

    // Find the first field with error
    for (const fieldName of errorFields) {
      if (errors[fieldName] && fieldRefs[fieldName]?.current) {
        const element = fieldRefs[fieldName].current;
        element.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
        element.focus();
        break;
      }
    }
  };

  const validateForm = (): boolean => {
    // Validate all fields
    const fieldsToValidate: (keyof typeof formData)[] = ['userName', 'userLastName', 'email', 'password', 'confirmPassword'];
    const errorFields: (keyof FormErrors)[] = [];
    
    let allValid = true;

    fieldsToValidate.forEach((field) => {
      const isValid = validateField(field, formData[field] as string);
      if (!isValid) {
        errorFields.push(field as keyof FormErrors);
        allValid = false;
      }
    });

    // Mark all fields as touched
    setTouched({
      userName: true,
      userLastName: true,
      email: true,
      password: true,
      confirmPassword: true,
    } as FormTouched);

    // Scroll to first error if any
    if (!allValid) {
      setTimeout(() => scrollToFirstError(errorFields), 100);
    }

    return allValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setIsLoading(true);
      
      // Show loading
      feedback.showLoading();
      
      // Register the user
      const registrationData: RegisterCredentials = {
        email: formData.email,
        userName: formData.userName,
        userLastName: formData.userLastName,
        userPassword: formData.password,
        userPhone1: formData.userPhone1 || undefined,
        invitationToken: invitationToken || undefined,
      };
      
      const response = await authApi.register(registrationData);
      
      // Hide loading
      feedback.hideLoading();
      
      // Check if it was a reactivation or new registration
      const isReactivation = response.success && response.message === 'Account reactivated successfully';
      
      // Show appropriate success message
      await feedback.fire({
        icon: 'success',
        importance: 'milestone',
        title: isReactivation ? t('auth.register.welcomeBack') : t('auth.register.success'),
        text: isReactivation 
          ? t('auth.register.reactivated')
          : t('auth.register.created'),
        timer: 5000,
        timerProgressBar: true,
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
        navigate('/my-work');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      
      // Hide loading
      feedback.hideLoading();
      
      // Show detailed error message
      const errorMessage = error.message || t('auth.register.failedText');
      const isDuplicateEmail = errorMessage.includes('Duplicate entry') || errorMessage.includes('already in use') || errorMessage.includes('Email already in use');
      
      await feedback.fire({
        icon: 'error',
        title: isDuplicateEmail ? t('auth.register.emailExists') : t('auth.register.failed'),
        text: isDuplicateEmail 
          ? t('auth.register.duplicateText')
          : errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Shake animation style for error fields
  const shakeAnimation = {
    '@keyframes shake': {
      '0%, 100%': { transform: 'translateX(0)' },
      '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-4px)' },
      '20%, 40%, 60%, 80%': { transform: 'translateX(4px)' },
    },
  };

  const getTextFieldSx = (fieldName: keyof FormErrors) => ({
    ...(errors[fieldName] && touched[fieldName] ? {
      animation: 'shake 0.5s cubic-bezier(.36,.07,.19,.97) both',
      '& .MuiOutlinedInput-root': {
        '& fieldset': {
          borderColor: 'error.main',
          borderWidth: '2px',
        },
        '&:hover fieldset': {
          borderColor: 'error.main',
        },
        '&.Mui-focused fieldset': {
          borderColor: 'error.main',
          borderWidth: '2px',
          boxShadow: 'none',
        },
      },
    } : {}),
  });

  return (
    <Container component="main" maxWidth="sm">
      {/* Add shake animation styles */}
      <style>
        {`
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
            20%, 40%, 60%, 80% { transform: translateX(4px); }
          }
        `}
      </style>
      
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
              borderRadius: 3,
              backgroundColor: 'primary.main',
              border: '1px solid',
              borderColor: 'primary.dark',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 1.5,
              boxShadow: 'none',
            }}
          >
            <LockOutlined sx={{ color: 'white' }} />
          </Box>
          <Typography component="h1" variant="h5">
            {t('auth.register.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('auth.register.subtitle')}
          </Typography>
        </Box>

        <Paper variant="outlined" sx={{
          p: 4, 
          mt: 3, 
          width: '100%',
          backgroundColor: 'background.paper',
          borderColor: 'divider',
          borderRadius: 3,
          boxShadow: 'none',
        }}>
          
          {!invitationToken && !publicRegistrationAllowed ? <Box>
            <Alert severity="info" sx={{ mb: 2 }}>{t('auth.register.inviteOnly')}</Alert>
            <Typography color="text.secondary" mb={3}>{t('auth.register.inviteOnlyHelp')}</Typography>
            <Button component={RouterLink} to="/login" fullWidth variant="contained">{t('auth.login.signIn')}</Button>
          </Box> : <Box component="form" onSubmit={handleSubmit} noValidate>
            {invitationState === 'loading' && <Alert severity="info" sx={{ mb: 2 }}>{t('feature.inviteValidating')}</Alert>}
            {invitationState === 'invalid' && <Alert severity="error" sx={{ mb: 2 }}>{t('feature.inviteInvalid')}</Alert>}
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="userName"
                label={t('common.firstName')}
                name="userName"
                autoComplete="given-name"
                autoFocus
                value={formData.userName}
                onChange={handleChange}
                onBlur={handleBlur}
                inputRef={userNameRef}
                error={Boolean(errors.userName && touched.userName)}
                helperText={errors.userName && touched.userName ? errors.userName : undefined}
                disabled={isLoading}
                sx={getTextFieldSx('userName')}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                id="userLastName"
                label={t('common.lastName')}
                name="userLastName"
                autoComplete="family-name"
                value={formData.userLastName}
                onChange={handleChange}
                onBlur={handleBlur}
                inputRef={userLastNameRef}
                error={Boolean(errors.userLastName && touched.userLastName)}
                helperText={errors.userLastName && touched.userLastName ? errors.userLastName : undefined}
                disabled={isLoading}
                sx={getTextFieldSx('userLastName')}
              />
            </Box>
            
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label={t('common.emailAddress')}
              name="email"
              autoComplete="email"
              value={formData.email}
              onChange={handleChange}
              onBlur={handleBlur}
              inputRef={emailRef}
                error={Boolean(errors.email && touched.email)}
                helperText={errors.email && touched.email ? errors.email : undefined}
              disabled={isLoading}
              sx={getTextFieldSx('email')}
            />
            
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label={t('common.password')}
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="new-password"
              value={formData.password}
              onChange={handleChange}
              onBlur={handleBlur}
              inputRef={passwordRef}
                error={Boolean(errors.password && touched.password)}
                helperText={errors.password && touched.password ? errors.password : t('auth.register.passwordHint')}
              disabled={isLoading}
              sx={getTextFieldSx('password')}
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
              label={t('auth.register.confirmPassword')}
              type={showConfirmPassword ? 'text' : 'password'}
              id="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              onBlur={handleBlur}
              inputRef={confirmPasswordRef}
                error={Boolean(errors.confirmPassword && touched.confirmPassword)}
                helperText={errors.confirmPassword && touched.confirmPassword ? errors.confirmPassword : undefined}
              disabled={isLoading}
              sx={getTextFieldSx('confirmPassword')}
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
              label={t('common.phoneOptional')}
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
              {isLoading ? t('auth.register.creating') : t('auth.register.create')}
            </Button>
            
            <Divider sx={{ my: 2 }}>
              <Typography variant="body2" color="text.secondary">
                {t('auth.register.or')}
              </Typography>
            </Divider>
            
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                {t('auth.register.hasAccount')}{' '}
                <Link component={RouterLink} to="/login" variant="body2">
                  {t('auth.login.signIn')}
                </Link>
              </Typography>
            </Box>
          </Box>}
        </Paper>
      </Box>
    </Container>
  );
};

export default Register;
