import axios from 'axios';
import { API_BASE_URL } from '../api/config';

export type Locale = 'en' | 'th';
export type BrandTheme = 'purple' | 'green';
export type ColorModePreference = 'light' | 'dark' | 'system';

export interface UserPreferences {
  preferenceId?: number;
  userId?: number;
  locale: Locale;
  brandTheme: BrandTheme;
  colorMode: ColorModePreference;
}

export const userPreferencesApi = {
  async get(locale: Locale): Promise<UserPreferences> {
    const response = await axios.get(`${API_BASE_URL}/user-preferences`, {
      params: { locale },
      withCredentials: true,
      headers: { 'x-user-locale': locale },
    });
    return response.data.data;
  },

  async update(
    updates: Partial<Pick<UserPreferences, 'locale' | 'brandTheme' | 'colorMode'>>
  ): Promise<UserPreferences> {
    const response = await axios.patch(`${API_BASE_URL}/user-preferences`, updates, {
      withCredentials: true,
    });
    return response.data.data;
  },
};
