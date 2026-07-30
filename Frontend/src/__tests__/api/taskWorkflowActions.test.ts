import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import { taskApi } from '../../api/task.api';

vi.mock('axios', () => ({
  default: {
    put: vi.fn(),
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('task workflow action API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses the canonical submit-review endpoint', async () => {
    vi.mocked(axios.put).mockResolvedValue({ data: { data: { task: { taskId: 'task-1' } } } });

    await expect(taskApi.submitTaskForReview('task-1')).resolves.toMatchObject({ taskId: 'task-1' });
    expect(axios.put).toHaveBeenCalledWith(
      expect.stringContaining('/tasks/task-1/submit-review'),
      {},
      { withCredentials: true },
    );
  });

  it('requires an explicit reason payload when requesting changes', async () => {
    vi.mocked(axios.put).mockResolvedValue({ data: { data: { task: { taskId: 'task-2', status: 'todo' } } } });

    await taskApi.requestTaskChanges('task-2', 'Please fix the mobile layout');
    expect(axios.put).toHaveBeenCalledWith(
      expect.stringContaining('/tasks/task-2/request-changes'),
      { reason: 'Please fix the mobile layout' },
      { withCredentials: true },
    );
  });
});
