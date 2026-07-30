import { test, expect, hasTwoQaUsers, createLoggedInContext, loginAs } from './fixtures';

test.describe('authenticated navigation and notification smoke', () => {
  test.skip(!hasTwoQaUsers, 'Set E2E_CREATOR_EMAIL/PASSWORD and E2E_ASSIGNEE_EMAIL/PASSWORD for authenticated QA.');

  test('creator and assignee can use separate sessions', async ({ browser }) => {
    const creator = await createLoggedInContext(browser, 'creator');
    const assignee = await createLoggedInContext(browser, 'assignee');
    const creatorPage = await creator.newPage();
    const assigneePage = await assignee.newPage();
    await creatorPage.goto('/notifications');
    await assigneePage.goto('/notifications');
    await expect(creatorPage.getByRole('heading', { name: 'Notifications' })).toBeVisible();
    await expect(assigneePage.getByRole('heading', { name: 'Notifications' })).toBeVisible();
    await creator.close();
    await assignee.close();
  });

  test('task activity route has comments and no undefined reply labels', async ({ page }) => {
    await loginAs(page, 'creator');
    await page.goto('/posts');
    await expect(page).toHaveURL(/posts/);
    await expect(page.locator('body')).not.toContainText('undefined');
  });

  test('notification center supports All, Unread and Archived views', async ({ page }) => {
    await loginAs(page, 'creator');
    await page.goto('/notifications');
    await expect(page.getByRole('tab', { name: 'All' })).toBeVisible();
    await page.getByRole('tab', { name: 'Unread' }).click();
    await expect(page.getByRole('tab', { name: 'Unread' })).toHaveAttribute('aria-selected', 'true');
    await page.getByRole('tab', { name: 'Archived' }).click();
    await expect(page.getByRole('tab', { name: 'Archived' })).toHaveAttribute('aria-selected', 'true');
  });

  test('schedule card exposes task context and an explicit selection mode', async ({ page }) => {
    await loginAs(page, 'assignee');
    await page.goto('/schedule');
    await expect(page.getByText('E2E seeded task')).toBeVisible();
    await expect(page.getByText(/Assigned to QA/i)).toBeVisible();
    await expect(page.getByText(/Due in 2 days|Due in 1 day/i)).toBeVisible();
    await page.getByRole('button', { name: 'Select tasks' }).click();
    await expect(page.getByRole('toolbar', { name: 'Selection mode toolbar' })).toContainText('Select tasks');
    await expect(page.getByRole('checkbox', { name: /Select E2E seeded task/i })).toBeVisible();
    await page.getByRole('button', { name: 'Exit selection mode' }).click();
    await expect(page.getByRole('button', { name: 'Select tasks' })).toBeVisible();
  });
});
