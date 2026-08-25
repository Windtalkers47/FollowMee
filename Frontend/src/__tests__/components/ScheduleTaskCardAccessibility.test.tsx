import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Task } from '../../api/task.api';
import ScheduleTaskCard from '../../components/ScheduleTaskCard';

vi.mock('../../contexts/UserPreferencesContext', () => ({
  useUserPreferences: () => ({
    locale: 'en',
    t: (key: string, values?: Record<string, string | number>) => key === 'scheduleCard.openTask'
      ? `Open task: ${values?.title}`
      : key,
  }),
}));

const task = {
  taskId: 'task-1',
  title: 'A very long task title that remains independently actionable',
  status: 'todo',
  images: [],
  workflow: {},
} as unknown as Task;

const baseProps = {
  task,
  currentUserId: 1,
  onEdit: vi.fn(),
  onDelete: vi.fn(),
};

describe('ScheduleTaskCard accessibility', () => {
  it('uses an article with a separate keyboard-operable primary action', async () => {
    const user = userEvent.setup();
    const onCardClick = vi.fn();
    render(<ScheduleTaskCard {...baseProps} onCardClick={onCardClick} />);

    const article = screen.getByRole('article');
    const primaryAction = screen.getByRole('button', { name: `Open task: ${task.title}` });
    expect(article).toContainElement(primaryAction);
    expect(article).not.toHaveAttribute('role', 'button');

    await user.tab();
    expect(primaryAction).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(onCardClick).toHaveBeenCalledTimes(1);

    await user.keyboard(' ');
    expect(onCardClick).toHaveBeenCalledTimes(2);
  });

  it('exposes selection state and keeps the checkbox separate', () => {
    const onToggleSelect = vi.fn();
    render(<ScheduleTaskCard {...baseProps} isInSelectionMode isSelected onToggleSelect={onToggleSelect} />);

    expect(screen.getByRole('article')).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onToggleSelect).toHaveBeenCalledWith(task.taskId);
  });
});
