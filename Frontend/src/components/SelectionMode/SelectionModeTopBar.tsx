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
  Button,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Close as CloseIcon,
  PlayArrow as StartIcon,
  CheckCircle as DoneIcon,
  MoreVert as MoreIcon,
  Schedule as ScheduleIcon,
  Delete as DeleteIcon,
  CheckBoxOutlineBlank as SelectAllIcon,
  CheckBox as UnselectAllIcon,
} from '@mui/icons-material';
import { taskStatusTokens } from '../../styles/designTokens';

interface SelectionModeTopBarProps {
  selectedCount: number;
  totalCount: number;
  areAllSelected: boolean;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onClose: () => void;
  onBulkAction: (action: 'delete' | 'done' | 'start' | 'more' | 'draft' | 'todo' | 'in_progress' | 'review' | 'cancelled') => void;
  isVisible?: boolean;
  allowedActions?: Array<'delete' | 'done' | 'start' | 'todo' | 'in_progress' | 'review' | 'cancelled'>;
}

export const SelectionModeTopBar: React.FC<SelectionModeTopBarProps> = ({
  selectedCount,
  totalCount,
  areAllSelected,
  onSelectAll,
  onDeselectAll,
  onClose,
  onBulkAction,
  isVisible = true,
  allowedActions,
}) => {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [moveDialogOpen, setMoveDialogOpen] = React.useState(false);
  const [selectedStatus, setSelectedStatus] = React.useState<'todo' | 'in_progress' | 'review' | 'done' | 'cancelled' | null>(null);

  const isAllowed = (action: 'delete' | 'done' | 'start' | 'todo' | 'in_progress' | 'review' | 'cancelled') =>
    !allowedActions || allowedActions.includes(action);
  const statusOptions = [
    { value: 'todo' as const, label: taskStatusTokens.todo.label, description: 'Ready to be picked up', color: taskStatusTokens.todo.color },
    { value: 'in_progress' as const, label: taskStatusTokens.in_progress.label, description: 'Work is currently underway', color: taskStatusTokens.in_progress.color },
    { value: 'review' as const, label: taskStatusTokens.review.label, description: 'Waiting for feedback or approval', color: taskStatusTokens.review.color },
    { value: 'done' as const, label: taskStatusTokens.done.label, description: 'Work has been completed', color: taskStatusTokens.done.color },
    { value: 'cancelled' as const, label: taskStatusTokens.cancelled.label, description: 'Work will not continue', color: taskStatusTokens.cancelled.color },
  ].filter((option) => isAllowed(option.value));

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleActionClick = (action: 'delete' | 'done' | 'start' | 'more' | 'draft' | 'todo' | 'in_progress' | 'review' | 'cancelled') => {
    handleMenuClose();
    onBulkAction(action);
  };

  const handleMoveToClick = () => {
    handleMenuClose();
    setSelectedStatus(null);
    setMoveDialogOpen(true);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <Slide direction="up" in={isVisible} mountOnEnter unmountOnExit timeout={300}>
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
          backgroundColor: 'background.paper',
          borderTop: '1px solid',
          borderColor: 'divider',
          boxShadow: '0 -2px 12px rgba(0, 0, 0, 0.08)',
          zIndex: theme.zIndex.appBar + 1,
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: 'center',
          justifyContent: { xs: 'flex-start', sm: 'space-between' },
          px: { xs: 2, sm: 3 },
          gap: { xs: 1, sm: 2 },
        }}
      >
        {/* Left Section: Count + Select All/Unselect All */}
        <Box
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 2,
            width: { xs: '100%', sm: 'auto' },
          }}
        >
          {/* Count Badge/Chip */}
          <Chip
            label={selectedCount}
            size="medium"
            aria-label={`${selectedCount} task${selectedCount !== 1 ? 's' : ''} selected`}
            sx={{
              height: 32,
              fontWeight: 700,
              fontSize: '0.9375rem',
              backgroundColor: 'primary.main',
              color: 'primary.contrastText',
              boxShadow: 'none',
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
            {selectedCount > 0 ? 'Selected' : 'Select tasks'}
          </Typography>

          {/* Select All / Unselect All Toggle Button */}
          <Button
            onClick={() => {
              if (areAllSelected) {
                onDeselectAll();
              } else {
                onSelectAll();
              }
            }}
            variant="outlined"
            size="small"
            startIcon={areAllSelected ? <UnselectAllIcon /> : <SelectAllIcon />}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 500,
              fontSize: '0.8125rem',
              px: 2,
              py: 0.75,
              color: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)',
              borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)',
              '&:hover': {
                background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)',
              },
              transition: 'background-color 0.2s ease, border-color 0.2s ease',
            }}
          >
            {areAllSelected ? 'Unselect All' : 'Select All'}
          </Button>
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

        {/* Right Section: Actions (Start + Done + More + Close) */}
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
          {isAllowed('start') && <Tooltip title="Start Progress">
            <IconButton
              onClick={() => onBulkAction('start')}
              aria-label="Start progress on selected tasks"
              sx={{
                width: { xs: 'auto', sm: 40 },
                height: { xs: 48, sm: 40 },
                borderRadius: 2.5,
                backgroundColor: 'primary.main',
                color: 'primary.contrastText',
                boxShadow: 'none',
                flex: { xs: 1, sm: 'none' },
                '&:hover': { backgroundColor: 'primary.dark' },
                transition: 'background-color 0.2s ease',
                '&:active': {
                  transform: 'scale(0.95)',
                },
              }}
            >
              <StartIcon fontSize="small" />
              <Typography component="span" sx={{ display: { xs: 'inline', sm: 'none' }, ml: 0.5, fontSize: '0.75rem', fontWeight: 700 }}>Start</Typography>
            </IconButton>
          </Tooltip>}

          {/* Done Button */}
          {isAllowed('done') && <Tooltip title="Mark as Done">
            <IconButton
              onClick={() => onBulkAction('done')}
              aria-label="Mark selected tasks as done"
              sx={{
                width: { xs: 'auto', sm: 40 },
                height: { xs: 48, sm: 40 },
                borderRadius: 2.5,
                backgroundColor: 'success.main',
                color: 'success.contrastText',
                boxShadow: 'none',
                flex: { xs: 1, sm: 'none' },
                '&:hover': { backgroundColor: 'success.dark' },
                transition: 'background-color 0.2s ease',
                '&:active': {
                  transform: 'scale(0.95)',
                },
              }}
            >
              <DoneIcon fontSize="small" />
              <Typography component="span" sx={{ display: { xs: 'inline', sm: 'none' }, ml: 0.5, fontSize: '0.75rem', fontWeight: 700 }}>Done</Typography>
            </IconButton>
          </Tooltip>}

          {/* More Button */}
          {(isAllowed('delete') || statusOptions.length > 0) && <Tooltip title="More Actions">
            <IconButton
              onClick={handleMenuOpen}
              aria-label="More bulk actions"
              aria-haspopup="true"
              sx={{
                width: { xs: 'auto', sm: 40 },
                height: { xs: 48, sm: 40 },
                borderRadius: 2.5,
                background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                color: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
                flex: { xs: 1, sm: 'none' },
                '&:hover': {
                  background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
                },
                transition: 'background-color 0.2s ease',
              }}
            >
              <MoreIcon fontSize="small" />
              <Typography component="span" sx={{ display: { xs: 'inline', sm: 'none' }, ml: 0.5, fontSize: '0.75rem', fontWeight: 700 }}>More</Typography>
            </IconButton>
          </Tooltip>}

          {/* Close Button (Rightmost) */}
          <Tooltip title="Exit selection mode">
            <IconButton
              onClick={onClose}
              aria-label="Exit selection mode"
              sx={{
                width: { xs: 'auto', sm: 40 },
                height: { xs: 48, sm: 40 },
                borderRadius: 2.5,
                background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                color: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
                '&:hover': {
                  background: theme.palette.mode === 'dark' ? 'rgba(255,59,48,0.2)' : 'rgba(255,59,48,0.15)',
                  color: '#FF3B30',
                },
                transition: 'background-color 0.2s ease, color 0.2s ease',
              }}
            >
              <CloseIcon fontSize="small" />
              <Typography component="span" sx={{ display: { xs: 'inline', sm: 'none' }, ml: 0.5, fontSize: '0.75rem', fontWeight: 700 }}>Cancel</Typography>
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
              backgroundColor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
              mt: 1,
              overflow: 'visible',
              minWidth: 280,
            }
          }}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          {isAllowed('delete') && <MenuItem
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
                backgroundColor: 'error.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: 'none',
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
          </MenuItem>}

          {isAllowed('delete') && statusOptions.length > 0 && <Divider sx={{ my: 0.5 }} />}

          {statusOptions.length > 0 && <MenuItem
            onClick={handleMoveToClick}
            sx={{
              py: 1.5,
              px: 2,
              gap: 2,
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
                backgroundColor: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: 'none',
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
          </MenuItem>}
        </Menu>

        <Dialog
          open={moveDialogOpen}
          onClose={() => setMoveDialogOpen(false)}
          fullWidth
          maxWidth="sm"
          aria-labelledby="move-tasks-title"
          PaperProps={{ sx: { borderRadius: { xs: 3, sm: 4 }, m: { xs: 1.5, sm: 3 } } }}
        >
          <DialogTitle id="move-tasks-title" sx={{ pb: 1 }}>
            <Typography variant="h5" fontWeight={800}>Move selected tasks</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Choose a new status for {selectedCount} selected {selectedCount === 1 ? 'task' : 'tasks'}.
            </Typography>
          </DialogTitle>
          <DialogContent sx={{ pt: '12px !important' }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 1.25 }}>
              {statusOptions.map((option) => {
                const selected = selectedStatus === option.value;
                return (
                  <Button
                    key={option.value}
                    variant="outlined"
                    onClick={() => setSelectedStatus(option.value)}
                    aria-pressed={selected}
                    sx={{
                      justifyContent: 'flex-start',
                      alignItems: 'flex-start',
                      textAlign: 'left',
                      minHeight: 76,
                      px: 2,
                      borderWidth: selected ? 2 : 1,
                      borderColor: selected ? 'primary.main' : 'divider',
                      bgcolor: selected ? 'action.selected' : 'background.paper',
                      color: 'text.primary',
                      '&:hover': { borderColor: selected ? 'primary.main' : 'text.secondary', bgcolor: 'action.hover' },
                    }}
                  >
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: option.color, mt: 0.6, mr: 1.5, flexShrink: 0 }} />
                    <Box>
                      <Typography fontWeight={750}>{option.label}</Typography>
                      <Typography variant="caption" color="text.secondary">{option.description}</Typography>
                    </Box>
                  </Button>
                );
              })}
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3, pt: 1.5 }}>
            <Button onClick={() => setMoveDialogOpen(false)} color="inherit">Cancel</Button>
            <Button
              variant="contained"
              disabled={!selectedStatus}
              onClick={() => {
                if (!selectedStatus) return;
                onBulkAction(selectedStatus);
                setMoveDialogOpen(false);
              }}
            >
              Move {selectedCount === 1 ? 'task' : `${selectedCount} tasks`}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Slide>
  );
};

export default SelectionModeTopBar;
