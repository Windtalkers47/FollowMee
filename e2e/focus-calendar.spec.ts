import { test, expect, hasTwoQaUsers, loginAs } from './fixtures';

test.describe('focus mode and analytics calendar regression', () => {
  test.skip(!hasTwoQaUsers, 'Seeded QA credentials are required.');

  test('All tasks exits overdue focus and removes the stale dueFilter', async ({ page }) => {
    await loginAs(page, 'creator');
    await page.route('**/api/tasks/schedule-meta', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            statusCounts: { all: 1, draft: 0, todo: 1, in_progress: 0, review: 0, done: 0, cancelled: 0 },
            focus: {
              primary: { kind: 'overdue', count: 1, targetFilter: 'overdue' },
              counts: { overdue: 1, dueToday: 0, dueSoon: 0, waitingReview: 0 },
              revision: 'e2e-overdue-focus',
            },
          },
        }),
      });
    });

    await page.goto('/schedule');
    await expect(page.getByRole('region', { name: /organization focus/i })).toBeVisible();
    const overdueRequest = page.waitForRequest((request) => {
      const url = new URL(request.url());
      return url.pathname.endsWith('/api/tasks') && url.searchParams.get('dueFilter') === 'overdue';
    });
    await page.getByRole('button', { name: /view tasks/i }).click();
    await overdueRequest;
    await expect(page.getByText(/focus mode:/i)).toBeVisible();

    const allTasksRequest = page.waitForRequest((request) => {
      const url = new URL(request.url());
      return url.pathname.endsWith('/api/tasks') && !url.searchParams.has('dueFilter') && !url.searchParams.has('status');
    });
    await page.getByRole('button', { name: /show all tasks/i }).click();
    const request = await allTasksRequest;
    expect(new URL(request.url()).searchParams.has('dueFilter')).toBe(false);
    await expect(page.getByText(/focus mode:/i)).toHaveCount(0);
  });

  test('Analytics calendar exposes a readable Apply action', async ({ page }) => {
    await loginAs(page, 'creator');
    await page.goto('/analytics');
    await page.getByRole('button', { name: /^period:/i }).click();
    await page.getByRole('button', { name: 'Date range', exact: true }).click();
    const apply = page.getByRole('button', { name: 'Apply' });
    await expect(apply).toBeVisible();
    await expect(apply).toHaveText('Apply');
    await expect(apply).toBeEnabled();
  });
});
