import type { MessageKey } from '../i18n/messages';

type Translator = (key: MessageKey, values?: Record<string, string | number>) => string;
const filters = ['all', 'todo', 'in_progress', 'review', 'approval', 'overdue', 'due_today', 'due_soon', 'blocked'] as const;
type SavedFilter = typeof filters[number];

export const savedViewStorageName = (filter: string) => `savedView.myWork.${filter}`;

export const presentSavedViewName = (t: Translator, name: string) => {
  const canonical = name.startsWith('savedView.myWork.') ? name.slice('savedView.myWork.'.length) : null;
  const legacy = name.match(/^My Work\s*[·-]\s*(.+)$/i)?.[1];
  const filter = (canonical || legacy) as SavedFilter | null;
  if (filter && filters.includes(filter)) return t(`savedView.filter.${filter}`);
  return name;
};
