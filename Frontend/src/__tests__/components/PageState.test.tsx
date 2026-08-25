import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PageError, PageHeader, PageLoading } from '../../components/PageState';

describe('shared page states', () => {
  it('renders one page heading and accessible loading state', () => {
    const { rerender } = render(<PageHeader title="My work" subtitle="Priority tasks" />);
    expect(screen.getByRole('heading', { level: 1, name: 'My work' })).toBeInTheDocument();
    rerender(<PageLoading label="Loading work" />);
    expect(screen.getByRole('status', { name: 'Loading work' })).toBeInTheDocument();
  });

  it('exposes retry as an actionable button', () => {
    const retry = vi.fn();
    render(<PageError title="Could not load" message="Check the connection" retryLabel="Retry" onRetry={retry} />);
    screen.getByRole('button', { name: 'Retry' }).click();
    expect(retry).toHaveBeenCalledOnce();
  });
});
