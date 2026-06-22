import { useState, useCallback, useMemo } from 'react';

/**
 * Hook for managing multi-select state
 * Used for selecting multiple tasks for bulk actions
 */
export const useMultiSelect = <T extends { id: string }>() => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  /**
   * Toggle selection of an item
   */
  const toggleSelect = useCallback((id: string) => {
    console.log('[useMultiSelect] toggleSelect called with id:', id);
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      
      console.log('[useMultiSelect] toggleSelect: newSet size:', newSet.size);
      console.log('[useMultiSelect] toggleSelect: prev set:', Array.from(prev));
      console.log('[useMultiSelect] toggleSelect: new set:', Array.from(newSet));
      
      // Exit selection mode if no items selected
      if (newSet.size === 0) {
        console.log('[useMultiSelect] toggleSelect: exiting selection mode');
        setIsSelectionMode(false);
      } else {
        console.log('[useMultiSelect] toggleSelect: entering/keeping selection mode');
        setIsSelectionMode(true);
      }
      
      return newSet;
    });
  }, []);

  /**
   * Select an item
   */
  const select = useCallback((id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      newSet.add(id);
      setIsSelectionMode(true);
      return newSet;
    });
  }, []);

  /**
   * Deselect an item
   */
  const deselect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      
      if (newSet.size === 0) {
        setIsSelectionMode(false);
      }
      
      return newSet;
    });
  }, []);

  /**
   * Select all items
   */
  const selectAll = useCallback((items: T[]) => {
    const allIds = new Set(items.map(item => item.id));
    setSelectedIds(allIds);
    if (items.length > 0) {
      setIsSelectionMode(true);
    }
  }, []);

  /**
   * Deselect all items
   */
  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
    setIsSelectionMode(false);
  }, []);

  /**
   * Check if an item is selected
   */
  const isSelected = useCallback((id: string) => {
    return selectedIds.has(id);
  }, [selectedIds]);

  /**
   * Check if all items are selected
   */
  const areAllSelected = useCallback((items: T[]) => {
    if (items.length === 0) return false;
    return items.every(item => selectedIds.has(item.id));
  }, [selectedIds]);

  /**
   * Check if some items are selected (not all)
   */
  const areSomeSelected = useCallback((items: T[]) => {
    const selectedCount = items.filter(item => selectedIds.has(item.id)).length;
    return selectedCount > 0 && selectedCount < items.length;
  }, [selectedIds]);

  /**
   * Get selected items
   */
  const getSelectedItems = useCallback((items: T[]): T[] => {
    return items.filter(item => selectedIds.has(item.id));
  }, [selectedIds]);

  /**
   * Enter selection mode
   */
  const enterSelectionMode = useCallback(() => {
    console.log('[useMultiSelect] enterSelectionMode called');
    setIsSelectionMode(true);
  }, []);

  /**
   * Exit selection mode
   */
  const exitSelectionMode = useCallback(() => {
    setSelectedIds(new Set());
    setIsSelectionMode(false);
  }, []);

  /**
   * Toggle selection mode
   */
  const toggleSelectionMode = useCallback(() => {
    setIsSelectionMode(prev => {
      if (!prev) {
        return true;
      }
      // If exiting, clear selection
      setSelectedIds(new Set());
      return false;
    });
  }, []);

  return useMemo(() => ({
    // State
    selectedIds,
    isSelectionMode,
    selectedCount: selectedIds.size,
    
    // Actions
    toggleSelect,
    select,
    deselect,
    selectAll,
    deselectAll,
    isSelected,
    areAllSelected,
    areSomeSelected,
    getSelectedItems,
    enterSelectionMode,
    exitSelectionMode,
    toggleSelectionMode,
  }), [
    selectedIds,
    isSelectionMode,
    toggleSelect,
    select,
    deselect,
    selectAll,
    deselectAll,
    isSelected,
    areAllSelected,
    areSomeSelected,
    getSelectedItems,
    enterSelectionMode,
    exitSelectionMode,
    toggleSelectionMode,
  ]);
};

export default useMultiSelect;