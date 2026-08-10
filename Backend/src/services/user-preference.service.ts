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
  selectedAuraKey?: string | null;
  profileCardMotion?: 'full' | 'subtle' | 'off';
  shareDefaults?: Record<string, boolean | string> | null;
  privacyDefaults?: Record<string, boolean | string> | null;
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
    await this.repository.query(
      `INSERT IGNORE INTO user_preferences
        (userId, locale, brandTheme, colorMode)
       VALUES (?, ?, 'purple', 'system')`,
      [userId, locale],
    );

    return this.repository.findOneOrFail({ where: { userId } });
  }

  async update(
    userId: number,
    input: UpdateUserPreferenceInput,
    requestedLocale?: string
  ): Promise<UserPreference> {
    const invalidKeys = Object.keys(input).filter(
      key => !['locale', 'brandTheme', 'colorMode', 'selectedAuraKey', 'profileCardMotion', 'shareDefaults', 'privacyDefaults'].includes(key)
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
    if (input.profileCardMotion && !['full', 'subtle', 'off'].includes(input.profileCardMotion)) {
      throw new Error('Invalid profile card motion');
    }
    if (input.selectedAuraKey) {
      const unlocked = await AppDataSource.query(`
        SELECT 1 FROM user_badges ub INNER JOIN reward_badges rb ON rb.badgeId = ub.badgeId
        WHERE ub.userId = ? AND rb.auraKey = ? LIMIT 1
      `, [userId, input.selectedAuraKey]);
      if (!unlocked.length) throw new Error('Invalid or locked Aura');
    }

    const preference = await this.getOrCreate(userId, requestedLocale);
    Object.assign(preference, input);
    return this.repository.save(preference);
  }
}
