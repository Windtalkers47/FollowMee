import { Router } from 'express';
import { TaskCommentController } from '../controllers/task-comment.controller';
import { TaskCommentService } from '../services/task-comment.service';
import { authenticateToken } from '../middleware/auth.middleware';
import multer from 'multer';
import { requireTaskView } from '../middleware/task-scope.middleware';

const router = Router({ mergeParams: true });

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Initialize dependencies - using new service with no constructor arguments
const taskCommentService = new TaskCommentService();
const taskCommentController = new TaskCommentController(taskCommentService);

// All comment routes require authentication
router.use(authenticateToken);
router.use(requireTaskView);

// Create a comment on a task
router.post('/', (req, res, next) => taskCommentController.createComment(req, res, next));

// Get all comments for a task
router.get('/', (req, res, next) => taskCommentController.getTaskComments(req, res, next));

// Update a comment
router.put('/:commentId', (req, res, next) => taskCommentController.updateComment(req, res, next));

// Delete a comment
router.delete('/:commentId', (req, res, next) => taskCommentController.deleteComment(req, res, next));

export default router;
