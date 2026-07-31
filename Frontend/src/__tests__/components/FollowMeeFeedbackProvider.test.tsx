import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import FollowMeeFeedbackProvider from '../../components/FeedbackProvider/FollowMeeFeedbackProvider';
import feedback from '../../services/feedback.service';

vi.mock('../../contexts/UserPreferencesContext', () => ({
  useUserPreferences: () => ({
    t: (key: string) => ({
      'feedback.confirm': 'Confirm',
      'feedback.cancel': 'Cancel',
      'feedback.confirmTitle': 'Confirm action',
      'feedback.close': 'Close',
      'feedback.done': 'Done',
    }[key] || key),
    brandTheme: 'purple',
  }),
}));

const renderProvider = (child: React.ReactNode = <div>Application</div>) =>
  render(
    <MemoryRouter>
      <ThemeProvider theme={createTheme()}>
        <FollowMeeFeedbackProvider>{child}</FollowMeeFeedbackProvider>
      </ThemeProvider>
    </MemoryRouter>,
  );

describe('FollowMeeFeedbackProvider', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.useRealTimers());

  it('queues modal decisions and resolves each promise exactly once', async () => {
    renderProvider();
    let first!: Promise<{ isConfirmed: boolean; value?: string }>;
    let second!: Promise<{ isConfirmed: boolean; value?: string }>;
    act(() => {
      first = feedback.confirm({
        title: 'First action',
        message: 'First message',
        confirmLabel: 'Continue',
        cancelLabel: 'Cancel',
      });
      second = feedback.confirm({
        title: 'Second action',
        message: 'Second message',
        confirmLabel: 'Continue',
        cancelLabel: 'Cancel',
      });
    });

    expect(await screen.findByText('First action')).toBeInTheDocument();
    expect(screen.queryByText('Second action')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await expect(first).resolves.toEqual({ isConfirmed: true });

    expect(await screen.findByText('Second action')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await expect(second).resolves.toEqual({ isConfirmed: false });
  });

  it('deduplicates outcome cards without opening a modal', async () => {
    renderProvider();
    await act(async () => {
      await feedback.success({
        title: 'Role changed',
        message: 'Coca Cola is now Admin.',
        dedupeKey: 'role-4-admin',
        duration: 20_000,
      });
      await feedback.success({
        title: 'Role changed',
        message: 'Coca Cola is now Admin.',
        dedupeKey: 'role-4-admin',
        duration: 20_000,
      });
    });

    expect(await screen.findByRole('status')).toBeInTheDocument();
    expect(screen.getAllByText('Role changed')).toHaveLength(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('uses a branded modal for milestone outcomes and closes it automatically', async () => {
    vi.useFakeTimers();
    renderProvider();
    await act(async () => {
      await feedback.success({
        title: 'Role changed',
        message: 'Coca Cola is now Admin.',
        importance: 'milestone',
        duration: 5000,
      });
    });

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('cleans queued feedback on route change and resolves pending decisions', async () => {
    let navigateRoute: ReturnType<typeof useNavigate> | undefined;
    const Navigation = () => {
      const navigate = useNavigate();
      navigateRoute = navigate;
      return <button onClick={() => navigate('/next')}>Next route</button>;
    };
    renderProvider(<Navigation />);
    let pending!: Promise<{ isConfirmed: boolean; value?: string }>;
    act(() => {
      pending = feedback.confirm({
        title: 'Pending action',
        message: 'Leave this route',
        confirmLabel: 'Confirm',
        cancelLabel: 'Cancel',
      });
    });
    expect(await screen.findByText('Pending action')).toBeInTheDocument();
    act(() => navigateRoute?.('/next'));
    await expect(pending).resolves.toEqual({ isConfirmed: false });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
