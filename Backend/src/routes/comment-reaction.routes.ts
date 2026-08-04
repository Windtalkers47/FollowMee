import { Router } from 'express';
import { CommentReactionController } from '../controllers/comment-reaction.controller';
import { CommentReactionService } from '../services/comment-reaction.service';
import { TaskCommentService } from '../services/task-comment.service';
import { authenticateToken } from '../middleware/auth.middleware';
import multer from 'multer';
import { requireCommentTaskView } from '../middleware/task-scope.middleware';

const router = Router();

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

// Initialize dependencies - using new repository-based services
const commentReactionService = new CommentReactionService();
const taskCommentService = new TaskCommentService();
const commentReactionController = new CommentReactionController(
  commentReactionService,
  taskCommentService
);

// All comment reaction routes require authentication
router.use(authenticateToken);

// Create or update a reaction on a comment
router.post('/:commentId/reactions', requireCommentTaskView, (req, res, next) =>
  commentReactionController.createOrUpdateReaction(req, res, next)
);

// Remove reaction from a comment
router.delete('/:commentId/reactions', requireCommentTaskView, (req, res, next) =>
  commentReactionController.removeReaction(req, res, next)
);

// Get all reactions for a comment
router.get('/:commentId/reactions', requireCommentTaskView, (req, res, next) =>
  commentReactionController.getCommentReactions(req, res, next)
);

// Upload image for comment
router.post('/upload-image', upload.single('image'), (req, res, next) => 
  commentReactionController.uploadCommentImage(req, res, next)
);

export default router;
