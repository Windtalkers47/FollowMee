import { test, expect, hasTwoQaUsers, loginAs } from './fixtures';

const routes = [
  '/dashboard',
  '/schedule',
  '/customer',
  '/customer-profile',
  '/posts',
  '/notification-analytics',
  '/notifications',
  '/users',
  '/settings',
] as const;

test.describe('authenticated responsive smoke', () => {
  test.skip(!hasTwoQaUsers, 'Responsive authenticated checks require the isolated seeded QA database.');

  test('core pages have no horizontal overflow or console errors in light and dark mode', async ({ page }) => {
    test.setTimeout(120_000);
    const consoleProblems: string[] = [];
    await loginAs(page, 'creator');

    page.on('console', message => {
      if (message.type() === 'error' || message.type() === 'warning') {
        consoleProblems.push(`${message.type()}: ${message.text()}`);
      }
    });
    page.on('pageerror', error => consoleProblems.push(`pageerror: ${error.message}`));

    const apiUrl = process.env.E2E_API_URL || 'http://localhost:5110/api';
    for (const mode of ['light', 'dark'] as const) {
      const response = await page.request.patch(`${apiUrl}/user-preferences`, {
        data: { locale: 'en', brandTheme: 'purple', colorMode: mode },
      });
      expect(response.ok()).toBeTruthy();
      await page.evaluate(selectedMode => {
        localStorage.setItem('followmee:user-preferences', JSON.stringify({
          locale: 'en',
          brandTheme: 'purple',
          colorMode: selectedMode,
        }));
      }, mode);

      for (const route of routes) {
        await page.goto(route);
        await expect(page.locator('main')).toBeVisible();
        await expect(page.locator('html')).toHaveAttribute('data-theme', mode);
        const dimensions = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        }));
        expect(dimensions.scrollWidth, `${mode} ${route} overflow`).toBeLessThanOrEqual(dimensions.clientWidth + 1);
        await expect(page.locator('body')).not.toContainText(/\bundefined\b/);
      }
    }

    const actionableProblems = consoleProblems.filter(message =>
      !/VAPID|DevTools|favicon|ResizeObserver/i.test(message)
    );
    expect(actionableProblems, actionableProblems.join('\n')).toEqual([]);
  });

  test('theme and language preferences persist and remain overflow-safe', async ({ page }) => {
    await loginAs(page, 'assignee');
    const apiUrl = process.env.E2E_API_URL || 'http://localhost:5110/api';

    for (const brandTheme of ['purple', 'green'] as const) {
      for (const locale of ['en', 'th'] as const) {
        const response = await page.request.patch(`${apiUrl}/user-preferences`, {
          data: { locale, brandTheme, colorMode: 'system' },
        });
        expect(response.ok()).toBeTruthy();
        await page.evaluate(value => {
          localStorage.setItem('followmee:user-preferences', JSON.stringify(value));
        }, { locale, brandTheme, colorMode: 'system' });
        await page.reload();
        await expect(page.locator('html')).toHaveAttribute('lang', locale);
        await expect(page.locator('html')).toHaveAttribute('data-brand-theme', brandTheme);
        const dimensions = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        }));
        expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
      }
    }

    await page.request.patch(`${apiUrl}/user-preferences`, {
      data: { locale: 'en', brandTheme: 'purple', colorMode: 'system' },
    });
  });
});
