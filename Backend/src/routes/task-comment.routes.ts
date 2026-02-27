import { Router } from 'express';
import { TaskCommentController } from '../controllers/task-comment.controller';
import { TaskCommentService } from '../services/task-comment.service';
import { authenticateToken } from '../middleware/auth.middleware';
import AppDataSource from '../config/database';

const router = Router({ mergeParams: true });

// Initialize dependencies
const taskCommentService = new TaskCommentService(
  AppDataSource.getRepository('TaskComment'),
  AppDataSource.getRepository('Task')
);
const taskCommentController = new TaskCommentController(taskCommentService);

// All comment routes require authentication
router.use(authenticateToken);

// Create a comment on a task
router.post('/', (req, res, next) => taskCommentController.createComment(req, res, next));

// Get all comments for a task
router.get('/', (req, res, next) => taskCommentController.getTaskComments(req, res, next));

// Update a comment
router.put('/:commentId', (req, res, next) => taskCommentController.updateComment(req, res, next));

// Delete a comment
router.delete('/:commentId', (req, res, next) => taskCommentController.deleteComment(req, res, next));

export default router;
