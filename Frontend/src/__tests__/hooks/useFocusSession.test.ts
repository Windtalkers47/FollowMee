import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useFocusSession } from '../../hooks/useFocusSession';

describe('useFocusSession', () => {
  it('keeps the original snapshot while switching focus targets', () => {
    const { result, rerender } = renderHook(
      ({ filter }) => useFocusSession({ filter }),
      { initialProps: { filter: 'all' } },
    );

    act(() => result.current.enterFocus('overdue'));
    rerender({ filter: 'review' });
    act(() => result.current.enterFocus('today'));

    expect(result.current.focusTarget).toBe('today');
    expect(result.current.session?.snapshot).toEqual({ filter: 'all' });
    let previous: { filter: string } | null = null;
    act(() => { previous = result.current.takePreviousView(); });
    expect(previous).toEqual({ filter: 'all' });
    expect(result.current.focusTarget).toBeNull();
  });

  it('drops the temporary target when a normal filter takes over', () => {
    const { result } = renderHook(() => useFocusSession({ filter: 'all' }));
    act(() => result.current.enterFocus('overdue'));
    act(() => result.current.leaveFocus());
    expect(result.current.session).toBeNull();
  });
});
