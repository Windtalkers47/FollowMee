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
  const { depth } = row;

  return (
    <Box sx={{ position: 'relative' }}>
      {/* Comment with simple indentation only */}
      <Box sx={{ 
        flex: 1, 
        minWidth: 0,
        maxWidth: { xs: '100%', md: 820 },
        pl: depth > 0 ? { xs: 2.5, sm: 5 } : 0,
        ml: depth > 0 ? { xs: 2, sm: 3 } : 0,
        borderLeft: depth > 0 ? '2px solid' : 'none',
        borderColor: depth > 0 ? 'divider' : 'transparent',
        position: 'relative'
      }}>
        <YouTubeCommentNode row={row} />
      </Box>
    </Box>
  );
};

export default YouTubeThreadedRow;
