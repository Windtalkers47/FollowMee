import { test as base, expect, Browser, BrowserContext, Page } from '@playwright/test';

type Credentials = { email: string; password: string };

const credentials = {
  creator: {
    email: process.env.E2E_CREATOR_EMAIL || (process.env.E2E_SEEDED === '1' ? 'qa-creator@example.test' : ''),
    password: process.env.E2E_CREATOR_PASSWORD || (process.env.E2E_SEEDED === '1' ? 'FollowMee-QA-2026!' : ''),
  },
  assignee: {
    email: process.env.E2E_ASSIGNEE_EMAIL || (process.env.E2E_SEEDED === '1' ? 'qa-assignee@example.test' : ''),
    password: process.env.E2E_ASSIGNEE_PASSWORD || (process.env.E2E_SEEDED === '1' ? 'FollowMee-QA-2026!' : ''),
  },
  reviewer: {
    email: process.env.E2E_REVIEWER_EMAIL || (process.env.E2E_SEEDED === '1' ? 'qa-reviewer@example.test' : ''),
    password: process.env.E2E_REVIEWER_PASSWORD || (process.env.E2E_SEEDED === '1' ? 'FollowMee-QA-2026!' : ''),
  },
  unrelated: {
    email: process.env.E2E_UNRELATED_EMAIL || (process.env.E2E_SEEDED === '1' ? 'qa-unrelated@example.test' : ''),
    password: process.env.E2E_UNRELATED_PASSWORD || (process.env.E2E_SEEDED === '1' ? 'FollowMee-QA-2026!' : ''),
  },
} satisfies Record<string, Credentials>;

export const hasTwoQaUsers = Boolean(
  credentials.creator.email && credentials.creator.password && credentials.assignee.email && credentials.assignee.password
);

export const hasProfileQaUsers = Boolean(
  hasTwoQaUsers && credentials.reviewer.email && credentials.reviewer.password
);

export async function login(page: Page, user: Credentials) {
  await page.goto('/login');
  await page.getByRole('textbox', { name: /email/i }).fill(user.email);
  await page.getByRole('textbox', { name: /enter your password/i }).fill(user.password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/dashboard|my-work|posts|schedule/);
  const closeGuide = page.getByRole('button', { name: /close guide/i });
  if (await closeGuide.waitFor({ state: 'visible', timeout: 3_000 }).then(() => true).catch(() => false)) {
    await closeGuide.click();
  }
}

export async function loginAs(page: Page, role: 'creator' | 'assignee' | 'reviewer' | 'unrelated') {
  await login(page, credentials[role]);
}

export async function createLoggedInContext(
  browser: Browser,
  role: 'creator' | 'assignee' | 'reviewer' | 'unrelated',
): Promise<BrowserContext> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await loginAs(page, role);
  const accessToken = await page.evaluate(() => localStorage.getItem('access_token') || sessionStorage.getItem('access_token'));
  if (accessToken) await context.setExtraHTTPHeaders({ Authorization: `Bearer ${accessToken}` });
  await page.close();
  return context;
}

export { base as test, expect };
