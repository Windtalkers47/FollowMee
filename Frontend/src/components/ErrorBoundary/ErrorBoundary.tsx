import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button, Container, Paper } from '@mui/material';
import { Error as ErrorIcon, Refresh as RefreshIcon, Home as HomeIcon } from '@mui/icons-material';
import { translateCurrent } from '../../i18n/messages';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    
    // Log error to console (in development)
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
    
    // You can also log to an error reporting service here
    // e.g., Sentry, LogRocket, etc.
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <Container maxWidth="md">
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '100vh',
              textAlign: 'center',
            }}
          >
            <Paper
              elevation={3}
              sx={{
                p: 4,
                borderRadius: 2,
                bgcolor: 'background.paper',
                backdropFilter: 'blur(10px)',
              }}
            >
              <ErrorIcon
                sx={{
                  fontSize: 80,
                  color: 'error.main',
                  mb: 2,
                }}
              />
              
              <Typography variant="h4" fontWeight="bold" gutterBottom>
                {translateCurrent('error.title')}
              </Typography>
              
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                {translateCurrent('error.message')}
              </Typography>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    mb: 3,
                    textAlign: 'left',
                    bgcolor: 'error.lighter',
                    borderColor: 'error.light',
                  }}
                >
                  <Typography variant="caption" fontWeight="bold" color="error.dark">
                    {translateCurrent('error.details')}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1, fontFamily: 'monospace', fontSize: '0.75rem' }}>
                    {this.state.error.toString()}
                  </Typography>
                  {this.state.errorInfo?.componentStack && (
                    <Typography variant="body2" sx={{ mt: 1, fontFamily: 'monospace', fontSize: '0.75rem' }}>
                      {this.state.errorInfo.componentStack}
                    </Typography>
                  )}
                </Paper>
              )}

              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                <Button
                  variant="contained"
                  startIcon={<RefreshIcon />}
                  onClick={this.handleRetry}
                  sx={{
                    bgcolor: 'primary.main',
                  }}
                >
                  {translateCurrent('error.tryAgain')}
                </Button>
                
                <Button
                  variant="outlined"
                  startIcon={<HomeIcon />}
                  onClick={this.handleGoHome}
                >
                  {translateCurrent('error.goHome')}
                </Button>
              </Box>
            </Paper>
          </Box>
        </Container>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
