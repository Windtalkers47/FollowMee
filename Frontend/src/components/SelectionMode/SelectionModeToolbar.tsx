import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  Button,
  Chip,
  useTheme,
  useMediaQuery,
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
  Assignment as AssignIcon,
  MoreVert as MoreIcon,
  Cancel as CancelIcon,
  Drafts as DraftIcon,
  Schedule as ScheduleIcon,
  Visibility as ReviewIcon
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
  totalCount,
  areAllSelected,
  onSelectAll,
  onDeselectAll,
  onClose,
  onBulkAction
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
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
      {/* Toolbar */}
      <Slide direction="up" in={selectedCount > 0} mountOnEnter unmountOnExit>
        <Paper
          elevation={24}
          sx={{
            position: 'fixed',
            bottom: isMobile ? 16 : 24,
            left: '50%',
            transform: 'translateX(-50%)',
            width: isMobile ? 'calc(100% - 32px)' : 'auto',
            minWidth: isMobile ? 'auto' : 480,
            maxWidth: isMobile ? 'auto' : 600,
            p: 1,
            borderRadius: 3,
            background: theme.palette.mode === 'dark' 
              ? 'rgba(40, 40, 42, 0.95)' 
              : 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(40px) saturate(180%)',
            border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
            zIndex: theme.zIndex.fab,
            boxShadow: isMobile 
              ? '0 8px 32px rgba(0, 0, 0, 0.3)' 
              : '0 12px 48px rgba(0, 0, 0, 0.2)',
          }}
        >
          <Box display="flex" alignItems="center" gap={1}>
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
              size="small"
              sx={{
                height: 32,
                fontWeight: 700,
                background: theme.palette.primary.main,
                color: '#fff',
              }}
            />

            {/* Selected Text */}
            <Typography
              variant="body2"
              fontWeight={500}
              sx={{
                flex: 1,
                color: theme.palette.mode === 'dark' ? '#fff' : '#000',
              }}
            >
              selected
            </Typography>

            {/* Select All / Deselect All */}
            <Tooltip title={areAllSelected ? 'Deselect All' : 'Select All'}>
              <IconButton
                onClick={areAllSelected ? onDeselectAll : onSelectAll}
                sx={{
                  color: areAllSelected 
                    ? theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)'
                    : theme.palette.primary.main,
                  '&:hover': {
                    background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                  }
                }}
              >
                {areAllSelected ? <DeselectAllIcon /> : <SelectAllIcon />}
              </IconButton>
            </Tooltip>

            {/* Quick Actions (Desktop) */}
            {!isMobile && (
              <>
                <Tooltip title="Mark as Done">
                  <IconButton
                    onClick={() => onBulkAction('done')}
                    sx={{
                      color: '#34C759',
                      '&:hover': {
                        background: 'rgba(52, 199, 89, 0.1)',
                      }
                    }}
                  >
                    <DoneIcon />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Start Progress">
                  <IconButton
                    onClick={() => onBulkAction('start')}
                    sx={{
                      color: '#0A84FF',
                      '&:hover': {
                        background: 'rgba(10, 132, 255, 0.1)',
                      }
                    }}
                  >
                    <StartIcon />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Move to Review">
                  <IconButton
                    onClick={() => onBulkAction('review')}
                    sx={{
                      color: '#AF52DE',
                      '&:hover': {
                        background: 'rgba(175, 82, 222, 0.1)',
                      }
                    }}
                  >
                    <ReviewIcon />
                  </IconButton>
                </Tooltip>
              </>
            )}

            {/* More Actions Menu */}
            <Tooltip title="More Actions">
              <IconButton
                onClick={handleMenuOpen}
                sx={{
                  color: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
                  '&:hover': {
                    background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
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
            <MenuItem onClick={() => handleActionClick('todo')}>
              <Box display="flex" alignItems="center" gap={1.5}>
                <Box
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: 1.5,
                    background: '#0A84FF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff'
                  }}
                >
                  <ScheduleIcon sx={{ fontSize: 16 }} />
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 500, color: theme.palette.mode === 'dark' ? '#fff' : '#000' }}>
                    Move to To Do
                  </Typography>
                  <Typography variant="caption" sx={{ color: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>
                    Ready to start
                  </Typography>
                </Box>
              </Box>
            </MenuItem>

            <MenuItem onClick={() => handleActionClick('draft')}>
              <Box display="flex" alignItems="center" gap={1.5}>
                <Box
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: 1.5,
                    background: '#8E8E93',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff'
                  }}
                >
                  <DraftIcon sx={{ fontSize: 16 }} />
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 500, color: theme.palette.mode === 'dark' ? '#fff' : '#000' }}>
                    Move to Draft
                  </Typography>
                  <Typography variant="caption" sx={{ color: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>
                    Work in progress
                  </Typography>
                </Box>
              </Box>
            </MenuItem>

            <MenuItem onClick={() => handleActionClick('cancel')}>
              <Box display="flex" alignItems="center" gap={1.5}>
                <Box
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: 1.5,
                    background: '#FF9500',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff'
                  }}
                >
                  <CancelIcon sx={{ fontSize: 16 }} />
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 500, color: theme.palette.mode === 'dark' ? '#fff' : '#000' }}>
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
                    width: 28,
                    height: 28,
                    borderRadius: 1.5,
                    background: '#5856D6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff'
                  }}
                >
                  <AssignIcon sx={{ fontSize: 16 }} />
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 500, color: theme.palette.mode === 'dark' ? '#fff' : '#000' }}>
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
                '&:hover': {
                  background: theme.palette.mode === 'dark' ? 'rgba(255, 59, 48, 0.1)' : 'rgba(255, 59, 48, 0.08)',
                }
              }}
            >
              <Box display="flex" alignItems="center" gap={1.5}>
                <Box
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: 1.5,
                    background: '#FF3B30',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff'
                  }}
                >
                  <DeleteIcon sx={{ fontSize: 16 }} />
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 500, color: '#FF3B30' }}>
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