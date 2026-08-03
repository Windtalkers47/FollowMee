const DEFAULT_INTERNAL_PATH = '/notifications';

/**
 * Accept only same-app absolute paths. Notification URLs are persisted server
 * data, so they must never be able to turn into protocol-relative or external
 * navigation when handed to React Router.
 */
export const getSafeInternalPath = (
  value: string | null | undefined,
  fallback = DEFAULT_INTERNAL_PATH,
): string => {
  const candidate = value?.trim() || '';
  const hasControlCharacter = Array.from(candidate)
    .some(character => {
      const code = character.charCodeAt(0);
      return code <= 31 || code === 127;
    });
  if (
    !candidate.startsWith('/') ||
    candidate.startsWith('//') ||
    candidate.includes('\\') ||
    /%(?:2f|5c)/i.test(candidate) ||
    hasControlCharacter
  ) {
    return fallback;
  }

  try {
    const parsed = new URL(candidate, 'https://followmee.local');
    if (parsed.origin !== 'https://followmee.local') return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
};
