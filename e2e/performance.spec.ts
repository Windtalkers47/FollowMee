import { test, expect } from './fixtures';

test.describe('mobile performance budget', () => {
  test('login stays within the agreed Core Web Vitals budget', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'PerformanceObserver event timing is asserted in Chromium.');
    await page.addInitScript(() => {
      const metrics = { lcp: 0, cls: 0, inp: 0 };
      Object.defineProperty(window, '__followmeeVitals', { value: metrics, configurable: true });

      new PerformanceObserver(list => {
        const entries = list.getEntries();
        metrics.lcp = entries.at(-1)?.startTime || metrics.lcp;
      }).observe({ type: 'largest-contentful-paint', buffered: true });

      new PerformanceObserver(list => {
        for (const entry of list.getEntries() as PerformanceEntry[]) {
          const shift = entry as PerformanceEntry & { value?: number; hadRecentInput?: boolean };
          if (!shift.hadRecentInput) metrics.cls += shift.value || 0;
        }
      }).observe({ type: 'layout-shift', buffered: true });

      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) metrics.inp = Math.max(metrics.inp, entry.duration);
      }).observe({ type: 'event', buffered: true, durationThreshold: 16 } as PerformanceObserverInit);
    });

    await page.goto('/login');
    const email = page.getByRole('textbox', { name: /email/i });
    await email.click();
    await email.fill('performance@example.test');
    await page.waitForTimeout(750);

    const metrics = await page.evaluate(() =>
      (window as Window & { __followmeeVitals: { lcp: number; cls: number; inp: number } }).__followmeeVitals
    );
    expect(metrics.lcp).toBeLessThanOrEqual(2_500);
    expect(metrics.cls).toBeLessThan(0.1);
    expect(metrics.inp).toBeLessThanOrEqual(200);
  });
});
