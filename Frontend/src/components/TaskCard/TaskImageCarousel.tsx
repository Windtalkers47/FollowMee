import React, { useState } from 'react';
import { Box, Typography, Stack } from '@mui/material';
import { TaskImage as TaskImageType } from '../../api/task.api';
import { useTheme } from '@mui/material';

interface TaskImageCarouselProps {
  images: TaskImageType[];
  onImageClick: (imageIndex: number) => void;
  // Liquid Glass UI Controls
  glassOpacity?: number;
  showBorders?: boolean;
  blurIntensity?: number;
  glassStyle?: 'subtle' | 'medium' | 'bold';
}

const TaskImageCarousel: React.FC<TaskImageCarouselProps> = ({
  images,
  onImageClick,
  glassOpacity = 0.7,
  showBorders = true,
  blurIntensity = 20,
  glassStyle = 'medium',
}) => {
  const theme = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);

  // Liquid Glass UI Style Presets
  const glassPresets = {
    subtle: { opacity: 0.5, blur: 12, borderOpacity: 0.2 },
    medium: { opacity: 0.7, blur: 20, borderOpacity: 0.3 },
    bold: { opacity: 0.85, blur: 30, borderOpacity: 0.5 }
  };

  const currentPreset = glassPresets[glassStyle];
  const finalOpacity = glassOpacity || currentPreset.opacity;
  const finalBlur = blurIntensity || currentPreset.blur;
  const finalBorderOpacity = showBorders ? (glassOpacity || currentPreset.borderOpacity) : 0;

  const enableBlur = true;
  const backdropFilterValue = enableBlur ? `blur(${finalBlur}px) saturate(180%)` : 'none';

  const hasMultipleImages = images.length > 1;

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const handleThumbnailClick = (index: number) => {
    setCurrentIndex(index);
  };

  if (!images || images.length === 0) return null;

  const currentImage = images[currentIndex];

  return (
    <Box sx={{ position: 'relative' }}>
      {/* Main Image Container */}
      <Box
        sx={{
          position: 'relative',
          cursor: 'pointer',
          borderRadius: 3,
          overflow: 'hidden',
          background: theme.palette.mode === 'dark' 
            ? `rgba(255, 255, 255, ${finalOpacity * 0.12})`
            : `rgba(255, 255, 255, ${finalOpacity})`,
          backdropFilter: backdropFilterValue,
          WebkitBackdropFilter: backdropFilterValue,
          border: showBorders ? `1px solid ${theme.palette.mode === 'dark' 
            ? `rgba(255, 255, 255, ${finalBorderOpacity * 0.15})` 
            : `rgba(255, 255, 255, ${finalBorderOpacity * 0.3})`}` : 'none',
          '&:hover .carousel-overlay': {
            opacity: 1,
          },
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        onClick={() => onImageClick(currentIndex)}
      >
        <Box
          component="img"
          src={currentImage.imageUrl}
          alt={`Task image ${currentIndex + 1}`}
          sx={{
            width: '100%',
            height: 200,
            objectFit: 'cover',
            display: 'block',
          }}
        />

        {/* Navigation Arrows (shown on hover for multi-image) */}
        {hasMultipleImages && (
          <>
            {/* Previous Arrow */}
            <Box
              className="carousel-overlay"
              onClick={(e) => {
                e.stopPropagation();
                handlePrevious();
              }}
              sx={{
                position: 'absolute',
                top: '50%',
                left: 8,
                transform: 'translateY(-50%)',
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: `rgba(0, 0, 0, 0.5)`,
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                opacity: 0,
                transition: 'opacity 0.3s ease',
                '&:hover': {
                  background: `rgba(0, 0, 0, 0.7)`,
                },
              }}
            >
              <Typography sx={{ color: 'white', fontSize: '18px', fontWeight: 'bold' }}>‹</Typography>
            </Box>

            {/* Next Arrow */}
            <Box
              className="carousel-overlay"
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              sx={{
                position: 'absolute',
                top: '50%',
                right: 8,
                transform: 'translateY(-50%)',
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: `rgba(0, 0, 0, 0.5)`,
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                opacity: 0,
                transition: 'opacity 0.3s ease',
                '&:hover': {
                  background: `rgba(0, 0, 0, 0.7)`,
                },
              }}
            >
              <Typography sx={{ color: 'white', fontSize: '18px', fontWeight: 'bold' }}>›</Typography>
            </Box>

            {/* Image Counter */}
            <Box
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                padding: '4px 10px',
                borderRadius: 12,
                background: `rgba(0, 0, 0, 0.6)`,
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                color: 'white',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              {currentIndex + 1} / {images.length}
            </Box>
          </>
        )}

        {/* View Overlay */}
        <Box
          className="carousel-overlay"
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(to top, rgba(0, 0, 0, 0.7), transparent)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0,
            transition: 'opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <Typography 
            color="white" 
            variant="caption" 
            fontWeight="600"
            sx={{
              background: 'rgba(0, 0, 0, 0.6)',
              padding: '6px 16px',
              borderRadius: 16,
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }}
          >
            View Full Image
          </Typography>
        </Box>
      </Box>

      {/* Thumbnail Strip */}
      {hasMultipleImages && (
        <Stack
          direction="row"
          spacing={1}
          sx={{
            mt: 1,
            px: 0.5,
            overflowX: 'auto',
            '&::-webkit-scrollbar': {
              height: 4,
            },
            '&::-webkit-scrollbar-track': {
              background: theme.palette.mode === 'dark' 
                ? `rgba(255, 255, 255, 0.05)` 
                : `rgba(0, 0, 0, 0.05)`,
              borderRadius: 2,
            },
            '&::-webkit-scrollbar-thumb': {
              background: theme.palette.mode === 'dark' 
                ? `rgba(255, 255, 255, 0.2)` 
                : `rgba(0, 0, 0, 0.2)`,
              borderRadius: 2,
            },
          }}
        >
          {images.map((image, index) => (
            <Box
              key={image.imageId || index}
              onClick={() => handleThumbnailClick(index)}
              sx={{
                flex: '0 0 auto',
                width: 60,
                height: 60,
                borderRadius: 2,
                overflow: 'hidden',
                cursor: 'pointer',
                border: index === currentIndex 
                  ? `2px solid ${theme.palette.mode === 'dark' ? '#fff' : '#333'}`
                  : `1px solid ${theme.palette.mode === 'dark' 
                    ? `rgba(255, 255, 255, 0.2)` 
                    : `rgba(0, 0, 0, 0.1)`}`,
                transition: 'all 0.2s ease',
                '&:hover': {
                  transform: 'scale(1.05)',
                  borderColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.3)',
                },
              }}
            >
              <Box
                component="img"
                src={image.imageUrl}
                alt={`Thumbnail ${index + 1}`}
                sx={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  );
};

export default React.memo(TaskImageCarousel);