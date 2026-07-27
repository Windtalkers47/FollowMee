import { useQuery } from '@tanstack/react-query';
import { useMemo, useState, useCallback } from 'react';
import { commentApi, commentReactionApi, TaskCommentReaction } from '../api/task.api';
import { Comment, CommentTree } from '../types/comment';
import { useAppSelector } from '../store/store';
import { selectCurrentUser } from '../store/slices/authSlice';

export interface UseCommentsOptions {
  taskId: string;
  enabled?: boolean;
  maxDepth?: number;
}

export interface UseCommentsResult {
  // Data
  comments: Comment[];
  commentTree: CommentTree | null;
  visibleTree: CommentTree | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  
  // Optimistic actions
  addComment: (comment: string, parentCommentId?: number) => Promise<void>;
  updateReaction: (commentId: number, reactionType: 'like' | 'love' | 'laugh' | 'angry' | 'wow' | 'sad') => void;
  
  // Thread management
  collapsedThreads: Set<number>;
  toggleCollapse: (commentId: number) => void;
  hiddenReplyCount: (commentId: number) => number;
  
  // UI State Management
  replyingTo: number | null;
  replyTextByCommentId: Record<number, string>;
  newCommentText: string;
  editingComment: number | null;
  editText: string;
  
  // UI Actions
  handleReply: (commentId: number) => void;
  handleReplyTextChange: (commentId: number, text: string) => void;
  handleReplySubmit: (parentCommentId: number, sourceCommentId?: number) => Promise<void>;
  handleReplyCancel: () => void;
  handleAddComment: (text: string) => Promise<void>;
  handleEditStart: (commentId: number, text: string) => void;
  handleEditSubmit: (commentId: number) => Promise<void>;
  handleEditCancel: () => void;
  handleDeleteComment: (commentId: number) => Promise<void>;
  
  // Setters
  setNewCommentText: (text: string) => void;
  setEditText: (text: string) => void;
  getReplyText: (commentId: number) => string;
}

/**
 * Simplified comments hook for YouTube-style system
 */
