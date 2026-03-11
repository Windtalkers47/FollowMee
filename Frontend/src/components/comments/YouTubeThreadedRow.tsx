import React from 'react';
import { Box } from '@mui/material';
import { FlatCommentRow } from '../../utils/flattenCommentTreeForVirtualization';
import YouTubeCommentNode from './YouTubeCommentNode';

interface YouTubeThreadedRowProps {
  row: FlatCommentRow;
}

/**
 * YouTube-style threaded comment row with continuous lines
 * 
 * This component handles the visual threading by rendering:
 * 1. Parent thread lines that continue through this row
 * 2. Current depth connector line
 * 3. Proper indentation for the comment itself
 */
const YouTubeThreadedRow: React.FC<YouTubeThreadedRowProps> = ({ row }) => {
  const { depth, isLastChild, parentPath } = row;

  return (
    <Box 
      sx={{ 
        position: 'relative',
        display: 'flex',
        alignItems: 'flex-start'
      }}
    >
      {/* Thread line container */}
      <Box sx={{ 
        position: 'relative', 
        display: 'flex',
        width: depth * 24 + 24 // 24px per depth level
      }}>
        {/* Parent thread lines that continue through this comment */}
        {parentPath.map((_, index) => (
          <Box
            key={`parent-line-${index}`}
            sx={{
              position: 'absolute',
              left: index * 24 + 12, // Center of 24px column
              top: 0,
              bottom: 0,
              width: '1px',
              backgroundColor: 'rgba(0, 0, 0, 0.15)',
              zIndex: 0
            }}
          />
        ))}

        {/* Current depth connector */}
        {depth > 0 && (
          <>
            {/* Vertical line for current depth */}
            <Box
              sx={{
                position: 'absolute',
                left: (depth - 1) * 24 + 12, // Center of parent column
                top: 0,
                height: isLastChild ? 24 : '100%', // Stop at avatar for last child
                width: '1px',
                backgroundColor: 'rgba(0, 0, 0, 0.15)',
                zIndex: 0
              }}
            />
            
            {/* Horizontal connector to comment */}
            <Box
              sx={{
                position: 'absolute',
                left: (depth - 1) * 24 + 12, // Start from vertical line
                top: 24, // Align with avatar center
                width: 12, // Extend to comment area
                height: '1px',
                backgroundColor: 'rgba(0, 0, 0, 0.15)',
                zIndex: 0
              }}
            />
          </>
        )}
      </Box>

      {/* Comment with proper indentation */}
      <Box sx={{ 
        flex: 1, 
        minWidth: 0,
        maxWidth: 720, // Like YouTube comments
        pl: depth * 24 + 8, // Indent based on depth
        position: 'relative',
        zIndex: 1
      }}>
        <YouTubeCommentNode row={row} />
      </Box>
    </Box>
  );
};

export default YouTubeThreadedRow;
