import { useCallback, useState } from 'react';

export interface FocusSession<TView> {
  target: string;
  snapshot: TView;
}

export const useFocusSession = <TView,>(currentView: TView) => {
  const [session, setSession] = useState<FocusSession<TView> | null>(null);

  const enterFocus = useCallback((target: string) => {
    setSession((existing) => existing
      ? { ...existing, target }
      : { target, snapshot: currentView });
  }, [currentView]);

  const leaveFocus = useCallback(() => setSession(null), []);

  const takePreviousView = useCallback(() => {
    const snapshot = session?.snapshot ?? null;
    setSession(null);
    return snapshot;
  }, [session]);

  return {
    session,
    focusTarget: session?.target ?? null,
    enterFocus,
    leaveFocus,
    takePreviousView,
  };
};
