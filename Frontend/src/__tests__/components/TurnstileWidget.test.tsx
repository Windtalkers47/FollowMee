import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import TurnstileWidget from '../../components/TurnstileWidget';

describe('TurnstileWidget', () => {
  afterEach(() => {
    cleanup();
    delete window.turnstile;
    document.querySelectorAll('script[data-followmee-turnstile]').forEach(script => script.remove());
  });

  it('clears unusable tokens and creates a fresh widget when resetKey changes', () => {
    const onToken = vi.fn();
    type WidgetOptions = Parameters<NonNullable<typeof window.turnstile>['render']>[1];
    let callbacks: WidgetOptions | null = null;
    const renderWidget = vi.fn((_element: HTMLElement, options: WidgetOptions) => {
      callbacks = options;
      return 'widget-1';
    });
    const removeWidget = vi.fn();
    window.turnstile = { render: renderWidget as NonNullable<typeof window.turnstile>['render'], remove: removeWidget };

    const view = render(<TurnstileWidget siteKey="public-site-key" onToken={onToken} resetKey={0} />);
    callbacks!['error-callback']();
    callbacks!['expired-callback']();
    callbacks!['timeout-callback']();
    expect(onToken).toHaveBeenNthCalledWith(1, '');
    expect(onToken).toHaveBeenNthCalledWith(2, '');
    expect(onToken).toHaveBeenNthCalledWith(3, '');

    view.rerender(<TurnstileWidget siteKey="public-site-key" onToken={onToken} resetKey={1} />);
    expect(removeWidget).toHaveBeenCalledWith('widget-1');
    expect(renderWidget).toHaveBeenCalledTimes(2);
  });
});
