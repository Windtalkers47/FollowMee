import React from 'react';
import { CommentDataContext, CommentDataContextValue } from './CommentDataContext';

interface CommentDataProviderProps {
  children: React.ReactNode;
  value: CommentDataContextValue;
}

export const CommentDataProvider: React.FC<CommentDataProviderProps> = ({ children, value }) => {
  return (
    <CommentDataContext.Provider value={value}>
      {children}
    </CommentDataContext.Provider>
  );
};
