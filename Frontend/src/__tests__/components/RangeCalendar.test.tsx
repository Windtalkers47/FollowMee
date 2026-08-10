import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RangeCalendar } from '../../components/RangeCalendar';
import { messages } from '../../i18n/messages';

vi.mock('../../contexts/UserPreferencesContext', () => ({
  useUserPreferences: () => ({
    locale: 'en',
    t: (key: keyof typeof messages.en, values?: Record<string, string | number>) => {
      let value: string = messages.en[key] || key;
      Object.entries(values || {}).forEach(([name, replacement]) => { value = value.replace(`{${name}}`, String(replacement)); });
      return value;
    },
  }),
}));

const renderCalendar = (
  value: [Date | null, Date | null],
  onChange = vi.fn(),
  mode: 'light' | 'dark' = 'light',
) => render(
  <ThemeProvider theme={createTheme({ palette: { mode } })}>
    <RangeCalendar value={value} onChange={onChange} allowPast maxDate={new Date(2026, 6, 31)} maxRangeDays={366} />
  </ThemeProvider>,
);

describe('RangeCalendar', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('followmee:user-preferences', JSON.stringify({ locale: 'en', colorMode: 'light', brandTheme: 'purple' }));
  });

  it.each(['light', 'dark'] as const)('shows a readable Apply action in %s mode', async (mode) => {
    renderCalendar([new Date(2026, 6, 12), new Date(2026, 6, 31)], vi.fn(), mode);
    await userEvent.click(screen.getByText(/Jul.*2026|July.*2026/));
    const apply = screen.getByRole('button', { name: 'Apply' });
    expect(apply).toBeVisible();
    expect(apply).toHaveTextContent('Apply');
    expect(apply).toBeEnabled();
  });

  it('keeps Apply disabled until the range is complete and supports arrow-key focus', async () => {
    renderCalendar([null, null]);
    await userEvent.click(screen.getByText('Select date range'));
    const firstDay = screen.getByRole('button', { name: /July 12, 2026/i });
    firstDay.focus();
    await userEvent.keyboard('{ArrowRight}');
    await waitFor(() => expect(screen.getByRole('button', { name: /July 13, 2026/i })).toHaveFocus());
    await userEvent.click(firstDay);
    expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('Select an end date');
  });

  it('commits only on Apply and Cancel keeps the original value', async () => {
    const onChange = vi.fn();
    renderCalendar([new Date(2026, 6, 12), new Date(2026, 6, 13)], onChange);
    await userEvent.click(screen.getByText(/Jul.*2026|July.*2026/));
    await userEvent.click(screen.getByRole('button', { name: /July 14, 2026/i }));
    await userEvent.click(screen.getByRole('button', { name: /July 15, 2026/i }));
    expect(onChange).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
