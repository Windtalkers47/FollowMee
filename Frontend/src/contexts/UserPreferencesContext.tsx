import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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

const STORAGE_KEY = 'followmee:user-preferences';

const messages = {
  en: {
    'nav.workspace': 'Workspace',
    'nav.insights': 'Insights',
    'nav.administration': 'Administration',
    'nav.dashboard': 'Dashboard',
    'nav.tasks': 'Tasks & Schedule',
    'nav.customers': 'Customers',
    'nav.profiles': 'Profile Cards',
    'nav.analytics': 'Analytics',
    'nav.activity': 'Team Activity',
    'nav.users': 'User Management',
    'nav.settings': 'Settings',
    'nav.logout': 'Logout',
    'nav.more': 'More',
    'settings.title': 'Settings',
    'settings.language': 'Language',
    'settings.languageHelp': 'Choose the language used across FollowMee, notifications and email.',
    'settings.theme': 'Brand theme',
    'settings.themeHelp': 'Choose the primary accent used throughout the workspace.',
    'settings.appearance': 'Appearance',
    'settings.appearanceHelp': 'Follow your device or choose a fixed light or dark appearance.',
    'settings.purple': 'Purple',
    'settings.green': 'Green',
    'settings.system': 'System',
    'settings.light': 'Light',
    'settings.dark': 'Dark',
    'settings.english': 'English',
    'settings.thai': 'ไทย',
    'settings.saved': 'Preferences saved',
    'settings.saveError': 'Could not save preferences. Your local choice is still active.',
    'suggestion.overdue.title': 'Overdue tasks',
    'suggestion.overdue.message': 'You have {count} overdue tasks that need attention.',
    'suggestion.today.title': 'Tasks due today',
    'suggestion.today.message': 'You have {count} tasks due today.',
    'suggestion.tomorrow.title': 'Tasks due tomorrow',
    'suggestion.tomorrow.message': 'You have {count} tasks due tomorrow.',
    'suggestion.soon.title': 'Tasks due in 3 days',
    'suggestion.soon.message': 'You have {count} tasks due within 3 days.',
    'suggestion.action.review': 'Review',
    'suggestion.action.startAll': 'Start all',
    'suggestion.action.reschedule': 'Reschedule',
    'suggestion.action.markDone': 'Mark done',
    'notification.actions': 'Notification actions',
    'notification.unread': 'Unread',
    'notification.markRead': 'Mark as read',
    'notification.markUnread': 'Mark as unread',
    'notification.archive': 'Archive',
    'notification.restore': 'Restore',
    'notification.delete': 'Delete permanently',
    'feedback.confirm': 'Confirm',
    'feedback.cancel': 'Cancel',
    'feedback.confirmTitle': 'Confirm action',
    'feedback.failed': 'Action failed',
    'feedback.tryAgain': 'Please try again.',
    'feedback.working': 'Working',
  },
  th: {
    'nav.workspace': 'พื้นที่ทำงาน',
    'nav.insights': 'ข้อมูลเชิงลึก',
    'nav.administration': 'การดูแลระบบ',
    'nav.dashboard': 'แดชบอร์ด',
    'nav.tasks': 'งานและกำหนดการ',
    'nav.customers': 'ลูกค้า',
    'nav.profiles': 'โปรไฟล์การ์ด',
    'nav.analytics': 'การวิเคราะห์',
    'nav.activity': 'กิจกรรมทีม',
    'nav.users': 'จัดการผู้ใช้',
    'nav.settings': 'การตั้งค่า',
    'nav.logout': 'ออกจากระบบ',
    'nav.more': 'เพิ่มเติม',
    'settings.title': 'การตั้งค่า',
    'settings.language': 'ภาษา',
    'settings.languageHelp': 'เลือกภาษาสำหรับ FollowMee การแจ้งเตือน และอีเมล',
    'settings.theme': 'ธีมสีหลัก',
    'settings.themeHelp': 'เลือกสีหลักที่ใช้ในพื้นที่ทำงาน',
    'settings.appearance': 'ลักษณะการแสดงผล',
    'settings.appearanceHelp': 'ใช้ตามอุปกรณ์ หรือเลือกโหมดสว่างหรือมืด',
    'settings.purple': 'ม่วง',
    'settings.green': 'เขียว',
    'settings.system': 'ตามระบบ',
    'settings.light': 'สว่าง',
    'settings.dark': 'มืด',
    'settings.english': 'English',
    'settings.thai': 'ไทย',
    'settings.saved': 'บันทึกการตั้งค่าแล้ว',
    'settings.saveError': 'บันทึกการตั้งค่าไม่ได้ แต่ตัวเลือกนี้ยังใช้บนอุปกรณ์นี้',
    'suggestion.overdue.title': 'งานที่เกินกำหนด',
    'suggestion.overdue.message': 'คุณมีงานเกินกำหนด {count} งานที่ควรตรวจสอบ',
    'suggestion.today.title': 'งานครบกำหนดวันนี้',
    'suggestion.today.message': 'คุณมีงานที่ครบกำหนดวันนี้ {count} งาน',
    'suggestion.tomorrow.title': 'งานครบกำหนดพรุ่งนี้',
    'suggestion.tomorrow.message': 'คุณมีงานที่ครบกำหนดพรุ่งนี้ {count} งาน',
    'suggestion.soon.title': 'งานครบกำหนดใน 3 วัน',
    'suggestion.soon.message': 'คุณมีงานที่ครบกำหนดภายใน 3 วัน {count} งาน',
    'suggestion.action.review': 'ตรวจสอบ',
    'suggestion.action.startAll': 'เริ่มทั้งหมด',
    'suggestion.action.reschedule': 'เลื่อนกำหนด',
    'suggestion.action.markDone': 'ทำเครื่องหมายว่าเสร็จ',
    'notification.actions': 'การทำงานของการแจ้งเตือน',
    'notification.unread': 'ยังไม่ได้อ่าน',
    'notification.markRead': 'ทำเครื่องหมายว่าอ่านแล้ว',
    'notification.markUnread': 'ทำเครื่องหมายว่ายังไม่ได้อ่าน',
    'notification.archive': 'เก็บถาวร',
    'notification.restore': 'นำกลับ',
    'notification.delete': 'ลบถาวร',
    'feedback.confirm': 'ยืนยัน',
    'feedback.cancel': 'ยกเลิก',
    'feedback.confirmTitle': 'ยืนยันการดำเนินการ',
    'feedback.failed': 'ดำเนินการไม่สำเร็จ',
    'feedback.tryAgain': 'กรุณาลองอีกครั้ง',
    'feedback.working': 'กำลังดำเนินการ',
  },
} as const;

