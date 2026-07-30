import { describe, expect, it } from 'vitest';
import { getTaskStatusOptions, isAllowedTaskTransition } from '../../utils/taskWorkflow';

describe('task workflow UI contract', () => {
  it('does not expose Draft after work has started', () => {
    const task = { status: 'todo' as const };
    expect(getTaskStatusOptions(task)).toEqual(['todo', 'in_progress', 'cancelled']);
    expect(isAllowedTaskTransition(task, 'draft')).toBe(false);
  });
});
