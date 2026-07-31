import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { beforeEach, describe, expect, it } from 'vitest';
import { UserPreferencesProvider, useUserPreferences } from '../../contexts/UserPreferencesContext';
import { store } from '../../store/store';

const Probe = () => {
  const { locale, brandTheme, colorMode, t } = useUserPreferences();
  return (
    <div data-testid="preferences">
      {locale}|{brandTheme}|{colorMode}|{t('nav.dashboard')}
    </div>
  );
};

describe('UserPreferencesContext cross-tab synchronization', () => {
  beforeEach(() => localStorage.clear());

  it('applies locale, theme and appearance from a storage event without remounting', async () => {
    render(
      <Provider store={store}>
        <UserPreferencesProvider>
          <Probe />
        </UserPreferencesProvider>
      </Provider>,
    );

    window.dispatchEvent(new StorageEvent('storage', {
      key: 'followmee:user-preferences',
      newValue: JSON.stringify({
        locale: 'th',
        brandTheme: 'green',
        colorMode: 'dark',
      }),
    }));

    await waitFor(() => {
      expect(screen.getByTestId('preferences')).toHaveTextContent('th|green|dark|แดชบอร์ด');
      expect(document.documentElement.lang).toBe('th');
    });
  });
});
