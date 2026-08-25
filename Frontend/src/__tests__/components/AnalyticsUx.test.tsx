import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { messages } from '../../i18n/messages';
import AnalyticsPeriodToolbar from '../../components/AnalyticsPeriodToolbar';
import AnalyticsInsightSummary from '../../components/AnalyticsInsightSummary';
import AnalyticsAtAGlance from '../../components/AnalyticsAtAGlance';
import AnalyticsFocusNext, { resolveAnalyticsFocusKind } from '../../components/AnalyticsFocusNext';

vi.mock('../../components/RangeCalendar', () => ({ RangeCalendar: () => null }));

const translate = (key: keyof typeof messages.en, values?: Record<string, string | number>) => {
  let value = String(messages.en[key] || key);
  Object.entries(values || {}).forEach(([name, replacement]) => { value = value.replace(`{${name}}`, String(replacement)); });
  return value;
};

describe('Analytics compact UX', () => {
  it('keeps presets accessible and reports the selected range', () => {
    const onPresetChange = vi.fn();
    const onToggleRange = vi.fn();
    render(<AnalyticsPeriodToolbar startDate="2026-07-13" endDate="2026-08-11" presetValue="30" rangeOpen={false} range={[new Date('2026-07-13'), new Date('2026-08-11')]} rangeError="" t={translate} onToggleRange={onToggleRange} onPresetChange={onPresetChange} onRangeChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: /2026-07-13/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Last 30 days' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Last 7 days' }));
    expect(onPresetChange).toHaveBeenCalledWith('7');
    fireEvent.click(screen.getByRole('button', { name: /Period: 2026-07-13/ }));
    expect(onToggleRange).toHaveBeenCalledTimes(1);
  });

  it('shows work health context and action for populated work', () => {
    const onAction = vi.fn();
    render(<AnalyticsInsightSummary metrics={{ total: 4, completed: 2, blocked: 1, onTime: 1, firstPass: 2 }} previous={{ total: 4, completed: 1 }} formatter={new Intl.NumberFormat('en-US')} t={translate} onAction={onAction} />);

    expect(screen.getByText('Work health')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText(/1 blocked items/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Review work' }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('does not present zero work as a completion percentage', () => {
    render(<AnalyticsInsightSummary metrics={{ total: 0, completed: 0, blocked: 0, onTime: 0, firstPass: 0 }} previous={{ total: 0, completed: 0 }} formatter={new Intl.NumberFormat('en-US')} t={translate} onAction={vi.fn()} />);

    expect(screen.getByText('No work recorded in this period')).toBeInTheDocument();
    expect(screen.queryByText('0%')).not.toBeInTheDocument();
  });

  it('uses the same decision language and avoids a floating zero percent', () => {
    render(<AnalyticsAtAGlance metrics={{ work: { total: 0, completed: 0 }, customers: { portfolioTotal: 0, profilesReady: 0 }, profiles: { views: 0, clicks: 0, conversion: 0 } }} previous={{ work: {}, customers: {}, profiles: {} }} formatter={new Intl.NumberFormat('en-US')} t={translate} />);

    expect(screen.getByText('At a glance')).toBeInTheDocument();
    expect(screen.getAllByText('No data in this period')).toHaveLength(3);
    expect(screen.queryByText('0%')).not.toBeInTheDocument();
  });

  it('prioritizes blocked work before customer and profile actions', () => {
    const metrics = { work: { blocked: 2 }, customers: { portfolioTotal: 3, profilesReady: 0, missingImage: 3 }, profiles: { views: 10, clicks: 0 } };
    const onAction = vi.fn();
    expect(resolveAnalyticsFocusKind(metrics)).toBe('blocked');
    render(<AnalyticsFocusNext metrics={metrics} t={translate} onAction={onAction} />);
    expect(screen.getByText('Unblock work first')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Review work' }));
    expect(onAction).toHaveBeenCalledWith('/my-work?focus=blocked');
  });

  it('deep-links customer attention to the missing-image filter', () => {
    const onAction = vi.fn();
    render(<AnalyticsFocusNext metrics={{ work: { blocked: 0 }, customers: { missingImage: 2 }, profiles: { views: 0 } }} t={translate} onAction={onAction} />);
    fireEvent.click(screen.getByRole('button', { name: 'Review customers' }));
    expect(onAction).toHaveBeenCalledWith('/customer?focus=missing-image');
  });
});
