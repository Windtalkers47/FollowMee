import { NextFunction, Request, Response } from 'express';
import AppDataSource from '../config/database';
import { Task } from '../entities/Task';
import { TaskComment } from '../entities/TaskComment';
import { TaskImage } from '../entities/TaskImage';
import { taskAccessService } from '../services/task-access.service';

type ScopeMode = 'view' | 'manage';

const authorize = async (req: Request, res: Response, next: NextFunction, mode: ScopeMode, taskId?: string) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required' });
    const id = taskId || req.params.taskId;
    const task = id ? await AppDataSource.getRepository(Task).findOneBy({ taskId: id, isActive: true }) : null;
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    const access = await taskAccessService.context(req.user.userId);
    mode === 'manage' ? taskAccessService.assertManage(task, access) : taskAccessService.assertView(task, access);
    next();
  } catch (error) { next(error); }
};

export const requireTaskView = (req: Request, res: Response, next: NextFunction) => authorize(req, res, next, 'view');
export const requireTaskManage = async (req: Request, res: Response, next: NextFunction) => {
  const imageId = Number(req.params.imageId);
  const image = imageId ? await AppDataSource.getRepository(TaskImage).findOneBy({ imageId }) : null;
  return authorize(req, res, next, 'manage', image?.taskId);
};
export const requireCommentTaskView = async (req: Request, res: Response, next: NextFunction) => {
  const comment = await AppDataSource.getRepository(TaskComment).findOneBy({ commentId: Number(req.params.commentId) });
  return authorize(req, res, next, 'view', comment?.taskId);
};
