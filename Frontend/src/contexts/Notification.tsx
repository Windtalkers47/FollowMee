import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { Snackbar, Alert, AlertColor } from '@mui/material';
import { keyframes } from '@emotion/react';

const slideIn = keyframes`
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
`;

type Notification = {
  id: string;
  message: string;
  type: AlertColor;
  duration?: number;
};

type NotificationContextType = {
  notify: (message: string, type?: AlertColor, duration?: number) => void;
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const notify = useCallback(
    (message: string, type: AlertColor = 'success', duration: number = 3000) => {
      const id = Math.random().toString(36).substr(2, 9);
      setNotifications((prev) => [...prev, { id, message, type, duration }]);
      
      if (duration > 0) {
        setTimeout(() => {
          removeNotification(id);
        }, duration);
      }
    },
    [removeNotification]
  );

  const contextValue = useMemo(() => ({
    notify,
  }), [notify]);

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      {notifications.map((notification) => (
        <Snackbar
          key={notification.id}
          open
          autoHideDuration={notification.duration}
          onClose={() => removeNotification(notification.id)}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          sx={{ 
            '& .MuiPaper-root': {
              animation: `${slideIn} 0.3s ease-out`,
              '&.MuiAlert-filledSuccess': {
                background: 'linear-gradient(45deg, #4CAF50 30%, #81C784 90%)',
              },
              '&.MuiAlert-filledError': {
                background: 'linear-gradient(45deg, #F44336 30%, #E57373 90%)',
              },
              '&.MuiAlert-filledInfo': {
                background: 'linear-gradient(45deg, #2196F3 30%, #64B5F6 90%)',
              },
              '&.MuiAlert-filledWarning': {
                background: 'linear-gradient(45deg, #FF9800 30%, #FFB74D 90%)',
              },
            }
          }}
        >
          <Alert
            onClose={() => removeNotification(notification.id)}
            severity={notification.type}
            variant="filled"
            elevation={6}
            sx={{
              width: '100%',
              minWidth: 300,
              '& .MuiAlert-message': {
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              },
            }}
          >
            {notification.message}
          </Alert>
        </Snackbar>
      ))}
    </NotificationContext.Provider>
  );
};

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};