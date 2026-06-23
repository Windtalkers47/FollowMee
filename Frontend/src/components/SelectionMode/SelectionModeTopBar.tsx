import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  Chip,
  useTheme,
  Slide,
  Tooltip,
  Menu,
  MenuItem,
  Divider,
} from '@mui/material';
import { useLiquidGlass } from '../../contexts/LiquidGlassContext';
import { gradientPresets } from '../../styles/liquidGlassStyles';
import {
  Close as CloseIcon,
  PlayArrow as StartIcon,
  CheckCircle as DoneIcon,
  MoreVert as MoreIcon,
  Schedule as ScheduleIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';

interface SelectionModeTopBarProps {
  selectedCount: number;
  totalCount: number;
  areAllSelected: boolean;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onClose: () => void;
  onBulkAction: (action: 'delete' | 'done' | 'start' | 'more') => void;
  isVisible?: boolean;
}

export const SelectionModeTopBar: React.FC<SelectionModeTopBarProps> = ({
  selectedCount,
  totalCount: _totalCount,
  areAllSelected,
  onSelectAll,
  onDeselectAll,
  onClose,
  onBulkAction,
  isVisible = true
}) => {
  const theme = useTheme();
  const { liquidGlassSettings } = useLiquidGlass();
  const preset = gradientPresets[liquidGlassSettings.gradientPreset];
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleActionClick = (action: 'delete' | 'done' | 'start' | 'more') => {
    handleMenuClose();
    onBulkAction(action);
  };

  if (selectedCount === 0) {
    return null;
  }

  return (
    <Slide direction="up" in={isVisible && selectedCount > 0} mountOnEnter unmountOnExit timeout={300}>
      <Box
        role="toolbar"
        aria-label="Selection mode toolbar"
        aria-live="polite"
        sx={{
          position: 'fixed',
          bottom: 0,
          left: { xs: 0, sm: 'var(--sidebar-width, 0px)' },
          width: { xs: '100%', sm: 'calc(100% - var(--sidebar-width, 0px))' },
          height: { xs: 100, sm: 64 },
          background: theme.palette.mode === 'dark' 
            ? 'rgba(30, 30, 30, 0.95)' 
            : 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(40px) saturate(180%)',
          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          borderTop: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
          boxShadow: '0 -4px 24px rgba(0, 0, 0, 0.12)',
          zIndex: theme.zIndex.appBar + 1,
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: 'center',
          justifyContent: { xs: 'flex-start', sm: 'space-between' },
          px: { xs: 2, sm: 3 },
          gap: { xs: 1, sm: 2 },
        }}
      >
        {/* Left Section: Status (Close + Count + Text) */}
        <Box
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 2,
            width: { xs: '100%', sm: 'auto' },
          }}
        >
          {/* Close Button */}
          <Tooltip title="Close Selection Mode">
            <IconButton
              onClick={onClose}
              aria-label="Close selection mode"
              sx={{
                width: { xs: 40, sm: 40 },
                height: { xs: 40, sm: 40 },
                borderRadius: 2.5,
                background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                color: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
                '&:hover': {
                  background: theme.palette.mode === 'dark' ? 'rgba(255,59,48,0.2)' : 'rgba(255,59,48,0.15)',
                  color: '#FF3B30',
                  transform: 'scale(1.05)',
                },
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:active': {
                  transform: 'scale(0.95)',
                },
              }}
            >
              <CloseIcon />
            </IconButton>
          </Tooltip>

          {/* Count Badge/Chip */}
          <Chip
            label={selectedCount}
            size="medium"
            aria-label={`${selectedCount} task${selectedCount !== 1 ? 's' : ''} selected`}
            sx={{
              height: 32,
              fontWeight: 700,
              fontSize: '0.9375rem',
              background: `linear-gradient(135deg, ${preset.primary}, ${preset.secondary})`,
              color: '#fff',
              boxShadow: `0 2px 8px ${preset.primary}66`,
            }}
          />

          {/* Selected Text */}
          <Typography
            variant="body2"
            fontWeight={500}
            sx={{
              color: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
              display: { xs: 'none', sm: 'block' },
            }}
          >
            Selected
          </Typography>
        </Box>

        {/* Divider (Desktop only) */}
        <Divider 
          orientation="vertical" 
          flexItem 
          sx={{ 
            display: { xs: 'none', sm: 'block' },
            height: 32,
            borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
          }} 
        />

        {/* Right Section: Actions (Start + Done + More) */}
        <Box
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: { xs: 2, sm: 1.5 },
            width: { xs: '100%', sm: 'auto' },
            justifyContent: { xs: 'stretch', sm: 'flex-start' },
          }}
        >
          {/* Start Button */}
          <Tooltip title="Start Progress">
            <IconButton
              onClick={() => onBulkAction('start')}
              aria-label="Start progress on selected tasks"
              sx={{
                width: { xs: 48, sm: 40 },
                height: { xs: 48, sm: 40 },
                borderRadius: 2.5,
                background: `linear-gradient(135deg, ${preset.primary}, ${preset.secondary})`,
                color: '#fff',
                boxShadow: `0 2px 8px ${preset.primary}66`,
                flex: { xs: 1, sm: 'none' },
                '&:hover': {
                  background: `linear-gradient(135deg, ${preset.secondary}, ${preset.primary})`,
                  boxShadow: `0 4px 12px ${preset.primary}99`,
                  transform: 'scale(1.05)',
                },
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:active': {
                  transform: 'scale(0.95)',
                },
              }}
            >
              <StartIcon fontSize={theme.breakpoints.down('sm') ? 'medium' : 'small'} />
            </IconButton>
          </Tooltip>

          {/* Done Button */}
          <Tooltip title="Mark as Done">
            <IconButton
              onClick={() => onBulkAction('done')}
              aria-label="Mark selected tasks as done"
              sx={{
                width: { xs: 48, sm: 40 },
                height: { xs: 48, sm: 40 },
                borderRadius: 2.5,
                background: 'linear-gradient(135deg, #34C759 0%, #248A3D 100%)',
                color: '#fff',
                boxShadow: '0 2px 8px rgba(52, 199, 89, 0.4)',
                flex: { xs: 1, sm: 'none' },
                '&:hover': {
                  background: 'linear-gradient(135deg, #30D158 0%, #34C759 100%)',
                  boxShadow: '0 4px 12px rgba(52, 199, 89, 0.5)',
                  transform: 'scale(1.05)',
                },
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:active': {
                  transform: 'scale(0.95)',
                },
              }}
            >
              <DoneIcon fontSize={theme.breakpoints.down('sm') ? 'medium' : 'small'} />
            </IconButton>
          </Tooltip>

          {/* More Button */}
          <Tooltip title="More Actions">
            <IconButton
              onClick={handleMenuOpen}
              aria-label="More bulk actions"
              aria-haspopup="true"
              sx={{
                width: { xs: 48, sm: 40 },
                height: { xs: 48, sm: 40 },
                borderRadius: 2.5,
                background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                color: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
                flex: { xs: 1, sm: 'none' },
                '&:hover': {
                  background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
                  transform: 'scale(1.05)',
                },
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:active': {
                  transform: 'scale(0.95)',
                },
              }}
            >
              <MoreIcon fontSize={theme.breakpoints.down('sm') ? 'medium' : 'small'} />
            </IconButton>
          </Tooltip>
        </Box>

        {/* More Actions Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          PaperProps={{
            sx: {
              borderRadius: 3,
              background: theme.palette.mode === 'dark' 
                ? 'rgba(30, 30, 30, 0.98)' 
                : 'rgba(255, 255, 255, 0.98)',
              backdropFilter: 'blur(40px)',
              WebkitBackdropFilter: 'blur(40px)',
              border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
              boxShadow: '0 16px 48px rgba(0, 0, 0, 0.15)',
              mt: 1,
              overflow: 'visible',
            }
          }}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <MenuItem 
            onClick={() => handleActionClick('delete')}
            sx={{
              py: 1.5,
              px: 2,
              gap: 2,
              '&:hover': {
                background: theme.palette.mode === 'dark' ? 'rgba(255, 59, 48, 0.1)' : 'rgba(255, 59, 48, 0.08)',
              },
            }}
          >
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 2.5,
                background: `linear-gradient(135deg, #ef4444 0%, #dc2626 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)',
              }}
            >
              <DeleteIcon sx={{ fontSize: 20 }} />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 600, color: '#FF3B30', fontSize: '0.9375rem' }}>
                Delete Tasks
              </Typography>
              <Typography variant="caption" sx={{ color: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>
                Permanently remove
              </Typography>
            </Box>
          </MenuItem>

          <MenuItem 
            onClick={() => handleActionClick('more')}
            sx={{
              py: 1.5,
              px: 2,
              gap: 2,
              borderTop: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'}`,
              mt: 0.5,
              '&:hover': {
                background: theme.palette.mode === 'dark' ? 'rgba(10, 132, 255, 0.1)' : 'rgba(10, 132, 255, 0.08)',
              },
            }}
          >
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 2.5,
                background: `linear-gradient(135deg, ${preset.primary}, ${preset.secondary})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: `0 2px 8px ${preset.primary}66`,
              }}
            >
              <ScheduleIcon sx={{ fontSize: 20 }} />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 600, color: theme.palette.mode === 'dark' ? '#fff' : '#000', fontSize: '0.9375rem' }}>
                Move to...
              </Typography>
              <Typography variant="caption" sx={{ color: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>
                Change status
              </Typography>
            </Box>
          </MenuItem>
        </Menu>
      </Box>
    </Slide>
  );
};

export default SelectionModeTopBar;