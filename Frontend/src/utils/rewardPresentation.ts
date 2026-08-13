import type { MessageKey } from '../i18n/messages';

type Translator = (key: MessageKey, values?: Record<string, string | number>) => string;

const humanizeKey = (key: string) => {
  const leaf = key.split('.').pop() || key;
  return leaf
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .replace(/^./, value => value.toUpperCase());
};

export const translateRewardKey = (t: Translator, key: string) => {
  const translated = t(key as MessageKey);
  return translated === key ? humanizeKey(key) : translated;
};