type MessageKey = keyof typeof messages.en;
type StoredPreferences = {
  locale: Locale;
  brandTheme: BrandTheme;
  colorMode: ColorModePreference;
};

const browserLocale = (): Locale =>
  typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('th')
    ? 'th'
    : 'en';

const loadLocal = (): StoredPreferences => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return {
      locale: saved.locale === 'th' ? 'th' : saved.locale === 'en' ? 'en' : browserLocale(),
      brandTheme: saved.brandTheme === 'green' ? 'green' : 'purple',
      colorMode: ['light', 'dark', 'system'].includes(saved.colorMode)
        ? saved.colorMode
        : 'system',
    };
  } catch {
    return { locale: browserLocale(), brandTheme: 'purple', colorMode: 'system' };
  }
};

interface UserPreferencesContextValue extends StoredPreferences {
  resolvedMode: 'light' | 'dark';
  loading: boolean;
  setLocale: (locale: Locale) => Promise<void>;
  setBrandTheme: (theme: BrandTheme) => Promise<void>;
  setColorMode: (mode: ColorModePreference) => Promise<void>;
  t: (key: MessageKey, values?: Record<string, string | number>) => string;
}

const UserPreferencesContext = createContext<UserPreferencesContextValue | null>(null);

export const UserPreferencesProvider = ({ children }: { children: ReactNode }) => {
  const authenticated = useAppSelector(state => state.auth.isAuthenticated);
  const userId = useAppSelector(state => state.auth.user?.userId);
  const [preferences, setPreferences] = useState<StoredPreferences>(loadLocal);
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
    setLoading(true);
    userPreferencesApi.get(preferences.locale)
      .then(server => {
        if (active) {
          persistLocal({
            locale: server.locale,
            brandTheme: server.brandTheme,
            colorMode: server.colorMode,
          });
        }
      })
      .catch(() => undefined)
      .finally(() => active && setLoading(false));
    return () => { active = false; };
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
    t: (key, values) => {
      let output: string = messages[preferences.locale][key] || messages.en[key] || key;
      Object.entries(values || {}).forEach(([name, replacement]) => {
        output = output.replaceAll(`{${name}}`, String(replacement));
      });
      return output;
    },
  }), [loading, preferences, systemMode, update]);

  useEffect(() => {
    document.documentElement.lang = preferences.locale;
    axios.defaults.headers.common['x-user-locale'] = preferences.locale;
  }, [preferences.locale]);

  return (
    <UserPreferencesContext.Provider value={value}>
      {children}
    </UserPreferencesContext.Provider>
  );
};

export const useUserPreferences = () => {
  const value = useContext(UserPreferencesContext);
  if (!value) throw new Error('useUserPreferences must be used inside UserPreferencesProvider');
  return value;
};
