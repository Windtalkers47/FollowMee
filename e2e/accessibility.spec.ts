import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { test, expect, hasTwoQaUsers, loginAs } from './fixtures';

const assertNoSeriousAccessibilityIssues = async (page: Page) => {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();

  const blocking = results.violations.filter(({ impact }) =>
    impact === 'serious' || impact === 'critical'
  );
  expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
};

const useDarkPreferences = async (page: Page) => {
  const apiUrl = process.env.E2E_API_URL || 'http://localhost:5110/api';
  await page.request.patch(`${apiUrl}/user-preferences`, {
    data: { locale: 'en', brandTheme: 'purple', colorMode: 'dark' },
  });
};

test.describe('accessibility smoke', () => {
  test('login has no serious or critical axe violations', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    await assertNoSeriousAccessibilityIssues(page);
  });

  test('keyboard can reach and submit the login form', async ({ page }) => {
    await page.goto('/login');
    const email = page.getByRole('textbox', { name: /email/i });
    for (let step = 0; step < 8 && !(await email.evaluate(element => element === document.activeElement)); step += 1) {
      await page.keyboard.press('Tab');
    }
    await expect(email).toBeFocused();
    await email.fill('keyboard@example.test');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('textbox', { name: /enter your password/i })).toBeFocused();
  });

  test('authenticated notification center has no serious or critical violations', async ({ page }) => {
    test.skip(!hasTwoQaUsers, 'Authenticated accessibility checks require the isolated seeded QA database.');
    await loginAs(page, 'creator');
    await useDarkPreferences(page);
    await page.goto('/notifications');
    await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible();
    await assertNoSeriousAccessibilityIssues(page);
  });

  test('analytics date range is keyboard reachable and has no serious violations', async ({ page }) => {
    test.skip(!hasTwoQaUsers, 'Authenticated accessibility checks require the isolated seeded QA database.');
    await loginAs(page, 'creator');
    await useDarkPreferences(page);
    await page.goto('/analytics');
    await page.getByRole('button', { name: /^period:/i }).click();
    const trigger = page.getByRole('button', { name: 'Date range', exact: true });
    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Apply' })).toBeVisible();
    await assertNoSeriousAccessibilityIssues(page);
  });
});
