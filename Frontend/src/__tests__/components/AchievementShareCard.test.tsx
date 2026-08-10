import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material';
import { describe, expect, it } from 'vitest';
import AchievementShareCard from '../../components/AchievementShareCard';

const entry = { userName: 'Coca', userLastName: 'Test', score: 120, rank: 1 as const };

describe('AchievementShareCard', () => {
  it.each([
    ['square', '540px', '540px'],
    ['story', '540px', '960px'],
  ] as const)('uses a fixed %s export canvas', (format, width, height) => {
    render(<ThemeProvider theme={createTheme()}><AchievementShareCard entry={entry} seasonLabel="2026-08" format={format} pointsLabel="120 pts" brandLabel="FollowMee" recognitionLabel="Recognition" /></ThemeProvider>);
    expect(screen.getByTestId(`achievement-share-${format}`)).toHaveStyle({ width, height });
    expect(screen.getByText('#1')).toBeInTheDocument();
  });
});
