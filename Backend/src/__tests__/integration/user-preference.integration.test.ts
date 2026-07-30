import dataSource from '../../config/database';
import { User } from '../../entities/User';
import { UserPreference } from '../../entities/UserPreference';
import { UserPreferenceService } from '../../services/user-preference.service';

describe('User preference integration', () => {
  let userId: number;
  let service: UserPreferenceService;

  beforeAll(async () => {
    await dataSource.initialize();
    userId = (await dataSource.getRepository(User).findOneByOrFail({
      userEmail: 'qa-assignee@example.test',
    })).userId;
    service = new UserPreferenceService();
  });

  beforeEach(async () => {
    await dataSource.getRepository(UserPreference).delete({ userId });
  });

  afterAll(async () => {
    if (dataSource.isInitialized) await dataSource.destroy();
  });

  it('creates browser-locale defaults without changing the user record', async () => {
    const preference = await service.getOrCreate(userId, 'th');
    expect(preference).toMatchObject({
      userId,
      locale: 'th',
      brandTheme: 'purple',
      colorMode: 'system',
    });
  });

  it('persists theme, locale and appearance across service instances', async () => {
    await service.update(userId, {
      locale: 'en',
      brandTheme: 'green',
      colorMode: 'dark',
    });
    const restored = await new UserPreferenceService().getOrCreate(userId);
    expect(restored).toMatchObject({
      locale: 'en',
      brandTheme: 'green',
      colorMode: 'dark',
    });
  });

  it('rejects unsupported values', async () => {
    await expect(service.update(userId, {
      brandTheme: 'blue' as 'purple',
    })).rejects.toThrow('Invalid brand theme');
  });
});
