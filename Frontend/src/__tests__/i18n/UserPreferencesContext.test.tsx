import { act, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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

    act(() => {
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'followmee:user-preferences',
        newValue: JSON.stringify({
          locale: 'th',
          brandTheme: 'green',
          colorMode: 'dark',
        }),
      }));
    });

    await waitFor(() => {
      expect(screen.getByTestId('preferences')).toHaveTextContent('th|green|dark|แดชบอร์ด');
      expect(document.documentElement.lang).toBe('th');
    });
  });

  it('previews and restores UAT preferences without persisting them', async () => {
    const persistSpy = vi.spyOn(Storage.prototype, 'setItem');
    render(
      <Provider store={store}>
        <UserPreferencesProvider>
          <Probe />
        </UserPreferencesProvider>
      </Provider>,
    );

    const bridge = (window as Window & {
      __FOLLOWMEE_UAT_PREFERENCES__?: {
        preview: (patch: { locale: 'th'; brandTheme: 'green'; colorMode: 'dark' }) => void;
        restore: () => void;
      };
    }).__FOLLOWMEE_UAT_PREFERENCES__;
    expect(bridge).toBeDefined();

    act(() => bridge?.preview({ locale: 'th', brandTheme: 'green', colorMode: 'dark' }));
    await waitFor(() => expect(screen.getByTestId('preferences')).toHaveTextContent('th|green|dark'));

    act(() => bridge?.restore());
    await waitFor(() => expect(screen.getByTestId('preferences')).toHaveTextContent('en|purple|system'));
    expect(persistSpy).not.toHaveBeenCalled();
    persistSpy.mockRestore();
  });
});
