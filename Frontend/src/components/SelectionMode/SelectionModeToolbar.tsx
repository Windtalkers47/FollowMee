import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  Button,
  Chip,
  useTheme,
  Slide,
  Paper,
  Tooltip,
  Menu,
  MenuItem
} from '@mui/material';
import {
  Close as CloseIcon,
  CheckBox as SelectAllIcon,
  CheckBoxOutlineBlank as DeselectAllIcon,
  Delete as DeleteIcon,
  CheckCircle as DoneIcon,
  PlayArrow as StartIcon,
  MoreVert as MoreIcon,
  Cancel as CancelIcon,
  Schedule as ScheduleIcon,
  Visibility as ReviewIcon,
  Assignment as AssignIcon
} from '@mui/icons-material';

interface SelectionModeToolbarProps {
  selectedCount: number;
  totalCount: number;
  areAllSelected: boolean;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onClose: () => void;
  onBulkAction: (action: 'delete' | 'done' | 'start' | 'todo' | 'draft' | 'review' | 'cancel' | 'assign') => void;
}

export const SelectionModeToolbar: React.FC<SelectionModeToolbarProps> = ({
  selectedCount,
  totalCount: _totalCount,
  areAllSelected,
  onSelectAll,
  onDeselectAll,
  onClose,
  onBulkAction
}) => {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleActionClick = (action: 'delete' | 'done' | 'start' | 'todo' | 'draft' | 'review' | 'cancel' | 'assign') => {
    handleMenuClose();
    onBulkAction(action);
  };

  if (selectedCount === 0) {
    return null;
  }

  return (
    <>
      {/* Bottom Sheet - Mobile Only */}
      <Slide direction="up" in={selectedCount > 0} mountOnEnter unmountOnExit>
        <Paper
          elevation={24}
          sx={{
            position: 'fixed',
            bottom: 16,
            left: 16,
            right: 16,
            p: 1.5,
            borderRadius: 3,
            background: theme.palette.mode === 'dark' 
              ? 'rgba(40, 40, 42, 0.98)' 
              : 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(40px) saturate(180%)',
            border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
            zIndex: theme.zIndex.fab,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            display: { xs: 'block', md: 'none' }, // Mobile only
          }}
        >
          <Box display="flex" alignItems="center" gap={1.5}>
            {/* Close Button */}
            <IconButton
              onClick={onClose}
              sx={{
                color: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
                '&:hover': {
                  background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                }
              }}
            >
              <CloseIcon />
            </IconButton>

            {/* Count Badge */}
            <Chip
              label={selectedCount}
              size="medium"
              sx={{
                height: 36,
                fontWeight: 700,
                background: 'linear-gradient(135deg, #0A84FF 0%, #0055D4 100%)',
                color: '#fff',
                boxShadow: '0 2px 12px rgba(10, 132, 255, 0.4)',
              }}
            />

            {/* Selected Text */}
            <Typography
              variant="body1"
              fontWeight={600}
              sx={{
                flex: 1,
                color: theme.palette.mode === 'dark' ? '#fff' : '#000',
              }}
            >
              selected
            </Typography>

            {/* Select All / Deselect All - Text Button */}
            <Button
              startIcon={areAllSelected ? <DeselectAllIcon /> : <SelectAllIcon />}
              onClick={areAllSelected ? onDeselectAll : onSelectAll}
              size="small"
              sx={{
                color: areAllSelected 
                  ? theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)'
                  : theme.palette.primary.main,
                fontWeight: 600,
                textTransform: 'none',
                minWidth: 'auto',
                px: 1.5,
                '&:hover': {
                  background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                }
              }}
            >
              {areAllSelected ? 'Deselect All' : 'Select All'}
            </Button>
          </Box>

          {/* Quick Actions Row */}
          <Box display="flex" alignItems="center" gap={1} mt={1}>
            <Tooltip title="Mark as Done">
              <IconButton
                onClick={() => onBulkAction('done')}
                sx={{
                  flex: 1,
                  height: 48,
                  borderRadius: 2.5,
                  background: 'linear-gradient(135deg, #34C759 0%, #248A3D 100%)',
                  color: '#fff',
                  boxShadow: '0 2px 12px rgba(52, 199, 89, 0.4)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #30D158 0%, #34C759 100%)',
                    boxShadow: '0 4px 16px rgba(52, 199, 89, 0.5)',
                  },
                }}
              >
                <DoneIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title="Start Progress">
              <IconButton
                onClick={() => onBulkAction('start')}
                sx={{
                  flex: 1,
                  height: 48,
                  borderRadius: 2.5,
                  background: 'linear-gradient(135deg, #0A84FF 0%, #0055D4 100%)',
                  color: '#fff',
                  boxShadow: '0 2px 12px rgba(10, 132, 255, 0.4)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #007AFF 0%, #0A84FF 100%)',
                    boxShadow: '0 4px 16px rgba(10, 132, 255, 0.5)',
                  },
                }}
              >
                <StartIcon />
              </IconButton>
            </Tooltip>

            {/* More Actions Menu */}
            <Tooltip title="More Actions">
              <IconButton
                onClick={handleMenuOpen}
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2.5,
                  background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                  color: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
                  '&:hover': {
                    background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
                  }
                }}
              >
                <MoreIcon />
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
                borderRadius: 2.5,
                background: theme.palette.mode === 'dark' 
                  ? 'rgba(40, 40, 42, 0.98)' 
                  : 'rgba(255, 255, 255, 0.98)',
                backdropFilter: 'blur(40px)',
                border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
                mt: 1,
              }
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <MenuItem onClick={() => handleActionClick('review')}>
              <Box display="flex" alignItems="center" gap={1.5}>
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: 2,
                    background: '#AF52DE',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff'
                  }}
                >
                  <ReviewIcon sx={{ fontSize: 18 }} />
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 600, color: theme.palette.mode === 'dark' ? '#fff' : '#000', fontSize: '0.9375rem' }}>
                    Move to Review
                  </Typography>
                  <Typography variant="caption" sx={{ color: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>
                    Submit for review
                  </Typography>
                </Box>
              </Box>
            </MenuItem>

            <MenuItem onClick={() => handleActionClick('todo')}>
              <Box display="flex" alignItems="center" gap={1.5}>
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: 2,
                    background: '#0A84FF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff'
                  }}
                >
                  <ScheduleIcon sx={{ fontSize: 18 }} />
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 600, color: theme.palette.mode === 'dark' ? '#fff' : '#000', fontSize: '0.9375rem' }}>
                    Move to To Do
                  </Typography>
                  <Typography variant="caption" sx={{ color: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>
                    Ready to start
                  </Typography>
                </Box>
              </Box>
            </MenuItem>

            <MenuItem onClick={() => handleActionClick('cancel')}>
              <Box display="flex" alignItems="center" gap={1.5}>
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: 2,
                    background: '#FF9500',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff'
                  }}
                >
                  <CancelIcon sx={{ fontSize: 18 }} />
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 600, color: theme.palette.mode === 'dark' ? '#fff' : '#000', fontSize: '0.9375rem' }}>
                    Cancel Tasks
                  </Typography>
                  <Typography variant="caption" sx={{ color: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>
                    Move to cancelled
                  </Typography>
                </Box>
              </Box>
            </MenuItem>

            <MenuItem onClick={() => handleActionClick('assign')}>
              <Box display="flex" alignItems="center" gap={1.5}>
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: 2,
                    background: '#5856D6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff'
                  }}
                >
                  <AssignIcon sx={{ fontSize: 18 }} />
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 600, color: theme.palette.mode === 'dark' ? '#fff' : '#000', fontSize: '0.9375rem' }}>
                    Assign To...
                  </Typography>
                  <Typography variant="caption" sx={{ color: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>
                    Change assignee
                  </Typography>
                </Box>
              </Box>
            </MenuItem>

            <MenuItem 
              onClick={() => handleActionClick('delete')}
              sx={{
                borderTop: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                mt: 0.5,
                pt: 1,
                '&:hover': {
                  background: theme.palette.mode === 'dark' ? 'rgba(255, 59, 48, 0.1)' : 'rgba(255, 59, 48, 0.08)',
                }
              }}
            >
              <Box display="flex" alignItems="center" gap={1.5}>
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: 2,
                    background: '#FF3B30',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff'
                  }}
                >
                  <DeleteIcon sx={{ fontSize: 18 }} />
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 600, color: '#FF3B30', fontSize: '0.9375rem' }}>
                    Delete Tasks
                  </Typography>
                  <Typography variant="caption" sx={{ color: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>
                    Permanently remove
                  </Typography>
                </Box>
              </Box>
            </MenuItem>
          </Menu>
        </Paper>
      </Slide>
    </>
  );
};

export default SelectionModeToolbar;
