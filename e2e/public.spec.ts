import { test, expect } from './fixtures';

test.describe('public responsive smoke', () => {
  test('login page is usable and has no horizontal overflow', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Enter your email' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Enter your password' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      await page.evaluate(() => document.documentElement.clientWidth)
    );
  });

  test('invalid login shows an in-app error instead of a browser alert', async ({ page }) => {
    let nativeDialogShown = false;
    page.on('dialog', async dialog => {
      nativeDialogShown = true;
      await dialog.dismiss();
    });
    await page.goto('/login');
    await page.getByRole('textbox', { name: 'Enter your email' }).fill('invalid@example.test');
    await page.getByRole('textbox', { name: 'Enter your password' }).fill('invalid-password');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByRole('alert')).toContainText(/invalid|failed|incorrect/i, { timeout: 12_000 });
    expect(nativeDialogShown).toBe(false);
  });
});
