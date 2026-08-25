import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { useAppSelector } from '../store/store';
import {
  BrandTheme,
  ColorModePreference,
  Locale,
  userPreferencesApi,
} from '../services/userPreferences.api';
import axios from 'axios';
import { messages } from '../i18n/messages';
import type { MessageKey } from '../i18n/messages';

const STORAGE_KEY = 'followmee:user-preferences';
type StoredPreferences = {
  locale: Locale;
  brandTheme: BrandTheme;
  colorMode: ColorModePreference;
  selectedAuraKey: string | null;
  profileCardMotion: 'full' | 'subtle' | 'off';
  shareDefaults: Record<string, boolean | string>;
  privacyDefaults: Record<string, boolean | string>;
};

type UatPreferencesBridge = {
  preview: (patch: Partial<StoredPreferences>) => void;
  restore: () => void;
};

type UatWindow = Window & {
  __FOLLOWMEE_UAT_PREFERENCES__?: UatPreferencesBridge;
};

const UAT_PREFERENCE_VARIANTS: Array<Pick<StoredPreferences, 'locale' | 'brandTheme' | 'colorMode'>> = [
  { locale: 'en', brandTheme: 'purple', colorMode: 'light' },
  { locale: 'en', brandTheme: 'purple', colorMode: 'dark' },
  { locale: 'en', brandTheme: 'green', colorMode: 'light' },
  { locale: 'en', brandTheme: 'green', colorMode: 'dark' },
  { locale: 'th', brandTheme: 'purple', colorMode: 'light' },
  { locale: 'th', brandTheme: 'purple', colorMode: 'dark' },
  { locale: 'th', brandTheme: 'green', colorMode: 'light' },
  { locale: 'th', brandTheme: 'green', colorMode: 'dark' },
];

const browserLocale = (): Locale =>
  typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('th')
    ? 'th'
    : 'en';

const normalizeStored = (raw: string | null): StoredPreferences => {
  try {
    const saved = JSON.parse(raw || '{}');
    return {
      locale: saved.locale === 'th' ? 'th' : saved.locale === 'en' ? 'en' : browserLocale(),
      brandTheme: saved.brandTheme === 'green' ? 'green' : 'purple',
      colorMode: ['light', 'dark', 'system'].includes(saved.colorMode)
        ? saved.colorMode
        : 'system',
      selectedAuraKey: typeof saved.selectedAuraKey === 'string' ? saved.selectedAuraKey : null,
      profileCardMotion: ['full', 'subtle', 'off'].includes(saved.profileCardMotion) ? saved.profileCardMotion : 'subtle',
      shareDefaults: saved.shareDefaults && typeof saved.shareDefaults === 'object' ? saved.shareDefaults : { displayName: true, badge: true, score: true, season: true, format: 'square' },
      privacyDefaults: saved.privacyDefaults && typeof saved.privacyDefaults === 'object' ? saved.privacyDefaults : { visibility: 'private', showContact: false },
    };
  } catch {
    return { locale: browserLocale(), brandTheme: 'purple', colorMode: 'system', selectedAuraKey: null, profileCardMotion: 'subtle', shareDefaults: { displayName: true, badge: true, score: true, season: true, format: 'square' }, privacyDefaults: { visibility: 'private', showContact: false } };
  }
};

const loadLocal = (): StoredPreferences =>
  normalizeStored(localStorage.getItem(STORAGE_KEY));

interface UserPreferencesContextValue extends StoredPreferences {
  resolvedMode: 'light' | 'dark';
  loading: boolean;
  setLocale: (locale: Locale) => Promise<void>;
  setBrandTheme: (theme: BrandTheme) => Promise<void>;
  setColorMode: (mode: ColorModePreference) => Promise<void>;
  setProfileCardMotion: (mode: 'full' | 'subtle' | 'off') => Promise<void>;
  setSelectedAuraKey: (key: string | null) => Promise<void>;
  setShareDefaults: (value: Record<string, boolean | string>) => Promise<void>;
  setPrivacyDefaults: (value: Record<string, boolean | string>) => Promise<void>;
  t: (key: MessageKey, values?: Record<string, string | number>) => string;
}

const UserPreferencesContext = createContext<UserPreferencesContextValue | null>(null);

