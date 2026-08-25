import { useMemo, useState } from 'react';
import { useFocusSession } from '../../hooks/useFocusSession';
import { resolveScheduleFocus, type ScheduleDateFilter } from '../../utils/scheduleFocus';
import { scheduleActiveFilterCount, type ScheduleAssignee, type ScheduleSortOption } from './schedule.contracts';

interface ScheduleView {
  activeTab: number;
  dateFilter: ScheduleDateFilter;
  sortBy: ScheduleSortOption;
  searchInput: string;
  searchQuery: string;
  page: number;
  assigneeId: ScheduleAssignee;
}

export const useScheduleFilters = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<ScheduleSortOption>('updated_desc');
  const [dateFilter, setDateFilter] = useState<ScheduleDateFilter>('all');
  const [page, setPage] = useState(1);
  const [assigneeId, setAssigneeId] = useState<ScheduleAssignee>('all');
  const currentView = useMemo<ScheduleView>(() => ({
    activeTab, dateFilter, sortBy, searchInput, searchQuery, page, assigneeId,
  }), [activeTab, dateFilter, sortBy, searchInput, searchQuery, page, assigneeId]);
  const focusSession = useFocusSession(currentView);
  const focusView = resolveScheduleFocus(activeTab, dateFilter, focusSession.focusTarget);

  const clearFocusForInteraction = () => focusSession.leaveFocus();
  const restorePreviousView = () => {
    const snapshot = focusSession.takePreviousView();
    if (!snapshot) return;
    setActiveTab(snapshot.activeTab);
    setDateFilter(snapshot.dateFilter);
    setSortBy(snapshot.sortBy);
    setSearchInput(snapshot.searchInput);
    setSearchQuery(snapshot.searchQuery);
    setPage(snapshot.page);
    setAssigneeId(snapshot.assigneeId);
  };
  const showAllTasks = () => {
    focusSession.leaveFocus();
    setActiveTab(0);
    setDateFilter('all');
    setSortBy('updated_desc');
    setSearchInput('');
    setSearchQuery('');
    setPage(1);
    setAssigneeId('all');
  };
  const search = () => {
    clearFocusForInteraction();
    setSearchQuery(searchInput);
    setPage(1);
  };
  const clearSearch = () => {
    clearFocusForInteraction();
    setSearchInput('');
    setSearchQuery('');
    setPage(1);
  };

  return {
    activeTab, setActiveTab, searchInput, setSearchInput, searchQuery, setSearchQuery, sortBy, setSortBy,
    dateFilter, setDateFilter, page, setPage, assigneeId, setAssigneeId,
    focusTarget: focusSession.focusTarget, enterFocus: focusSession.enterFocus,
    focusView, clearFocusForInteraction, restorePreviousView, showAllTasks, search, clearSearch,
    activeFilterCount: scheduleActiveFilterCount(dateFilter, sortBy, assigneeId),
  };
};
