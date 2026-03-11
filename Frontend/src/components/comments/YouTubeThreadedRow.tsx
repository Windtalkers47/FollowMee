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
        maxWidth: { xs: '100%', sm: '100%', md: 720 }, // Responsive: full on mobile, max on desktop
        pl: { xs: depth * 8, sm: depth * 12, md: depth * 16 }, // Responsive indentation
        position: 'relative'
      }}>
        <YouTubeCommentNode row={row} />
      </Box>
    </Box>
  );
};

export default YouTubeThreadedRow;
