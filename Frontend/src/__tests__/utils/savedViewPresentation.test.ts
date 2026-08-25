import { describe, expect, it } from 'vitest';
import { presentSavedViewName, savedViewStorageName } from '../../utils/savedViewPresentation';
import type { MessageKey } from '../../i18n/messages';

const t = (key: MessageKey) => ({
  'savedView.filter.overdue': 'งานเกินกำหนด',
  'savedView.filter.due_today': 'ครบกำหนดวันนี้',
}[key] || key);

describe('saved view presentation', () => {
  it('stores a locale-neutral name and presents it with translations', () => {
    expect(savedViewStorageName('overdue')).toBe('savedView.myWork.overdue');
    expect(presentSavedViewName(t, 'savedView.myWork.overdue')).toBe('งานเกินกำหนด');
  });

  it('localizes legacy auto-generated English names without changing custom names', () => {
    expect(presentSavedViewName(t, 'My Work · due_today')).toBe('ครบกำหนดวันนี้');
    expect(presentSavedViewName(t, 'Quarter-end review')).toBe('Quarter-end review');
  });
});
