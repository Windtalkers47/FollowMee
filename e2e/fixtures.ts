import { test as base, expect, Browser, BrowserContext, Page } from '@playwright/test';

type Credentials = { email: string; password: string };

const credentials = {
  creator: { email: process.env.E2E_CREATOR_EMAIL || '', password: process.env.E2E_CREATOR_PASSWORD || '' },
  assignee: { email: process.env.E2E_ASSIGNEE_EMAIL || '', password: process.env.E2E_ASSIGNEE_PASSWORD || '' },
} satisfies Record<string, Credentials>;

export const hasTwoQaUsers = Boolean(
  credentials.creator.email && credentials.creator.password && credentials.assignee.email && credentials.assignee.password
);

export async function login(page: Page, user: Credentials) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Password').fill(user.password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/dashboard|posts|schedule/);
}

export async function loginAs(page: Page, role: 'creator' | 'assignee') {
  await login(page, credentials[role]);
}

export async function createLoggedInContext(browser: Browser, role: 'creator' | 'assignee'): Promise<BrowserContext> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await loginAs(page, role);
  await page.close();
  return context;
}

export { base as test, expect };
