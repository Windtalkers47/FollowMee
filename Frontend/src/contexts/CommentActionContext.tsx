import { createContext, useContext } from 'react';

export interface CommentActionContextValue {
  // Optimistic actions
  addComment: (comment: string, parentCommentId?: number) => Promise<void>;
  updateReaction: (commentId: number, reactionType: 'like' | 'dislike' | 'love' | 'laugh' | 'angry') => void;
  
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

export const CommentActionContext = createContext<CommentActionContextValue | null>(null);

export const useCommentActionContext = (): CommentActionContextValue => {
  const context = useContext(CommentActionContext);
  if (!context) {
    throw new Error('useCommentActionContext must be used within a CommentActionProvider');
  }
  return context;
};
