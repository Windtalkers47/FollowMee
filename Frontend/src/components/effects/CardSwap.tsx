import { useState, useEffect } from 'react';
import { Box, BoxProps, Typography, Card, CardContent, IconButton } from '@mui/material';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';

interface CardSwapProps extends BoxProps {
  items: Array<{
    id: string | number;
    title: string;
    content: React.ReactNode;
    color?: string;
  }>;
  autoRotate?: boolean;
  rotateInterval?: number;
}

const CardSwap = ({
  items,
  autoRotate = true,
  rotateInterval = 5000,
  ...props
}: CardSwapProps) => {
  const [activeIndex, setActiveIndex] = useState(0);
  
  const nextCard = () => {
    setActiveIndex((prev) => (prev + 1) % items.length);
  };
  
  const prevCard = () => {
    setActiveIndex((prev) => (prev - 1 + items.length) % items.length);
  };

  useEffect(() => {
    if (!autoRotate) return;
    
    const interval = setInterval(() => {
      nextCard();
    }, rotateInterval);
    
    return () => clearInterval(interval);
  }, [autoRotate, rotateInterval, items.length]);
  
  if (items.length === 0) return null;
  
  const activeItem = items[activeIndex];
  const nextItem = items[(activeIndex + 1) % items.length];
  
  return (
    <Box
      {...props}
      sx={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        borderRadius: 2,
        ...props.sx,
      }}
    >
      {/* Main Card */}
      <Card
        sx={{
          width: '100%',
          height: '100%',
          position: 'relative',
          zIndex: 2,
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
          transition: 'all 0.5s ease',
          transform: 'translateY(0)',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 12px 40px 0 rgba(31, 38, 135, 0.25)',
          },
        }}
      >
        <CardContent
          sx={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            padding: 3,
          }}
        >
          <Typography
            variant="h6"
            component="div"
            sx={{
              color: activeItem.color || 'primary.main',
              marginBottom: 2,
              fontWeight: 600,
            }}
          >
            {activeItem.title}
          </Typography>
          
          <Box sx={{ flexGrow: 1 }}>
            {activeItem.content}
          </Box>
          
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mt: 2,
            }}
          >
            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                prevCard();
              }}
              size="small"
              sx={{
                background: 'rgba(0, 0, 0, 0.05)',
                '&:hover': {
                  background: 'rgba(0, 0, 0, 0.1)',
                },
              }}
            >
              <ChevronLeft />
            </IconButton>
            
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              {items.map((_, index) => (
                <Box
                  key={index}
                  onClick={() => setActiveIndex(index)}
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: index === activeIndex ? 'primary.main' : 'action.disabled',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    '&:hover': {
                      bgcolor: index === activeIndex ? 'primary.dark' : 'action.hover',
                    },
                  }}
                />
              ))}
            </Box>
            
            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                nextCard();
              }}
              size="small"
              sx={{
                background: 'rgba(0, 0, 0, 0.05)',
                '&:hover': {
                  background: 'rgba(0, 0, 0, 0.1)',
                },
              }}
            >
              <ChevronRight />
            </IconButton>
          </Box>
        </CardContent>
      </Card>
      
      {/* Next Card (for subtle peek effect) */}
      {items.length > 1 && (
        <Card
          sx={{
            position: 'absolute',
            top: 16,
            right: -16,
            width: 'calc(100% - 32px)',
            height: '100%',
            zIndex: 1,
            opacity: 0.7,
            background: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(5px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
          }}
        >
          <CardContent sx={{ height: '100%', padding: 3, pt: 4 }}>
            <Typography
              variant="subtitle2"
              sx={{
                color: 'text.secondary',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {nextItem.title}
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default CardSwap;
