import type { Task, TaskLikeSummary } from '../api/task.api';
import { useAppSelector } from '../store/store';
import { getTaskPermissions, hasAnyPermission } from '../permissions/taskPermissions';
import TaskCardLiquid from './TaskCard/TaskCardLiquid';

type Reaction = 'like' | 'love' | 'laugh' | 'angry' | 'wow' | 'sad';

export interface CompletedWorkTaskCardProps {
  task: Task;
  likeSummary?: TaskLikeSummary;
  onLike?: (taskId: string, likeType: Reaction) => void;
  onUnlike?: (taskId: string) => void;
  onComment?: (taskId: string, comment: string) => void;
  onDuplicate?: (task: Task) => void;
}

export default function CompletedWorkTaskCard({ task, likeSummary, onLike, onUnlike, onComment, onDuplicate }: CompletedWorkTaskCardProps) {
  const { user } = useAppSelector(state => state.auth);
  const permissions = getTaskPermissions({ userId: user?.userId || 0, task });
  return <TaskCardLiquid
    task={task}
    likeSummary={likeSummary}
    currentUserId={user?.userId || 0}
    permissions={permissions}
    onLike={onLike}
    onUnlike={onUnlike}
    onComment={onComment}
    onDuplicate={onDuplicate}
    showActions={hasAnyPermission(permissions) || Boolean(task.workflow?.canDuplicate)}
    compact={false}
    showWorkflowActions={false}
  />;
}
