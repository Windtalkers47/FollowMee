import React from 'react';
import { CommentActionContext } from './CommentActionContext';
import { UseCommentsResult } from '../hooks/useComments';

interface CommentActionProviderProps {
  children: React.ReactNode;
  value: UseCommentsResult;
}

export const CommentActionProvider: React.FC<CommentActionProviderProps> = ({ children, value }) => {
  return (
    <CommentActionContext.Provider value={value}>
      {children}
    </CommentActionContext.Provider>
  );
};