export const UserPreferencesProvider = ({ children }: { children: ReactNode }) => {
  const authenticated = useAppSelector(state => state.auth.isAuthenticated);
  const userId = useAppSelector(state => state.auth.user?.userId);
  const [preferences, setPreferences] = useState<StoredPreferences>(loadLocal);
  const uatBaselineRef = useRef<StoredPreferences | null>(null);
  const [loading, setLoading] = useState(false);
  const [systemMode, setSystemMode] = useState<'light' | 'dark'>(() =>
    window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  );

  const persistLocal = useCallback((next: StoredPreferences) => {
    setPreferences(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => setSystemMode(media.matches ? 'dark' : 'light');
    media.addEventListener?.('change', listener);
    return () => media.removeEventListener?.('change', listener);
  }, []);

  useEffect(() => {
    if (!authenticated || !userId) return;
    let active = true;
    // Authentication is an external state transition; loading mirrors that request lifecycle.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    userPreferencesApi.get(preferences.locale)
      .then(server => {
        if (active) {
          persistLocal({
            locale: server.locale,
            brandTheme: server.brandTheme,
            colorMode: server.colorMode,
            selectedAuraKey: server.selectedAuraKey || null,
            profileCardMotion: server.profileCardMotion || 'subtle',
            shareDefaults: server.shareDefaults || preferences.shareDefaults,
            privacyDefaults: server.privacyDefaults || preferences.privacyDefaults,
          });
        }
      })
      .catch(() => undefined)
      .finally(() => active && setLoading(false));
    return () => { active = false; };
    // Fetch only when the authenticated identity changes. Preference values are response fallbacks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated, userId]);

  const update = useCallback(async (patch: Partial<StoredPreferences>) => {
    const previous = preferences;
    const next = { ...previous, ...patch };
    persistLocal(next);
    if (!authenticated) return;
    try {
      const saved = await userPreferencesApi.update(patch);
      persistLocal({
        locale: saved.locale,
        brandTheme: saved.brandTheme,
        colorMode: saved.colorMode,
        selectedAuraKey: saved.selectedAuraKey || null,
        profileCardMotion: saved.profileCardMotion || 'subtle',
        shareDefaults: saved.shareDefaults || next.shareDefaults,
        privacyDefaults: saved.privacyDefaults || next.privacyDefaults,
      });
    } catch (error) {
      persistLocal(previous);
      throw error;
    }
  }, [authenticated, persistLocal, preferences]);

  const value = useMemo<UserPreferencesContextValue>(() => ({
    ...preferences,
    resolvedMode: preferences.colorMode === 'system' ? systemMode : preferences.colorMode,
    loading,
    setLocale: locale => update({ locale }),
    setBrandTheme: brandTheme => update({ brandTheme }),
    setColorMode: colorMode => update({ colorMode }),
    setProfileCardMotion: profileCardMotion => update({ profileCardMotion }),
    setSelectedAuraKey: selectedAuraKey => update({ selectedAuraKey }),
    setShareDefaults: shareDefaults => update({ shareDefaults }),
    setPrivacyDefaults: privacyDefaults => update({ privacyDefaults }),
    t: (key, values) => {
      let output: string = messages[preferences.locale][key] || messages.en[key] || key;
      Object.entries(values || {}).forEach(([name, replacement]) => {
        output = output.replaceAll(`{${name}}`, String(replacement));
      });
      return output;
    },
  }), [loading, preferences, systemMode, update]);

  const previewUatPreferences = useCallback((patch: Partial<StoredPreferences>) => {
    uatBaselineRef.current ??= preferences;
    setPreferences(current => ({ ...current, ...patch }));
  }, [preferences]);

  const restoreUatPreferences = useCallback(() => {
    const baseline = uatBaselineRef.current;
    if (baseline) setPreferences(baseline);
    uatBaselineRef.current = null;
  }, []);

  useEffect(() => {
    document.documentElement.lang = preferences.locale;
    axios.defaults.headers.common['x-user-locale'] = preferences.locale;
  }, [preferences.locale]);

  useEffect(() => {
    const syncFromAnotherTab = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY || !event.newValue) return;
      setPreferences(normalizeStored(event.newValue));
    };
    window.addEventListener('storage', syncFromAnotherTab);
    return () => window.removeEventListener('storage', syncFromAnotherTab);
  }, []);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const uatWindow = window as UatWindow;
    uatWindow.__FOLLOWMEE_UAT_PREFERENCES__ = {
      preview: previewUatPreferences,
      restore: restoreUatPreferences,
    };
    return () => {
      delete uatWindow.__FOLLOWMEE_UAT_PREFERENCES__;
    };
  }, [previewUatPreferences, restoreUatPreferences]);

  const showUatPreferences = import.meta.env.DEV
    && new URLSearchParams(window.location.search).get('__uatPreferences') === '1';

  return (
    <UserPreferencesContext.Provider value={value}>
      {children}
      {showUatPreferences && (
        <aside
          aria-label="UAT preferences"
          style={{ position: 'fixed', right: 8, bottom: 8, zIndex: 10000, display: 'flex', flexWrap: 'wrap', gap: 4, maxWidth: 360, padding: 6, background: '#111827', border: '1px solid #64748b', borderRadius: 8 }}
        >
          {UAT_PREFERENCE_VARIANTS.map(variant => (
            <button
              key={`${variant.locale}-${variant.brandTheme}-${variant.colorMode}`}
              type="button"
              onClick={() => previewUatPreferences(variant)}
              style={{ padding: '4px 6px', color: '#fff', background: '#334155', border: '1px solid #64748b', borderRadius: 4 }}
            >
              {variant.locale}/{variant.brandTheme}/{variant.colorMode}
            </button>
          ))}
          <button type="button" onClick={restoreUatPreferences} style={{ padding: '4px 6px' }}>restore</button>
        </aside>
      )}
    </UserPreferencesContext.Provider>
  );
};

// Context and hook intentionally live together so consumers share one runtime instance.
// eslint-disable-next-line react-refresh/only-export-components
export const useUserPreferences = () => {
  const value = useContext(UserPreferencesContext);
  if (!value) throw new Error('useUserPreferences must be used inside UserPreferencesProvider');
  return value;
};
