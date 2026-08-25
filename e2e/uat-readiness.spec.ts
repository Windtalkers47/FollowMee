import { expect, test } from '@playwright/test';
test('privacy choices and UAT registration disclose the approval flow', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('dialog', { name: /privacy choices|ตัวเลือกความเป็นส่วนตัว/i })).toBeVisible();
  await page.getByRole('button', { name: /save choices|บันทึกตัวเลือก/i }).click();
  await page.goto('/register');
  await expect(page.getByRole('link', { name: /privacy notice|ประกาศความเป็นส่วนตัว/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /terms of use|ข้อกำหนดการใช้งาน/i })).toBeVisible();
});
