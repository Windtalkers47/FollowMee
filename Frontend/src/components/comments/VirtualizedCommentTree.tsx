import React, { useMemo, useCallback } from 'react';
import { Box } from '@mui/material';
import { DynamicVirtualizedCommentList } from './DynamicVirtualizedCommentList';
import ThreadedCommentNode from './ThreadedCommentNode';
import { flattenCommentTree, FlatCommentRow } from '../../utils/flattenCommentTreeForVirtualization';
import { CommentDataProvider, CommentActionProvider } from '../../contexts';
import { useComments } from '../../hooks/useComments';

interface VirtualizedCommentTreeProps {
  taskId: string;
  maxDepth?: number;
  containerHeight?: number;
}

/**
 * Virtualized Reddit-style comment tree for 10k+ comments
 * Uses the new consolidated architecture with separated contexts
 */
const VirtualizedCommentTreeComponent: React.FC<VirtualizedCommentTreeProps> = ({
  taskId,
  maxDepth = 3,
  containerHeight = 600
}) => {
  // Use the consolidated useComments hook
  const commentData = useComments({ taskId, maxDepth });
  const {
    visibleTree,
    isLoading,
    error,
    refetch,
    collapsedThreads,
    hiddenReplyCount
  } = commentData;

  // Flatten the visible tree for virtualization
  const flatRows = useMemo(() => {
    if (!visibleTree?.nodes.length) return [];
    return flattenCommentTree(visibleTree.nodes);
  }, [visibleTree]);

  // Memoize context values to prevent unnecessary re-renders
  const dataContextValue = useMemo(() => ({
    comments: commentData.comments,
    commentTree: commentData.commentTree,
    visibleTree,
    isLoading,
    error,
    refetch,
    collapsedThreads,
    hiddenReplyCount
  }), [commentData.comments, commentData.commentTree, visibleTree, isLoading, error, refetch, collapsedThreads, hiddenReplyCount]);

  const renderCommentRow = useCallback((row: FlatCommentRow) => {
  return <ThreadedCommentNode row={row} />;
}, []);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        Loading comments...
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        Error loading comments: {error.message}
      </Box>
    );
  }

  if (!visibleTree?.nodes.length) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        No comments yet. Be the first to comment!
      </Box>
    );
  }

  return (
    <CommentDataProvider value={dataContextValue}>
      <CommentActionProvider value={commentData}>
        <Box sx={{ height: containerHeight, overflow: 'hidden' }}>
          <DynamicVirtualizedCommentList
            nodes={flatRows}
            containerRef={React.useRef<HTMLDivElement>(null)}
            renderItem={renderCommentRow}
            estimateSize={() => 120}
          />
        </Box>
      </CommentActionProvider>
    </CommentDataProvider>
  );
};

VirtualizedCommentTreeComponent.displayName = 'VirtualizedCommentTree';

export default VirtualizedCommentTreeComponent;
