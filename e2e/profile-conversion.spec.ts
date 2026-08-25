import { test, expect, createLoggedInContext, hasTwoQaUsers, loginAs } from './fixtures';

test.describe('profile conversion acceptance', () => {
  test('landing opens an interactive, in-memory demo', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: /create your first profile/i })).toBeVisible();
    await page.getByRole('link', { name: /view interactive demo/i }).click();
    await expect(page).toHaveURL(/\/demo\/profile$/);
    await expect(page.getByText(/nothing here is saved/i)).toBeVisible();
    await page.getByRole('link', { name: /request a callback/i }).click();
    await page.getByRole('textbox', { name: /your name/i }).fill('Demo visitor');
    await page.getByRole('textbox', { name: /^email$/i }).fill('demo@example.test');
    await page.getByRole('button', { name: /send inquiry/i }).click();
    await expect(page.getByText(/demo complete/i)).toBeVisible();
  });

  test('authenticated owner can open the quick-create wizard', async ({ page }) => {
    test.skip(!hasTwoQaUsers, 'Seeded profile QA credentials are required.');
    await loginAs(page, 'creator');
    await page.goto('/customer-profile/new');
    await expect(page.getByRole('heading', { name: /create a profile quickly/i })).toBeVisible();
    await expect(page.getByText(/customer/i).first()).toBeVisible();
    await expect(page.getByText(/identity/i).first()).toBeVisible();
    await expect(page.getByText(/style/i).first()).toBeVisible();
    await expect(page.getByText(/review/i).first()).toBeVisible();
  });

  test('a public inquiry refreshes the Lead Inbox in realtime', async ({ browser }) => {
    test.skip(!hasTwoQaUsers, 'Seeded profile QA credentials are required.');
    const owner = await createLoggedInContext(browser, 'creator');
    const ownerPage = await owner.newPage();
    await ownerPage.goto('/customer-profile/leads');
    await expect(ownerPage.getByRole('heading', { name: /lead inbox/i })).toBeVisible();

    const visitor = await browser.newContext();
    const visitorPage = await visitor.newPage();
    await visitorPage.goto('/p/e2e-profile');
    await visitorPage.getByRole('button', { name: /request a callback/i }).click();
    await visitorPage.getByRole('textbox', { name: /your name/i }).fill('Realtime Lead');
    await visitorPage.getByRole('textbox', { name: /^email$/i }).fill(`realtime-${Date.now()}@example.test`);
    await visitorPage.getByRole('checkbox').check();
    await visitorPage.getByRole('button', { name: /send inquiry/i }).click();
    await expect(visitorPage.getByText(/inquiry has been received/i)).toBeVisible();
    await expect(ownerPage.getByText('Realtime Lead')).toBeVisible({ timeout: 15_000 });

    await visitor.close();
    await owner.close();
  });
});
