import AppDataSource from '../config/database';
import {
  BrandTheme,
  ColorModePreference,
  UserLocale,
  UserPreference,
} from '../entities/UserPreference';

export interface UpdateUserPreferenceInput {
  locale?: UserLocale;
  brandTheme?: BrandTheme;
  colorMode?: ColorModePreference;
}

const LOCALES: UserLocale[] = ['en', 'th'];
const BRAND_THEMES: BrandTheme[] = ['purple', 'green'];
const COLOR_MODES: ColorModePreference[] = ['light', 'dark', 'system'];

export class UserPreferenceService {
  private repository = AppDataSource.getRepository(UserPreference);

  async getOrCreate(userId: number, requestedLocale?: string): Promise<UserPreference> {
    const existing = await this.repository.findOne({ where: { userId } });
    if (existing) return existing;

    const locale: UserLocale = requestedLocale === 'th' ? 'th' : 'en';
    return this.repository.save(this.repository.create({
      userId,
      locale,
      brandTheme: 'purple',
      colorMode: 'system',
    }));
  }

  async update(
    userId: number,
    input: UpdateUserPreferenceInput,
    requestedLocale?: string
  ): Promise<UserPreference> {
    const invalidKeys = Object.keys(input).filter(
      key => !['locale', 'brandTheme', 'colorMode'].includes(key)
    );
    if (invalidKeys.length > 0) {
      throw new Error(`Unsupported preference: ${invalidKeys.join(', ')}`);
    }
    if (input.locale && !LOCALES.includes(input.locale)) {
      throw new Error('Invalid locale');
    }
    if (input.brandTheme && !BRAND_THEMES.includes(input.brandTheme)) {
      throw new Error('Invalid brand theme');
    }
    if (input.colorMode && !COLOR_MODES.includes(input.colorMode)) {
      throw new Error('Invalid color mode');
    }

    const preference = await this.getOrCreate(userId, requestedLocale);
    Object.assign(preference, input);
    return this.repository.save(preference);
  }
}
