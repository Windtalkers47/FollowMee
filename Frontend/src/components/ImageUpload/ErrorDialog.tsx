import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  AlertTitle,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  CheckCircle as SuccessIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';

export interface ErrorDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type: 'error' | 'warning' | 'info' | 'success';
  suggestions?: string[];
  fileName?: string;
}

const ErrorDialog: React.FC<ErrorDialogProps> = ({
  open,
  onClose,
  title,
  message,
  type,
  suggestions = [],
  fileName
}) => {
  const { t } = useUserPreferences();
  const getIcon = () => {
    switch (type) {
      case 'error':
        return <ErrorIcon sx={{ fontSize: 48, color: 'error.main' }} />;
      case 'warning':
        return <WarningIcon sx={{ fontSize: 48, color: 'warning.main' }} />;
      case 'info':
        return <InfoIcon sx={{ fontSize: 48, color: 'info.main' }} />;
      case 'success':
        return <SuccessIcon sx={{ fontSize: 48, color: 'success.main' }} />;
      default:
        return <ErrorIcon sx={{ fontSize: 48, color: 'error.main' }} />;
    }
  };

  const getAlertColor = () => {
    switch (type) {
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
        return 'info';
      case 'success':
        return 'success';
      default:
        return 'error';
    }
  };

  const getCommonSuggestions = (errorType: string): string[] => {
    switch (errorType) {
      case 'file-too-large':
        return [
          'Resize the image to be smaller than 5MB',
          'Use an online image compressor like TinyPNG',
          'Try uploading a different image',
          'Convert to JPEG format for smaller file size'
        ];
      case 'unsupported-format':
        return [
          'Convert the file to JPG, PNG, GIF, or WebP format',
          'Use an online image converter',
          'Take a screenshot and save as supported format',
          'Use a different image file'
        ];
      case 'server-error':
        return [
          'Check your internet connection',
          'Wait a few minutes and try again',
          'Try refreshing the page',
          'Contact support if the problem persists'
        ];
      case 'rate-limit':
        return [
          'Wait a few minutes before trying again',
          'Upload fewer images at once',
          'Try uploading one image at a time'
        ];
      default:
        return [
          'Check your file and try again',
          'Make sure the file is a valid image',
          'Try a different file'
        ];
    }
  };

  const errorType = message.toLowerCase().includes('too large') ? 'file-too-large' :
                   message.toLowerCase().includes('format') ? 'unsupported-format' :
                   message.toLowerCase().includes('server') ? 'server-error' :
                   message.toLowerCase().includes('attempts') ? 'rate-limit' : 'general';

  const allSuggestions = suggestions.length > 0 ? suggestions : getCommonSuggestions(errorType);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {getIcon()}
        <Typography variant="h6" component="div">
          {title}
        </Typography>
        <Button onClick={onClose} sx={{ ml: 'auto' }}>
          <CloseIcon />
        </Button>
      </DialogTitle>

      <DialogContent>
        <Alert severity={getAlertColor()} sx={{ mb: 3 }}>
          <AlertTitle>{fileName ? t('image.file', { name: fileName }) : t('image.uploadError')}</AlertTitle>
          {message}
        </Alert>

        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            {t('image.fixTitle')}
          </Typography>
          <List>
            {allSuggestions.map((suggestion, index) => (
              <ListItem key={index} sx={{ py: 0.5 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  {type === 'error' && <ErrorIcon color="error" fontSize="small" />}
                  {type === 'warning' && <WarningIcon color="warning" fontSize="small" />}
                  {type === 'info' && <InfoIcon color="info" fontSize="small" />}
                </ListItemIcon>
                <ListItemText 
                  primary={suggestion}
                  primaryTypographyProps={{ variant: 'body2' }}
                />
              </ListItem>
            ))}
          </List>
        </Box>

        {type === 'error' && (
          <Alert severity="info">
            <Typography variant="body2">
              <strong>{t('image.tip')}</strong> {t('image.tipText')}
            </Typography>
          </Alert>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="contained" autoFocus>
          {t('image.understand')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ErrorDialog;
