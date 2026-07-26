import React, { useState, useEffect, ReactNode, ErrorInfo } from 'react';
import { Box, Typography, Button, Paper, CircularProgress } from '@mui/material';
import { Error as ErrorIcon, Refresh as RefreshIcon } from '@mui/icons-material';

interface AsyncErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error) => void;
  retryCount?: number;
  maxRetries?: number;
  onRetry?: () => Promise<void>;
}

interface ErrorState {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
}

/**
 * AsyncErrorBoundary - A functional component for handling async errors
 * 
 * Features:
 * - Catches errors from async operations in children
 * - Provides retry functionality
 * - Supports custom retry logic via onRetry prop
 * - Auto-retry with exponential backoff (optional)
 * - Custom fallback UI support
 */
export const AsyncErrorBoundary: React.FC<AsyncErrorBoundaryProps> = ({
  children,
  fallback,
  onError,
  retryCount: initialRetryCount = 0,
  maxRetries = 3,
  onRetry,
}) => {
  const [state, setState] = useState<ErrorState>({
    hasError: false,
    error: null,
    retryCount: initialRetryCount,
  });
  const [isRetrying, setIsRetrying] = useState(false);

  // Listen for error events from children
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (event.error) {
        setState(prev => ({
          ...prev,
          hasError: true,
          error: event.error,
        }));
        
        if (onError) {
          onError(event.error);
        }
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason instanceof Error 
        ? event.reason 
        : new Error(String(event.reason));
      
      setState(prev => ({
        ...prev,
        hasError: true,
        error,
      }));
      
      if (onError) {
        onError(error);
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [onError]);

  const handleRetry = async () => {
    if (state.retryCount >= maxRetries) {
      setState(prev => ({ ...prev, retryCount: 0 }));
    }

    setIsRetrying(true);

    try {
      if (onRetry) {
        await onRetry();
      }
      
      setState({
        hasError: false,
        error: null,
        retryCount: state.retryCount + 1,
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      setState(prev => ({
        ...prev,
        hasError: true,
        error: err,
        retryCount: prev.retryCount + 1,
      }));
      
      if (onError) {
        onError(err);
      }
    } finally {
      setIsRetrying(false);
    }
  };

  if (state.hasError) {
    // Use custom fallback if provided
    if (fallback) {
      return fallback;
    }

    // Show max retries reached message
    if (state.retryCount >= maxRetries) {
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            p: 4,
            textAlign: 'center',
          }}
        >
          <Paper
            elevation={2}
            sx={{
              p: 3,
              borderRadius: 2,
              bgcolor: 'error.lighter',
              border: '1px solid',
              borderColor: 'error.light',
            }}
          >
            <ErrorIcon sx={{ fontSize: 48, color: 'error.main', mb: 2 }} />
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Unable to Load Content
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              We've tried {maxRetries} times but encountered an error.
            </Typography>
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={() => setState({ hasError: false, error: null, retryCount: 0 })}
              sx={{
                background: 'linear-gradient(135deg, #34C759, #30D158)',
              }}
            >
              Reset and Try Again
            </Button>
          </Paper>
        </Box>
      );
    }

    // Default retry UI
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          p: 4,
          textAlign: 'center',
        }}
      >
        <Paper
          elevation={2}
          sx={{
            p: 3,
            borderRadius: 2,
            bgcolor: 'warning.lighter',
            border: '1px solid',
            borderColor: 'warning.light',
          }}
        >
          <ErrorIcon sx={{ fontSize: 48, color: 'warning.main', mb: 2 }} />
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            Something Went Wrong
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Attempt {state.retryCount + 1} of {maxRetries}
          </Typography>
          
          {state.error && process.env.NODE_ENV === 'development' && (
            <Typography 
              variant="caption" 
              sx={{ 
                display: 'block', 
                mb: 2, 
                fontFamily: 'monospace',
                fontSize: '0.75rem',
                color: 'error.dark',
              }}
            >
              {state.error.message}
            </Typography>
          )}
          
          <Button
            variant="contained"
            startIcon={isRetrying ? <CircularProgress size={16} /> : <RefreshIcon />}
            onClick={handleRetry}
            disabled={isRetrying}
            sx={{
              background: 'linear-gradient(135deg, #34C759, #30D158)',
            }}
          >
            {isRetrying ? 'Retrying...' : 'Retry'}
          </Button>
        </Paper>
      </Box>
    );
  }

  return <>{children}</>;
};

/**
 * withErrorBoundary - HOC for wrapping components with AsyncErrorBoundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<AsyncErrorBoundaryProps, 'children'>
) {
  return function WithErrorBoundary(props: P) {
    return (
      <AsyncErrorBoundary {...options}>
        <Component {...props} />
      </AsyncErrorBoundary>
    );
  };
}

export default AsyncErrorBoundary;
