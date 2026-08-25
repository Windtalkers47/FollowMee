import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AuthShell, { AuthMotionBoundary } from '../../components/AuthShell';

describe('AuthShell', () => {
  it('provides one shared heading and outlined form surface', () => {
    render(<AuthShell title="Recover account" subtitle="We will send a link"><button>Continue</button></AuthShell>);
    expect(screen.getByRole('heading', { level: 1, name: 'Recover account' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument();
  });

  it('marks the auth motion boundary used by every auth flow', () => {
    const { container } = render(<AuthMotionBoundary><div>Form</div></AuthMotionBoundary>);
    expect(container.querySelector('[data-auth-motion-boundary]')).toBeInTheDocument();
    expect(document.head.textContent).toContain('prefers-reduced-motion');
  });
});
