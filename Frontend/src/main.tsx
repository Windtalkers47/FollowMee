import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter as Router } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import './index.css';
import App from './App';
import { store } from './store/store';
import { CustomThemeProvider } from './contexts/ThemeContext';
import { LiquidGlassProvider } from './contexts/LiquidGlassContext';
import { NotificationProvider } from './contexts/Notification';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <LiquidGlassProvider>
          <CustomThemeProvider>
            <NotificationProvider>
              <Router>
                <App />
              </Router>
            </NotificationProvider>
          </CustomThemeProvider>
        </LiquidGlassProvider>
      </Provider>
    </QueryClientProvider>
  </StrictMode>
);
