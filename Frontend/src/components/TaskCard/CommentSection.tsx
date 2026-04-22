import React from 'react';
import { Box } from '@mui/material';
import { CommentTree } from '../comments';

interface CommentSectionProps {
  taskId: string;
  showComments: boolean;
}

const CommentSection: React.FC<CommentSectionProps> = ({ taskId, showComments }) => {
  if (!showComments) return null;

  return (
    <Box sx={{ mt: 2 }}>
      <CommentTree taskId={taskId} />
    </Box>
  );
};

export default React.memo(CommentSection);
