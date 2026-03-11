import React from 'react';
import { Box } from '@mui/material';
import { FlatCommentRow } from '../../utils/flattenCommentTreeForVirtualization';
import ThreadedCommentNode from './ThreadedCommentNode';

interface ThreadedCommentRowProps {
  row: FlatCommentRow;
  isLastInThread?: boolean;
}

/**
 * ThreadedCommentRow - Implements proper Reddit/YouTube style continuous thread lines
 * 
 * Architecture:
 * ┌─────────────────────────────────────────────────────────┐
 * │ ThreadColumn | CommentCard                           │
 * │ (continuous  │                                      │
 * │  line)      │                                      │
 * │             │                                      │
 * │             │                                      │
 * └─────────────────────────────────────────────────────────┘
 * 
 * Key: ThreadColumn owns the full height line, not individual comments
 */
export const ThreadedCommentRow: React.FC<ThreadedCommentRowProps> = ({ 
  row, 
  isLastInThread = false 
}) => {
  const { comment, depth, isLastChild, parentPath } = row;

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        position: 'relative',
        mb: 0.5, // Reduced margin for tighter spacing
        minHeight: 'auto'
      }}
    >
      {/* Thread Columns - One per depth level */}
      <Box sx={{ display: 'flex', position: 'relative' }}>
        {parentPath.map((showLine: boolean, columnIndex: number) => (
          <Box
            key={`thread-col-${columnIndex}`}
            sx={{
              width: 20,
              position: 'relative',
              flexShrink: 0,
              display: 'flex',
              justifyContent: 'center'
            }}
          >
            {showLine && (
              <Box
                sx={{
                  width: '1px',
                  height: '100%',
                  backgroundColor: 'rgba(0, 0, 0, 0.08)',
                  position: 'absolute',
                  left: '50%',
                  top: 0,
                  bottom: 0, // Span full height for continuity
                  transform: 'translateX(-50%)'
                }}
              />
            )}
          </Box>
        ))}

        {/* Current depth column */}
        <Box
          sx={{
            width: 20,
            position: 'relative',
            flexShrink: 0,
            display: 'flex',
            justifyContent: 'center'
          }}
        >
          {depth > 0 && (
            <>
              {/* Vertical line for current depth */}
              <Box
                sx={{
                  width: '1px',
                  height: isLastChild ? '20px' : '100%', // Stop at avatar height for last child
                  backgroundColor: 'rgba(0, 0, 0, 0.08)',
                  position: 'absolute',
                  left: '50%',
                  top: 0,
                  transform: 'translateX(-50%)'
                }}
              />
              
              {/* Horizontal connector to comment */}
              <Box
                sx={{
                  width: '8px',
                  height: '1px',
                  backgroundColor: 'rgba(0, 0, 0, 0.08)',
                  position: 'absolute',
                  left: '50%',
                  top: '20px', // Align with comment avatar
                  transform: 'translateX(-50%)'
                }}
              />
            </>
          )}
        </Box>
      </Box>

      {/* Comment Card */}
      <Box sx={{ flex: 1, minWidth: 0, pl: 1 }}>
        <ThreadedCommentNode row={row} />
      </Box>
    </Box>
  );
};

export default ThreadedCommentRow;
