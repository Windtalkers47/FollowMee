import React from 'react';
import { Box, Typography } from '@mui/material';
import { TaskImage as TaskImageType } from '../../api/task.api';

interface TaskImageCarouselProps {
  images: TaskImageType[];
  onImageClick: (imageIndex: number) => void;
  glassOpacity?: number;
  showBorders?: boolean;
  blurIntensity?: number;
  glassStyle?: 'subtle' | 'medium' | 'bold';
}

const getGrid = (count: number) => {
  if (count === 1) return { columns: '1fr', rows: 'clamp(220px, 42vw, 460px)' };
  if (count === 2) return { columns: 'repeat(2, minmax(0, 1fr))', rows: '280px' };
  return { columns: 'repeat(2, minmax(0, 1fr))', rows: 'repeat(2, 180px)' };
};

const TaskImageCarousel: React.FC<TaskImageCarouselProps> = ({ images, onImageClick }) => {
  if (!images?.length) return null;

  const visible = images.slice(0, 4);
  const remaining = images.length - visible.length;
  const grid = getGrid(visible.length);

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: grid.columns,
        gridTemplateRows: grid.rows,
        gap: 0.75,
        overflow: 'hidden',
        borderRadius: 2.5,
        bgcolor: 'background.default',
        '@media (max-width: 600px)': {
          gridTemplateRows:
            visible.length === 1
              ? 'minmax(180px, auto)'
              : visible.length === 2
                ? '180px'
                : 'repeat(2, 132px)',
        },
      }}
    >
      {visible.map((image, index) => {
        const isThreeImageLead = visible.length === 3 && index === 0;
        const isLast = index === visible.length - 1;
        return (
          <Box
            key={image.imageId || image.imageUrl}
            component="button"
            type="button"
            onClick={() => onImageClick(index)}
            aria-label={`Open task image ${index + 1} of ${images.length}`}
            sx={{
              position: 'relative',
              gridRow: isThreeImageLead ? '1 / span 2' : 'auto',
              border: 0,
              p: 0,
              minWidth: 0,
              minHeight: 0,
              overflow: 'hidden',
              cursor: 'pointer',
              bgcolor: 'action.hover',
              '&:focus-visible': {
                outline: '3px solid',
                outlineColor: 'primary.main',
                outlineOffset: -3,
              },
              '& img': { transition: 'transform .2s ease' },
              '&:hover img': { transform: 'scale(1.02)' },
            }}
          >
            <Box
              component="img"
              src={image.imageUrl}
              alt=""
              loading="lazy"
              sx={{
                width: '100%',
                height: '100%',
                maxHeight: visible.length === 1 ? 560 : 'none',
                minHeight: visible.length === 1 ? { xs: 180, sm: 240 } : 0,
                objectFit: 'cover',
                display: 'block',
              }}
            />
            {remaining > 0 && isLast && (
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: 'rgba(0,0,0,.58)',
                  color: 'common.white',
                }}
              >
                <Typography variant="h4" fontWeight={750}>+{remaining}</Typography>
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
};

export default React.memo(TaskImageCarousel);
