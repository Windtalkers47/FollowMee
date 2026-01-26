import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter as Router } from 'react-router-dom';

import './index.css';
import App from './App';
import { store } from './store/store';
import { CustomThemeProvider } from './contexts/ThemeContext';
import { NotificationProvider } from './contexts/Notification';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

createRoot(rootElement).render(
  <StrictMode>
    <Provider store={store}>
      <CustomThemeProvider>
        <NotificationProvider>
          <Router>
            <App />
          </Router>
        </NotificationProvider>
      </CustomThemeProvider>
    </Provider>
  </StrictMode>
);
