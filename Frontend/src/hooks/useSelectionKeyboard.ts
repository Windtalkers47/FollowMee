import { useEffect } from 'react';

interface UseSelectionKeyboardProps {
  isSelectionMode: boolean;
  selectedCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onExitSelectionMode: () => void;
  onBulkAction?: (action: 'done' | 'start' | 'delete') => void;
  enabled?: boolean;
}

/**
 * Custom hook for keyboard shortcuts in selection mode
 * 
 * Shortcuts:
 * - Ctrl/Cmd + A: Select All (when in selection mode)
 * - Escape: Exit selection mode
 * - Delete/Backspace: Delete selected tasks
 * - D: Mark as Done
 * - S: Start Progress
 * - Space: Toggle select (handled by individual cards)
 */
export const useSelectionKeyboard = ({
  isSelectionMode,
  selectedCount,
  onSelectAll,
  onDeselectAll,
  onExitSelectionMode,
  onBulkAction,
  enabled = true
}: UseSelectionKeyboardProps) => {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle shortcuts when in selection mode
      if (!isSelectionMode) return;

      // Ignore if typing in input/textarea
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const ctrlOrCmd = isMac ? event.metaKey : event.ctrlKey;

      // Ctrl/Cmd + A: Select All
      if (ctrlOrCmd && event.key === 'a') {
        event.preventDefault();
        onSelectAll();
        return;
      }

      // Escape: Exit selection mode
      if (event.key === 'Escape') {
        event.preventDefault();
        onExitSelectionMode();
        return;
      }

      // Delete/Backspace: Delete selected
      if (event.key === 'Delete' || event.key === 'Backspace') {
        // Only if not in an input field and there are selected items
        if (selectedCount > 0 && onBulkAction) {
          event.preventDefault();
          onBulkAction('delete');
          return;
        }
      }

      // D: Mark as Done
      if (event.key === 'd' || event.key === 'D') {
        if (selectedCount > 0 && onBulkAction) {
          event.preventDefault();
          onBulkAction('done');
          return;
        }
      }

      // S: Start Progress
      if (event.key === 's' || event.key === 'S') {
        if (selectedCount > 0 && onBulkAction) {
          event.preventDefault();
          onBulkAction('start');
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    isSelectionMode,
    selectedCount,
    onSelectAll,
    onDeselectAll,
    onExitSelectionMode,
    onBulkAction,
    enabled
  ]);
};

export default useSelectionKeyboard;