import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState, useCallback } from 'react';
import { commentApi, commentReactionApi } from '../api/task.api';
import { Comment, CommentTree, CommentNode } from '../types/comment';
import { buildCommentTree, sortComments, flattenNestedComments } from '../utils/buildCommentTree';
import { 
  addCommentToTree, 
  updateReactionInTree, 
  toggleThreadCollapse,
  filterVisibleTree,
  countHiddenReplies
} from '../utils/commentOptimistic';

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
  updateReaction: (commentId: number, reactionType: 'like' | 'love' | 'laugh' | 'angry') => void;
  
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
  handleReplySubmit: (parentCommentId: number) => Promise<void>;
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
 * Enhanced comments hook with optimistic updates and thread management
 */
export function useComments({ 
  taskId, 
  enabled = true, 
  maxDepth = 3 
}: UseCommentsOptions): UseCommentsResult {
  const queryClient = useQueryClient();
  const [collapsedThreads, setCollapsedThreads] = useState<Set<number>>(new Set());
  
  // UI State Management
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyTextByCommentId, setReplyTextByCommentId] = useState<Record<number, string>>({});
  const [newCommentText, setNewCommentText] = useState('');
  const [editingComment, setEditingComment] = useState<number | null>(null);
  const [editText, setEditText] = useState('');

  const {
    data: flatComments = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['task-comments', taskId],
    queryFn: () => commentApi.getTaskComments(taskId),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Build tree from flat comments (memoized)
  const commentTree = useMemo(() => {
    if (!flatComments.length) return null;
    
    // Check if comments are nested (have replies property) or flat
    const hasNestedStructure = flatComments.some(comment => 'replies' in comment && comment.replies);
    
    if (hasNestedStructure) {
      // Flatten nested structure first, then build tree
      const flattenedComments = flattenNestedComments(flatComments);
      return buildCommentTree(sortComments(flattenedComments));
    } else {
      // Already flat, just build tree
      return buildCommentTree(sortComments(flatComments));
    }
  }, [flatComments]);

  // Filter visible tree based on collapsed threads and depth
  const visibleTree = useMemo(() => {
    if (!commentTree) return null;
    return filterVisibleTree(commentTree, collapsedThreads, maxDepth);
  }, [commentTree, collapsedThreads, maxDepth]);

  // Optimistic add comment
  const addComment = useCallback(async (comment: string, parentCommentId?: number) => {
    // Create optimistic comment
    const optimisticComment: Comment = {
      commentId: Date.now(), // Temporary ID
      taskId,
      userId: 0, // Will be updated by server
      comment,
      parentCommentId,
      createdAt: new Date().toISOString(),
      isActive: true,
      user: {
        userId: 0,
        userName: 'You',
        userLastName: '',
        userImageUrl: undefined
      },
      reactions: [],
      _count: {
        replies: 0,
        reactions: 0
      }
    };

    // Optimistic update
    queryClient.setQueryData(['task-comments', taskId], (old: Comment[] | undefined) => {
      if (!old) return [optimisticComment];
      return addCommentToTree(
        buildCommentTree(sortComments(old)), 
        optimisticComment
      ).nodes.map(n => n.comment);
    });

    try {
      // Actual API call
      await commentApi.createComment(taskId, { comment, parentCommentId });
      
      // Refetch to get server data
      await refetch();
    } catch (error) {
      // Revert on error
      await refetch();
      throw error;
    }
  }, [taskId, queryClient, refetch]);

  // Optimistic reaction update
  const updateReaction = useCallback((commentId: number, reactionType: 'like' | 'love' | 'laugh' | 'angry') => {
    // Get current tree
    const currentTree = queryClient.getQueryData(['task-comments', taskId]) as Comment[] | undefined;
    if (!currentTree) return;

    const tree = buildCommentTree(sortComments(currentTree));
    
    // Find current reaction
    const currentReaction = tree.nodes.some(node => 
      findReactionInNode(node, commentId, reactionType)
    );

    // Optimistic update
    const newReaction = currentReaction ? null : reactionType;
    const updatedTree = updateReactionInTree(tree, commentId, newReaction);
    
    if (updatedTree) {
      queryClient.setQueryData(['task-comments', taskId], updatedTree.nodes.map(n => n.comment));
    }

    // API call (fire and forget for now)
    if (newReaction) {
      commentReactionApi.createOrUpdateReaction(commentId, { reactionType });
    } else {
      commentReactionApi.removeReaction(commentId);
    }
  }, [taskId, queryClient]);

  // Toggle thread collapse
  const toggleCollapse = useCallback((commentId: number) => {
    setCollapsedThreads(prev => toggleThreadCollapse(prev, commentId));
  }, []);

  // Count hidden replies
  const hiddenReplyCount = useCallback((commentId: number) => {
    if (!commentTree) return 0;
    
    const findNode = (nodes: CommentNode[]): CommentNode | null => {
      for (const node of nodes) {
        if (node.comment.commentId === commentId) return node;
        const found = findNode(node.children);
        if (found) return found;
      }
      return null;
    };

    const node = findNode(commentTree.nodes);
    return node ? countHiddenReplies(node, collapsedThreads, maxDepth) : 0;
  }, [commentTree, collapsedThreads, maxDepth]);

  // UI Action Handlers
  const handleReply = useCallback((commentId: number) => {
    setReplyingTo(commentId);
    if (!replyTextByCommentId[commentId]) {
      setReplyTextByCommentId(prev => ({ ...prev, [commentId]: '' }));
    }
  }, [replyTextByCommentId]);

  const handleReplyTextChange = useCallback((commentId: number, text: string) => {
    setReplyTextByCommentId(prev => ({ ...prev, [commentId]: text }));
  }, []);

  const handleReplySubmit = useCallback(async (parentCommentId: number) => {
    const replyText = replyTextByCommentId[parentCommentId];
    if (replyText?.trim()) {
      try {
        await addComment(replyText, parentCommentId);
        setReplyingTo(null);
        setReplyTextByCommentId(prev => {
          const newState = { ...prev };
          delete newState[parentCommentId];
          return newState;
        });
      } catch (error) {
        console.error('Failed to submit reply:', error);
      }
    }
  }, [replyTextByCommentId, addComment]);

  const handleAddComment = useCallback(async (text: string) => {
    await addComment(text);
    setNewCommentText('');
  }, [addComment]);

  const handleEditStart = useCallback((commentId: number, text: string) => {
    setEditingComment(commentId);
    setEditText(text);
  }, []);

  const handleEditSubmit = useCallback(async (commentId: number) => {
    if (editText.trim()) {
      try {
        await commentApi.updateComment(taskId, commentId, { comment: editText });
        setEditingComment(null);
        setEditText('');
        await refetch();
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
    if (window.confirm('Are you sure you want to delete this comment?')) {
      try {
        await commentApi.deleteComment(taskId, commentId);
        await refetch();
      } catch (error) {
        console.error('Failed to delete comment:', error);
      }
    }
  }, [taskId, refetch]);

  const getReplyText = useCallback((commentId: number) => replyTextByCommentId[commentId] || '', [replyTextByCommentId]);

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
    handleAddComment,
    handleEditStart,
    handleEditSubmit,
    handleEditCancel,
    handleDeleteComment,
    
    // Setters
    setNewCommentText,
    setEditText,
    getReplyText,
  };
}

// Helper function to find reaction in node
function findReactionInNode(node: CommentNode, commentId: number, reactionType: string): boolean {
  if (node.comment.commentId === commentId) {
    return node.comment.reactions?.some(r => r.type === reactionType) || false;
  }
  return node.children.some(child => findReactionInNode(child, commentId, reactionType));
}
