import { Router } from 'express';
import { TaskLikeController } from '../controllers/task-like.controller';
import { TaskLikeService } from '../services/task-like.service';
import { authenticateToken } from '../middleware/auth.middleware';
import AppDataSource from '../config/database';
import { requireTaskView } from '../middleware/task-scope.middleware';

const router = Router({ mergeParams: true });

// Initialize dependencies
const taskLikeService = new TaskLikeService();
const taskLikeController = new TaskLikeController(taskLikeService);

// All like routes require authentication
router.use(authenticateToken);
router.use(requireTaskView);

// Create or update a like on a task
router.post('/', (req, res, next) => taskLikeController.createOrUpdateLike(req, res, next));

// Remove like from a task
router.delete('/', (req, res, next) => taskLikeController.removeLike(req, res, next));

// Get all likes for a task
router.get('/', (req, res, next) => taskLikeController.getTaskLikes(req, res, next));

// Get like summary for a task
router.get('/summary', (req, res, next) => taskLikeController.getTaskLikeSummary(req, res, next));

// Get current user's like on a task
router.get('/my-like', (req, res, next) => taskLikeController.getMyLikeOnTask(req, res, next));

export default router;
