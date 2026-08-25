import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  useTheme,
  Stack,
} from '@mui/material';
import {
  Add as AddIcon,
  CheckBoxOutlineBlank as CheckBoxOutlineBlankIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../store/store';
import feedback from '../../services/feedback.service';
import type { Task } from '../../api/task.api';
import TaskFocusCard from '../../components/SmartSuggestions/TaskFocusCard';
import SelectionModeTopBar from '../../components/SelectionMode/SelectionModeTopBar';
import { useMultiSelect } from '../../hooks/useMultiSelect';
import { useTaskBulkActions } from '../../hooks/useTaskBulkActions';
import { useSelectionKeyboard } from '../../hooks/useSelectionKeyboard';
import toast from '../../utils/toast';
import { taskStatusTokens } from '../../styles/designTokens';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import { isAllowedTaskTransition } from '../../utils/taskWorkflow';
import ScheduleFilters from '../../components/ScheduleFilters';
import { useScheduleFilters } from './useScheduleFilters';
import { useScheduleController } from './useScheduleController';
import { useScheduleMutations } from './useScheduleMutations';
import { ScheduleTaskList } from './ScheduleTaskList';
import { ScheduleDialogs } from './ScheduleDialogs';
import { scheduleBulkActions, type ScheduleQueryState } from './schedule.contracts';

/* ================== Page ================== */
const SchedulePage = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { t } = useUserPreferences();
  const isDarkMode = theme.palette.mode === 'dark';
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  const [creatorOnlySelection, setCreatorOnlySelection] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [duplicateTask, setDuplicateTask] = useState<Task | null>(null);
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null);
  const filters = useScheduleFilters();
  const {
    setActiveTab, searchInput, setSearchInput, searchQuery, setSearchQuery, sortBy, setSortBy,
    setDateFilter, page, setPage, assigneeId, setAssigneeId, focusTarget,
    enterFocus, focusView, restorePreviousView: restoreFilterView, showAllTasks: resetFilters,
    search: handleSearch, clearSearch: handleClearSearch, activeFilterCount,
  } = filters;
  const focusDateFilter = focusView.effectiveDateFilter;
  const focusStatus = focusView.effectiveStatus;
  const displayedTab = focusView.displayedTab;
  const focusTargetLabel = focusTarget === 'overdue'
    ? t('schedule.overdue')
    : focusTarget === 'today'
      ? t('schedule.dueToday')
      : focusTarget === 'soon'
        ? t('schedule.nextThreeDays')
        : focusTarget === 'week'
          ? t('schedule.nextSevenDays')
          : focusTarget === 'review' || focusTarget === 'approval'
            ? t('schedule.review')
            : focusTarget || '';

  const clearFocusForInteraction = () => {
    filters.clearFocusForInteraction();
    setFocusedTaskId(null);
  };

  const restorePreviousView = () => {
    setFocusedTaskId(null);
    restoreFilterView();
  };

  const showAllTasks = () => {
    setFocusedTaskId(null);
    resetFilters();
  };

  // Multi-select hook - using taskId as id
  const multiSelect = useMultiSelect<{ id: string }>();
  const exitBulkMode = React.useCallback(() => {
    multiSelect.exitSelectionMode();
    setCreatorOnlySelection(false);
    setPage(1);
  }, [multiSelect, setPage]);
  
  // Auto Scroll to Task Cards when entering Selection Mode
  React.useEffect(() => {
    if (multiSelect.isSelectionMode) {
      // Delay slightly for TopBar animation to complete
      const timeoutId = setTimeout(() => {
        // Scroll directly to task cards section
        const taskListElement = document.querySelector('[role="tabpanel"]');
        if (taskListElement) {
          taskListElement.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
      }, 50);

      return () => clearTimeout(timeoutId);
    }
  }, [multiSelect.isSelectionMode]);

  // Bulk lifecycle mutations are intentionally separate from read-only Focus insights.
  const { bulkUpdate, bulkDelete } = useTaskBulkActions(exitBulkMode);

  const { user } = useAppSelector((state) => state.auth);
  const queryState: ScheduleQueryState = {
    searchQuery, status: focusView.query.status, dueFilter: focusView.query.dueFilter,
    effectiveStatus: focusStatus, effectiveDateFilter: focusDateFilter, sortBy, page,
    creatorOnlySelection, assigneeId,
  };
  const { tasksResponse, tasks: filteredTasks, groupedTasks, isLoading, error, refetch, users, scheduleMeta } = useScheduleController({
    queryState, userId: user?.userId, loadUsers: taskDialogOpen || filtersOpen,
  });

  const getValidBulkTaskIds = (status: Task['status']) => {
    const selectedTaskIds = Array.from(multiSelect.selectedIds);
    const selectedTasks = selectedTaskIds
      .map(taskId => tasksResponse?.tasks.find(task => task.taskId === taskId))
      .filter((task): task is Task => Boolean(task));
    const validIds = selectedTasks
      .filter(task => isAllowedTaskTransition(task, status))
      .map(task => task.taskId);
    const skipped = selectedTaskIds.length - validIds.length;
    if (skipped > 0) {
      toast.warning(t('schedule.actionUnavailableForSelection'));
      return [];
    }
    return validIds;
  };
  const hasOwnedTaskOnPage = Boolean(tasksResponse?.tasks.some((task) => task.createdBy === user?.userId));
  const hasOwnerOverrideTaskOnPage = Boolean(tasksResponse?.tasks.some((task) => task.workflow?.canOwnerOverride));
  const canEnterBulkMode = hasOwnedTaskOnPage || hasOwnerOverrideTaskOnPage;

  const mutations = useScheduleMutations({ tasksResponse, editingTask, userId: user?.userId, navigate, t });

  // Handlers
  const handleDeleteTask = mutations.deleteTask;

  const handleCommentTask = (taskId: string, comment: string) => {
    console.log('Comment on task:', taskId, comment);
  };

  const handleMarkDone = mutations.markDone;
  const handleMarkUndone = mutations.markUndone;

  const handleApproveTask = mutations.approve;
  const handleRejectTask = mutations.reject;
  const handleUndoTask = mutations.undo;
  const handleCancelTask = mutations.cancel;

  const handleUpdateTaskStatus = mutations.updateStatus;
  const handleStartProgress = mutations.startProgress;

  React.useEffect(() => {
    if (!focusTarget || filteredTasks.length === 0 || isLoading) return;
    const taskId = filteredTasks[0].taskId;
    const timeout = window.setTimeout(() => {
      setFocusedTaskId(taskId);
      const element = document.querySelector<HTMLElement>(`[data-testid="task-card-${taskId}"]`);
      element?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
      element?.focus({ preventScroll: true });
    }, 80);
    return () => window.clearTimeout(timeout);
  }, [focusTarget, filteredTasks, isLoading]);

  const tabs = useMemo(() => [
    { label: t('schedule.allTasks'), key: 'all' as const, color: taskStatusTokens.draft.color },
    { label: t('schedule.drafts'), key: 'draft' as const, color: taskStatusTokens.draft.color },
    { label: t('schedule.todo'), key: 'todo' as const, color: taskStatusTokens.todo.color },
    { label: t('schedule.inProgress'), key: 'in_progress' as const, color: taskStatusTokens.in_progress.color },
    { label: t('schedule.review'), key: 'review' as const, color: taskStatusTokens.review.color },
    { label: t('schedule.done'), key: 'done' as const, color: taskStatusTokens.done.color },
    { label: t('schedule.cancelled'), key: 'cancelled' as const, color: taskStatusTokens.cancelled.color },
  ], [t]);

  // Handle bulk actions from toolbar
  const handleBulkAction = async (action: 'delete' | 'done' | 'start' | 'todo' | 'draft' | 'review' | 'cancel' | 'assign') => {
    const selectedTaskIds = Array.from(multiSelect.selectedIds);
    
    if (selectedTaskIds.length === 0) {
      toast.warning(t('schedule.noneSelected'));
      return;
    }

    switch (action) {
      case 'delete': {
        const deleteResult = await feedback.fire({
          title: t('task.deleteManyTitle', { count: selectedTaskIds.length }),
          text: t('common.cannotUndo'),
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: t('task.deleteManyConfirm'),
          cancelButtonText: t('common.cancel'),
          reverseButtons: true,
        });

        if (deleteResult.isConfirmed) {
          bulkDelete({ taskIds: selectedTaskIds });
        }
        break;
      }

      case 'done':
        {
          const validIds = getValidBulkTaskIds('done');
          if (validIds.length > 0) bulkUpdate({ taskIds: validIds, status: 'done' });
        }
        break;

      case 'start':
        {
          const validIds = getValidBulkTaskIds('in_progress');
          if (validIds.length > 0) bulkUpdate({ taskIds: validIds, status: 'in_progress' });
        }
        break;

      case 'todo':
        {
          const validIds = getValidBulkTaskIds('todo');
          if (validIds.length > 0) bulkUpdate({ taskIds: validIds, status: 'todo' });
        }
        break;

      case 'draft':
        toast.warning(t('task.invalidTransitionText'));
        break;

      case 'review':
        {
          const validIds = getValidBulkTaskIds('review');
          if (validIds.length > 0) bulkUpdate({ taskIds: validIds, status: 'review' });
        }
        break;

      case 'cancel':
        {
          const validIds = getValidBulkTaskIds('cancelled');
          if (validIds.length > 0) bulkUpdate({ taskIds: validIds, status: 'cancelled' });
        }
        break;

      case 'assign':
        // TODO: Open assign dialog
        toast.info(t('schedule.assignComingSoon'));
        break;
    }
  };

  // Get current tab tasks for select all - convert to { id: string } format
  const currentTabTasks = useMemo(
    () => (groupedTasks[tabs[displayedTab].key] || []).map(task => ({ id: task.taskId })),
    [displayedTab, groupedTasks, tabs],
  );
  const allowedBulkActions = useMemo(() => {
    const selected = Array.from(multiSelect.selectedIds)
      .map((taskId) => tasksResponse?.tasks.find((task) => task.taskId === taskId))
      .filter((task): task is Task => Boolean(task));
    return scheduleBulkActions(selected, user?.userId);
  }, [multiSelect.selectedIds, tasksResponse?.tasks, user?.userId]);

  // Keyboard shortcuts follow the exact same all-selected capability contract
  // as the visible toolbar. They never bypass confirmation or partially mutate.
  useSelectionKeyboard({
    isSelectionMode: multiSelect.isSelectionMode,
    selectedCount: multiSelect.selectedCount,
    onSelectAll: () => multiSelect.selectAll(currentTabTasks),
    onDeselectAll: multiSelect.deselectAll,
    onExitSelectionMode: exitBulkMode,
    onBulkAction: (action) => {
      const requiredAction = action === 'start' ? 'start' : action;
      if (!allowedBulkActions.includes(requiredAction)) {
        toast.warning(t('schedule.actionUnavailableForSelection'));
        return;
      }
      void handleBulkAction(action);
    },
    enabled: true,
  });
  return (
    <Box sx={{ width: '100%', maxWidth: '100vw', overflow: 'hidden' }}>
      <Box sx={{ px: { xs: 2, sm: 3, md: 4 }, pt: 3 }}>
        <TaskFocusCard
          scope="organization"
          focus={scheduleMeta?.focus}
          onFilter={(target) => {
            enterFocus(target);
            setFocusedTaskId(null);
            setPage(1);
          }}
        />
        {focusTarget && <Alert severity="info" sx={{ mb: 2 }} action={<Stack direction="row" gap={1}><Button size="small" onClick={restorePreviousView}>{t('feature.backToPreviousView')}</Button><Button size="small" onClick={showAllTasks}>{t('feature.showAllTasks')}</Button></Stack>}>
          {t('feature.focusModeActive', { filter: focusTargetLabel })}
        </Alert>}
      </Box>

      {/* Header with Search */}
      <Box sx={{ px: { xs: 2, sm: 3, md: 4 }, mb: 3 }}>
        {/* Top Row */}
        <Box 
          display="flex" 
          justifyContent="space-between" 
          alignItems="center" 
          mb={2}
          sx={{ flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 2, sm: 0 } }}
        >
          <Typography component="h1" variant="h4" fontWeight="bold" sx={{ fontSize: { xs: '1.75rem', sm: '2.125rem', md: '2.5rem' } }}>
            {t('schedule.title')}
          </Typography>
          
          <Box display="flex" gap={2} flexWrap="wrap">
            {/* Select Button - Same style as Customer page */}
            {!multiSelect.isSelectionMode && multiSelect.selectedCount === 0 && canEnterBulkMode && (
              <Button
                variant="outlined"
                startIcon={<CheckBoxOutlineBlankIcon />}
                onClick={() => {
                  clearFocusForInteraction();
                  setCreatorOnlySelection(!hasOwnerOverrideTaskOnPage);
                  setActiveTab(0);
                  setDateFilter('all');
                  setSearchInput('');
                  setSearchQuery('');
                  setPage(1);
                  multiSelect.enterSelectionMode();
                }}
                sx={{
                  borderRadius: 3,
                  textTransform: 'none',
                  px: 2.5,
                  py: 1.25,
                  fontWeight: 600,
                  fontSize: '0.95rem',
                }}
              >
                {t('schedule.selectTasks')}
              </Button>
            )}
            
            <Button
              startIcon={<AddIcon />}
              variant="contained"
              onClick={() => setTaskDialogOpen(true)}
              sx={{
                borderRadius: 3,
                textTransform: 'none',
                px: 2.5,
                py: 1.25,
                fontWeight: 600,
                fontSize: '0.95rem',
              }}
            >
              {t('schedule.createTask')}
            </Button>
          </Box>
        </Box>

        <ScheduleFilters
          searchInput={searchInput}
          filtersOpen={filtersOpen}
          activeFilterCount={activeFilterCount}
          dateFilter={focusDateFilter}
          sortBy={sortBy}
          assigneeId={assigneeId}
          users={users}
          loading={isLoading}
          t={t}
          onSearchInput={(value) => { if (focusTarget) clearFocusForInteraction(); setSearchInput(value); }}
          onSearch={handleSearch}
          onClearSearch={handleClearSearch}
          onRefresh={() => void refetch()}
          onToggleFilters={() => setFiltersOpen(value => !value)}
          onDateFilter={(value) => { clearFocusForInteraction(); setDateFilter(value); setPage(1); }}
          onSort={(value) => { clearFocusForInteraction(); setSortBy(value); setPage(1); }}
          onAssignee={(value) => { clearFocusForInteraction(); setAssigneeId(value); setPage(1); }}
        />

        {/* Segmented Control */}
        <Box role="tablist" aria-label={t('schedule.statusFilter')}
          sx={{
            mt: 2,
            display: 'flex',
            p: 0.5,
            background: 'action.hover',
            borderRadius: 2,
            overflowX: 'auto',
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
          }}
        >
          {tabs.map((tab) => {
            const isActive = displayedTab === tabs.indexOf(tab);
            const taskCount = scheduleMeta?.statusCounts?.[tab.key]
              ?? (tab.key === tabs[displayedTab].key ? tasksResponse?.total || 0 : 0);
            
            return (
              <Button
                key={tab.key}
                role="tab"
                aria-selected={isActive}
                onClick={() => {
                  clearFocusForInteraction();
                  setActiveTab(tabs.indexOf(tab));
                  setPage(1);
                }}
                sx={{
                  px: 2,
                  py: 1,
                  minWidth: 'fit-content',
                  borderRadius: 1.5,
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  textTransform: 'none',
                  backgroundColor: isActive ? 'primary.main' : 'transparent',
                  color: isActive ? 'primary.contrastText' : 'text.primary',
                  opacity: isActive ? 1 : 0.72,
                  transition: 'background-color .18s ease, color .18s ease',
                  '&:hover': {
                    backgroundColor: isActive ? 'primary.dark' : 'action.hover',
                  },
                  '&:active': { transform: 'scale(0.98)' },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" sx={{ lineHeight: 1, whiteSpace: 'nowrap' }}>
                    {tab.label}
                  </Typography>
                  <Box 
                    sx={{
                      px: 0.75,
                      py: 0.25,
                      borderRadius: 1,
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      minWidth: '20px',
                      textAlign: 'center',
                      background: isActive ? (isDarkMode ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.08)') : 'transparent',
                      color: isActive ? 'primary.contrastText' : 'text.secondary',
                      opacity: isActive ? 0.9 : 1,
                    }}
                  >
                    {taskCount}
                  </Box>
                </Box>
              </Button>
            );
          })}
        </Box>
      </Box>

      {multiSelect.isSelectionMode && multiSelect.selectedCount === 0 && (
        <Alert severity="info" sx={{ mb: 2, mx: { xs: 2, sm: 3, md: 4 } }} action={<Button color="inherit" onClick={exitBulkMode}>{t('common.cancel')}</Button>}>
          {t('selection.selectTasks')}
        </Alert>
      )}

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 2, mx: { xs: 2, sm: 3, md: 4 } }}>
          {t('schedule.loadError')}
        </Alert>
      )}

      {/* Task Lists */}
      <ScheduleTaskList
        tabs={tabs} displayedTab={displayedTab} groupedTasks={groupedTasks} tasksResponse={tasksResponse}
        isLoading={isLoading} page={page} currentUserId={user?.userId || 0}
        isSelectionMode={multiSelect.isSelectionMode} isSelected={multiSelect.isSelected}
        focusedTaskId={focusedTaskId} onToggleSelect={multiSelect.toggleSelect}
        onEnterSelectionMode={multiSelect.enterSelectionMode} onCreate={() => setTaskDialogOpen(true)}
        onEdit={(task) => { setEditingTask(task); setTaskDialogOpen(true); }} onDelete={handleDeleteTask}
        onComment={handleCommentTask} onMarkDone={handleMarkDone} onMarkUndone={handleMarkUndone}
        onUndo={handleUndoTask} onApprove={handleApproveTask} onReject={handleRejectTask}
        onCancel={handleCancelTask} onStartProgress={handleStartProgress} onUpdateTaskStatus={handleUpdateTaskStatus}
        onOpen={(taskId) => navigate(`/tasks/${taskId}`)} onDuplicate={setDuplicateTask}
        onPage={(nextPage) => { setPage(nextPage); window.scrollTo({ top: 0, behavior: 'smooth' }); }} t={t}
      />

      <ScheduleDialogs
        open={taskDialogOpen} editingTask={editingTask} duplicateTask={duplicateTask} users={users}
        onClose={() => { setTaskDialogOpen(false); setEditingTask(undefined); }}
        onDuplicateClose={() => setDuplicateTask(null)}
        onCreate={mutations.createTaskMutation.mutateAsync}
        onUpdate={(taskId, data) => mutations.updateTaskMutation.mutateAsync({ taskId, data })}
      />

      {/* Selection Mode - Fixed Bottom Bar (Dime-style) */}
      <SelectionModeTopBar
        selectedCount={multiSelect.selectedCount}
        totalCount={currentTabTasks.length}
        areAllSelected={multiSelect.areAllSelected(currentTabTasks)}
        onSelectAll={() => multiSelect.selectAll(currentTabTasks)}
        onDeselectAll={multiSelect.deselectAll}
        onClose={exitBulkMode}
        isVisible={multiSelect.isSelectionMode && multiSelect.selectedCount > 0}
        allowedActions={allowedBulkActions}
        onBulkAction={(action) => {
          if (action === 'delete') void handleBulkAction('delete');
          else if (action === 'start' || action === 'in_progress') void handleBulkAction('start');
          else if (action === 'done') void handleBulkAction('done');
          else if (action === 'todo') void handleBulkAction('todo');
          else if (action === 'review') void handleBulkAction('review');
          else if (action === 'cancelled') void handleBulkAction('cancel');
        }}
      />

    </Box>
  );
};

export default SchedulePage;
