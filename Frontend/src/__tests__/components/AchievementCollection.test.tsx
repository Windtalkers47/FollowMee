import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material';
import { describe, expect, it, vi } from 'vitest';
import AchievementCollection from '../../components/AchievementCollection';
import type { Achievement } from '../../api/reward.api';
import { messages } from '../../i18n/messages';

vi.mock('../../contexts/UserPreferencesContext', () => ({
  useUserPreferences: () => ({
    locale: 'en',
    t: (key: keyof typeof messages.en, values?: Record<string, string | number>) => {
      let result = String(messages.en[key] || key);
      Object.entries(values || {}).forEach(([name, value]) => { result = result.replace(`{${name}}`, String(value)); });
      return result;
    },
  }),
}));

const base: Achievement = {
  badgeKey: 'first-completion', nameKey: 'rewards.badge.firstCompletion', descriptionKey: 'rewards.badge.firstCompletionDescription', requirementKey: 'rewards.badge.firstCompletionDescription', icon: 'task_alt', artworkKey: 'first-completion', category: 'milestone', rarity: 'common', target: 1, progress: 1, progressPercent: 100, unlocked: true, userBadgeId: 1, awardedAt: '2026-08-13T00:00:00.000Z', isPinned: false, isPublic: false, sortOrder: 0,
};

describe('AchievementCollection', () => {
  it('shows earned context and real locked progress', () => {
    const locked = { ...base, badgeKey: 'consistency', artworkKey: 'consistency', unlocked: false, userBadgeId: null, awardedAt: null, target: 5, progress: 3, progressPercent: 60 };
    render(<ThemeProvider theme={createTheme()}><AchievementCollection achievements={[base, locked]} /></ThemeProvider>);
    expect(screen.getByText('1/2')).toBeInTheDocument();
    expect(screen.getByText('3 of 5')).toBeInTheDocument();
    expect(screen.getByText(/Earned/)).toBeInTheDocument();
  });

  it('exposes owner pin and visibility controls without rendering them for visitors', async () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    const { rerender } = render(<ThemeProvider theme={createTheme()}><AchievementCollection achievements={[base]} manage onUpdate={onUpdate} /></ThemeProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Pin achievement' }));
    await waitFor(() => expect(onUpdate).toHaveBeenCalledWith('first-completion', { isPinned: true }));
    rerender(<ThemeProvider theme={createTheme()}><AchievementCollection achievements={[base]} /></ThemeProvider>);
    expect(screen.queryByRole('button', { name: 'Pin achievement' })).not.toBeInTheDocument();
  });
});