export function useComments({ 
  taskId, 
  enabled = true, 
  maxDepth = 3 
}: UseCommentsOptions): UseCommentsResult {
  // UI State Management
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyTextByCommentId, setReplyTextByCommentId] = useState<Record<number, string>>({});
  const [newCommentText, setNewCommentText] = useState('');
  const [editingComment, setEditingComment] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [collapsedThreads, setCollapsedThreads] = useState<Set<number>>(new Set());

  // Get current user
  const currentUser = useAppSelector(selectCurrentUser);

  const {
    data: flatComments = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['task-comments', taskId],
    queryFn: () => commentApi.getTaskComments(taskId),
    enabled,
    staleTime: 15 * 1000,
    refetchOnWindowFocus: true,
  });

  // Simple tree building for nested comments from backend
  const commentTree = useMemo(() => {
    if (!flatComments.length) return null;
    
    // Backend already returns nested structure, so we need to flatten it first
    const flattenComments = (comments: Comment[]): Comment[] => {
      const result: Comment[] = [];
      
      const traverse = (items: Comment[]) => {
        items.forEach(comment => {
          result.push(comment);
          if (comment.replies && comment.replies.length > 0) {
            traverse(comment.replies);
          }
        });
      };
      
      traverse(comments);
      return result;
    };
    
    // Convert backend nested structure to frontend tree structure
    const buildTree = (comments: Comment[]): CommentTree => {
      const commentMap = new Map<number, Comment[]>();
      
      // Group comments by parent (using flattened list)
      const allComments = flattenComments(comments);
      allComments.forEach(comment => {
        const parentId = comment.parentCommentId || 0;
        if (!commentMap.has(parentId)) {
          commentMap.set(parentId, []);
        }
        commentMap.get(parentId)!.push(comment);
      });
      
      // Build tree recursively
      const buildNode = (comment: Comment): any => ({
        comment,
        children: (commentMap.get(comment.commentId) || []).map(buildNode)
      });
      
      return {
        nodes: (commentMap.get(0) || []).map(buildNode),
        totalComments: allComments.length
      };
    };
    
    return buildTree(flatComments);
  }, [flatComments]);

  // Keep a single visual reply level. The original parentCommentId remains
  // untouched for notifications and reply targeting.
  const visibleTree = useMemo(() => {
    if (!commentTree) return null;

    const collectReplies = (node: any): any[] =>
      node.children.flatMap((child: any) => [
        { ...child, children: [], level: 1, replyCount: 0 },
        ...collectReplies(child),
      ]);

    const filteredNodes = commentTree.nodes.map((root: any) => {
      const replies = collectReplies(root);
      return {
        ...root,
        level: 0,
        replyCount: replies.length,
        children: collapsedThreads.has(root.comment.commentId) ? [] : replies,
      };
    });
    
    return {
      ...commentTree,
      nodes: filteredNodes
    };
  }, [commentTree, collapsedThreads]);

  // Optimistic add comment
  const addComment = useCallback(async (comment: string, parentCommentId?: number) => {
    try {
      await commentApi.createComment(taskId, { comment, parentCommentId });
      await refetch();
    } catch (error) {
      console.error('Failed to add comment:', error);
      throw error;
    }
  }, [taskId, refetch]);

  // Optimistic reaction update
  const updateReaction = useCallback(async (commentId: number, reactionType: 'like' | 'love' | 'laugh' | 'angry' | 'wow' | 'sad') => {
    try {
      // Find the comment in the current data to check existing reaction
      const findComment = (nodes: any[]): any => {
        for (const node of nodes) {
          if (node.comment.commentId === commentId) {
            return node;
          }
          if (node.children) {
            const found = findComment(node.children);
            if (found) return found;
          }
        }
        return null;
      };

      const comment = findComment(visibleTree?.nodes || []);
      const existingReaction = comment?.comment.reactions?.find(
        (r: TaskCommentReaction) => r.userId === currentUser?.userId
      );

      if (existingReaction && existingReaction.reactionType === reactionType) {
        // User is clicking the same reaction again - remove it
        await commentReactionApi.removeReaction(commentId);
      } else {
        // User is adding a new reaction or changing reaction
        await commentReactionApi.createOrUpdateReaction(commentId, { reactionType });
      }
      
      // Refetch comments to get updated reaction counts
      await refetch();
    } catch (error) {
      console.error('Failed to update reaction:', error);
    }
  }, [refetch, visibleTree, currentUser]);

  // Toggle thread collapse
  const toggleCollapse = useCallback((commentId: number) => {
    setCollapsedThreads(prev => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
  }, []);

  // Count hidden replies
  const hiddenReplyCount = useCallback((commentId: number) => {
    if (!commentTree) return 0;

    const countDescendants = (node: any): number =>
      node.children.reduce(
        (sum: number, child: any) => sum + 1 + countDescendants(child),
        0
      );
    
    const findNode = (nodes: any[]): any => {
      for (const node of nodes) {
        if (node.comment.commentId === commentId) return node;
        const found = findNode(node.children);
        if (found) return found;
      }
      return null;
    };
    
    const node = findNode(commentTree.nodes);
    return node ? countDescendants(node) : 0;
  }, [commentTree]);

  // UI Action Handlers
  const handleReply = useCallback((commentId: number) => {
    setReplyingTo(commentId);
    if (!replyTextByCommentId[commentId]) {
      setReplyTextByCommentId(prev => ({ ...prev, [commentId]: '' }));
    }
  }, []);

  const handleReplyTextChange = useCallback((commentId: number, text: string) => {
    setReplyTextByCommentId(prev => ({ ...prev, [commentId]: text }));
  }, []);

  const handleReplySubmit = useCallback(async (parentCommentId: number, sourceCommentId?: number) => {
    const replyTextSourceId = sourceCommentId || parentCommentId;
    let replyText = replyTextByCommentId[replyTextSourceId];
    if (replyText?.trim()) {
      try {
        // If parentCommentId is 0, submit as top-level comment
        const actualParentId = parentCommentId === 0 ? undefined : parentCommentId;
        await addComment(replyText, actualParentId);
        setReplyingTo(null);
        setReplyTextByCommentId(prev => {
          const newState = { ...prev };
          delete newState[replyTextSourceId];
          return newState;
        });
      } catch (error) {
        console.error('Failed to submit reply:', error);
      }
    }
  }, [replyTextByCommentId, addComment]);

  const handleReplyCancel = useCallback(() => {
    setReplyingTo(null);
  }, []);

  const handleAddComment = useCallback(async (text: string) => {
    if (text.trim()) {
      try {
        await addComment(text);
        setNewCommentText('');
      } catch (error) {
        console.error('Failed to add comment:', error);
      }
    }
  }, [addComment]);

  const handleEditStart = useCallback((commentId: number, text: string) => {
    setEditingComment(commentId);
    setEditText(text);
  }, []);

  const handleEditSubmit = useCallback(async (commentId: number) => {
    if (editText.trim()) {
      try {
        await commentApi.updateComment(taskId, commentId, { comment: editText });
        await refetch();
        setEditingComment(null);
        setEditText('');
      } catch (error) {
        console.error('Failed to edit comment:', error);
      }
    }
  }, [editText, taskId, refetch]);

  const handleEditCancel = useCallback(() => {
    setEditingComment(null);
    setEditText('');
  }, []);

  const handleDeleteComment = useCallback(async (commentId: number) => {
    try {
      await commentApi.deleteComment(taskId, commentId);
      await refetch();
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  }, [taskId, refetch]);

  const getReplyText = useCallback((commentId: number) => {
    return replyTextByCommentId[commentId] || '';
  }, [replyTextByCommentId]);

  return {
    // Data
    comments: flatComments,
    commentTree,
    visibleTree,
    isLoading,
    error,
    refetch,
    
    // Optimistic actions
    addComment,
    updateReaction,
    
    // Thread management
    collapsedThreads,
    toggleCollapse,
    hiddenReplyCount,
    
    // UI State Management
    replyingTo,
    replyTextByCommentId,
    newCommentText,
    editingComment,
    editText,
    
    // UI Actions
    handleReply,
    handleReplyTextChange,
    handleReplySubmit,
    handleReplyCancel,
    handleAddComment,
    handleEditStart,
    handleEditSubmit,
    handleEditCancel,
    handleDeleteComment,
    
    // Setters
    setNewCommentText,
    setEditText,
    getReplyText
  };
}
