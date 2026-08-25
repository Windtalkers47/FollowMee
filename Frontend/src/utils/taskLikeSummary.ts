import type { Task, TaskLikeSummary } from '../api/task.api';

export function getEmbeddedLikeSummary(task: Task): TaskLikeSummary | undefined {
  if (!task._count) return undefined;
  const summary = {
    like: task._count.likes || 0,
    love: task._count.love || 0,
    laugh: task._count.laugh || 0,
    angry: task._count.angry || 0,
    wow: task._count.wow || 0,
    sad: task._count.sad || 0,
    userLike: task._count.userLike,
  };
  return { ...summary, total: summary.like + summary.love + summary.laugh + summary.angry + summary.wow + summary.sad };
}
