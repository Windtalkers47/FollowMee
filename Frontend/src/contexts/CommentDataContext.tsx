import { createContext, useContext } from 'react';
import { Comment, CommentTree } from '../types/comment';

export interface CommentDataContextValue {
  // Data
  comments: Comment[];
  commentTree: CommentTree | null;
  visibleTree: CommentTree | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  
  // Thread management
  collapsedThreads: Set<number>;
  hiddenReplyCount: (commentId: number) => number;
}

export const CommentDataContext = createContext<CommentDataContextValue | null>(null);

export const useCommentDataContext = (): CommentDataContextValue => {
  const context = useContext(CommentDataContext);
  if (!context) {
    throw new Error('useCommentDataContext must be used within a CommentDataProvider');
  }
  return context;
};
