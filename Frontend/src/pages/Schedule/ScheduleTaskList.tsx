import { Box, Button, CircularProgress, Grid, Pagination, Typography } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import type { Task, TaskListResponse } from '../../api/task.api';
import ScheduleTaskCard from '../../components/ScheduleTaskCard';
import type { MessageKey } from '../../i18n/messages';

type Translator = (key: MessageKey, values?: Record<string, string | number>) => string;
type Tab = { label: string; key: 'all' | Task['status']; color: string };

const likeSummary = (task: Task) => {
  const counts = task._count;
  if (!counts) return undefined;
  return {
    like: counts.likes, love: counts.love, laugh: counts.laugh, angry: counts.angry,
    wow: counts.wow || 0, sad: counts.sad || 0,
    total: counts.likes + counts.love + counts.laugh + counts.angry + (counts.wow || 0) + (counts.sad || 0),
    userLike: counts.userLike,
  };
};

export const ScheduleTaskList = ({
  tabs, displayedTab, groupedTasks, tasksResponse, isLoading, page, currentUserId,
  isSelectionMode, isSelected, focusedTaskId, onToggleSelect, onEnterSelectionMode,
  onCreate, onEdit, onDelete, onComment, onMarkDone, onMarkUndone, onUndo, onApprove,
  onReject, onCancel, onStartProgress, onUpdateTaskStatus, onOpen, onDuplicate, onPage, t,
}: {
  tabs: Tab[]; displayedTab: number; groupedTasks: Record<Tab['key'], Task[]>; tasksResponse?: TaskListResponse;
  isLoading: boolean; page: number; currentUserId: number; isSelectionMode: boolean;
  isSelected: (taskId: string) => boolean; focusedTaskId: string | null;
  onToggleSelect: (taskId: string) => void; onEnterSelectionMode: () => void; onCreate: () => void;
  onEdit: (task: Task) => void; onDelete: (taskId: string) => void; onComment: (taskId: string, comment: string) => void;
  onMarkDone: (taskId: string) => void; onMarkUndone: (taskId: string) => void; onUndo: (taskId: string) => void;
  onApprove: (taskId: string) => void; onReject: (taskId: string) => void; onCancel: (taskId: string) => void;
  onStartProgress: (taskId: string) => void; onUpdateTaskStatus: (taskId: string, status: Task['status']) => void;
  onOpen: (taskId: string) => void; onDuplicate: (task: Task) => void; onPage: (page: number) => void; t: Translator;
}) => <>
  {tabs.map((tab, index) => (
    <div key={tab.key} role="tabpanel" hidden={displayedTab !== index}>
      {displayedTab === index && <Box sx={{ p: 2 }}>
        {isLoading ? <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box> : (
          groupedTasks[tab.key].length === 0 ? <Box textAlign="center" py={8}>
            <Typography variant="h6">{t('schedule.emptyTitle', { status: tab.label.toLowerCase() })}</Typography>
            <Typography color="text.secondary" sx={{ mt: 1, mb: 2 }}>{t('schedule.emptyText')}</Typography>
            <Button variant="contained" startIcon={<AddIcon />} onClick={onCreate}>{t('schedule.createTask')}</Button>
          </Box> : <Box sx={{ px: { xs: 2, sm: 3, md: 4 } }}>
            <Grid container spacing={{ xs: 2, sm: 3, md: 3 }}>
              {groupedTasks[tab.key].map((task) => {
                const canSelect = task.createdBy === currentUserId || Boolean(task.workflow?.canOwnerOverride);
                return <Grid size={{ xs: 12, sm: 6, md: 4, lg: 4, xl: 3 }} key={task.taskId}>
                  <ScheduleTaskCard
                    task={task} likeSummary={likeSummary(task)} currentUserId={currentUserId}
                    isSelected={isSelected(task.taskId)} onToggleSelect={canSelect ? onToggleSelect : undefined}
                    isInSelectionMode={isSelectionMode} onEnterSelectionMode={canSelect ? onEnterSelectionMode : undefined}
                    onEdit={onEdit} onDelete={onDelete} onComment={onComment} onMarkDone={onMarkDone}
                    onMarkUndone={onMarkUndone} onUndo={onUndo} onApprove={onApprove} onReject={onReject}
                    onCancel={onCancel} onStartProgress={onStartProgress} onUpdateTaskStatus={onUpdateTaskStatus}
                    onCardClick={() => onOpen(task.taskId)} onDuplicate={onDuplicate} isFocused={focusedTaskId === task.taskId}
                  />
                </Grid>;
              })}
            </Grid>
            {(tasksResponse?.totalPages || 1) > 1 && <Box display="flex" justifyContent="center" mt={3}>
              <Pagination page={page} count={tasksResponse?.totalPages || 1} onChange={(_, nextPage) => onPage(nextPage)} color="primary" />
            </Box>}
          </Box>
        )}
      </Box>}
    </div>
  ))}
</>;
