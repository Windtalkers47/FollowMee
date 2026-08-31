import { useEffect, useRef } from 'react';
import { Box } from '@mui/material';
declare global { interface Window { turnstile?: { render: (element: HTMLElement, options: { sitekey: string; callback: (token: string) => void; 'error-callback': () => void; 'expired-callback': () => void; 'timeout-callback': () => void }) => string; remove: (id: string) => void } } }
export default function TurnstileWidget({ siteKey, onToken, resetKey = 0 }: { siteKey: string; onToken: (token: string) => void; resetKey?: number }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!siteKey || !host.current) return;
    let widgetId = '';
    const clearToken = () => onToken('');
    const render = () => {
      if (host.current && window.turnstile && !widgetId) {
        widgetId = window.turnstile.render(host.current, {
          sitekey: siteKey,
          callback: onToken,
          'error-callback': clearToken,
          'expired-callback': clearToken,
          'timeout-callback': clearToken,
        });
      }
    };
    let script = document.querySelector<HTMLScriptElement>('script[data-followmee-turnstile]');
    if (!script) { script = document.createElement('script'); script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'; script.async = true; script.defer = true; script.dataset.followmeeTurnstile = 'true'; document.head.appendChild(script); }
    script.addEventListener('load', render); render();
    return () => { script?.removeEventListener('load', render); if (widgetId) window.turnstile?.remove(widgetId); };
  }, [siteKey, onToken, resetKey]);
  return siteKey ? <Box ref={host} sx={{ my: 2 }} /> : null;
}
