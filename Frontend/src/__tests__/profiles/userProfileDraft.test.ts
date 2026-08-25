import { describe, expect, it, vi } from 'vitest';
import { saveBeforePublishing } from '../../utils/userProfileDraft';

describe('user profile draft publishing', () => {
  it('waits for the current draft to save before publishing', async () => {
    const calls: string[] = [];
    const save = vi.fn(async () => { calls.push('save'); });
    const publish = vi.fn(async () => { calls.push('publish'); return { status: 'published' }; });

    await expect(saveBeforePublishing({ headline: 'Current' }, save, publish)).resolves.toEqual({ status: 'published' });
    expect(calls).toEqual(['save', 'publish']);
    expect(save).toHaveBeenCalledWith({ headline: 'Current' });
  });

  it('does not publish when saving fails', async () => {
    const publish = vi.fn();
    await expect(saveBeforePublishing({}, async () => { throw new Error('save failed'); }, publish)).rejects.toThrow('save failed');
    expect(publish).not.toHaveBeenCalled();
  });
});
