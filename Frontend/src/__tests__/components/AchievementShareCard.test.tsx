import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material';
import { describe, expect, it } from 'vitest';
import AchievementShareCard from '../../components/AchievementShareCard';

const entry = { title: 'First finish', description: 'Completed your first approved task', artworkKey: 'first-completion', rarity: 'common' as const, earnedDate: 'Earned Aug 13, 2026' };

describe('AchievementShareCard', () => {
  it.each([
    ['square', '1080px', '1080px'],
    ['story', '1080px', '1920px'],
  ] as const)('uses a fixed %s export canvas', (format, width, height) => {
    render(<ThemeProvider theme={createTheme()}><AchievementShareCard entry={entry} format={format} brandLabel="FollowMee" achievementLabel="FollowMee Achievement" /></ThemeProvider>);
    expect(screen.getByTestId(`achievement-share-${format}`)).toHaveStyle({ width, height });
    expect(screen.getByText('First finish')).toBeInTheDocument();
    expect(screen.queryByText('#1')).not.toBeInTheDocument();
  });
});
