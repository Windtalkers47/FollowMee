import { test, expect, hasTwoQaUsers, loginAs } from './fixtures';

test.describe('visual regression', () => {
  test('login and public profile keep their visual baseline', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('followmee:user-preferences', JSON.stringify({ locale: 'en', brandTheme: 'purple', colorMode: 'light' })));
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    await expect(page).toHaveScreenshot('login-light.png', {
      animations: 'disabled',
      fullPage: true,
    });

    await page.evaluate(() => (window as Window & {
      __FOLLOWMEE_UAT_PREFERENCES__?: { preview: (patch: { colorMode: 'dark' }) => void };
    }).__FOLLOWMEE_UAT_PREFERENCES__?.preview({ colorMode: 'dark' }));
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page).toHaveScreenshot('login-dark.png', {
      animations: 'disabled',
      fullPage: true,
    });

    await page.goto('/p/e2e-profile');
    await expect(page.getByText('FollowMee Studio')).toBeVisible();
    await expect(page).toHaveScreenshot('public-profile.png', {
      animations: 'disabled',
      fullPage: true,
    });
  });

  test('schedule and notifications keep their authenticated visual baseline', async ({ page }) => {
    test.skip(!hasTwoQaUsers, 'Authenticated visual snapshots require the isolated seeded QA database.');
    const apiUrl = process.env.E2E_API_URL || 'http://localhost:5110/api';
    await page.route('**/api/notifications**', async route => {
      if (route.request().method() !== 'GET') return route.continue();
      const path = new URL(route.request().url()).pathname;
      const data = path.endsWith('/unread-count')
        ? { count: 0 }
        : { notifications: [], total: 0, totalCount: 0, unreadCount: 0 };
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data }) });
    });
    await loginAs(page, 'creator');
    await page.request.patch(`${apiUrl}/user-preferences`, {
      data: { locale: 'en', brandTheme: 'purple', colorMode: 'light' },
    });

    await page.goto('/schedule');
    await expect(page.getByRole('heading', { name: /tasks & schedule/i })).toBeVisible();
    await expect(page).toHaveScreenshot('schedule-light.png', {
      animations: 'disabled',
      fullPage: true,
    });

    await page.request.patch(`${apiUrl}/user-preferences`, {
      data: { locale: 'en', brandTheme: 'purple', colorMode: 'dark' },
    });
    await page.evaluate(() => localStorage.setItem('followmee:user-preferences', JSON.stringify({
      locale: 'en',
      brandTheme: 'purple',
      colorMode: 'dark',
    })));
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.getByRole('heading', { name: /tasks & schedule/i })).toBeVisible();
    await expect(page.getByText('E2E seeded task')).toBeVisible();
    await expect(page).toHaveScreenshot('schedule-dark.png', {
      animations: 'disabled',
      fullPage: true,
    });

    await page.goto('/notifications');
    await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible();
    await expect(page).toHaveScreenshot('notifications-dark.png', {
      animations: 'disabled',
      fullPage: true,
    });
  });
});
