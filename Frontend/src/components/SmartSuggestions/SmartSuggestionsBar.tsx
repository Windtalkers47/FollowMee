import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Chip,
  useTheme,
  useMediaQuery,
  IconButton,
  Tooltip,
  Paper,
  Slide
} from '@mui/material';
import {
  FlashOn as FireIcon,
  CheckCircle as CheckIcon,
  PlayArrow as PlayIcon,
  Schedule as ScheduleIcon,
  Visibility as ReviewIcon,
  Close as CloseIcon,
  KeyboardArrowDown as ExpandIcon,
  KeyboardArrowUp as CollapseIcon
} from '@mui/icons-material';
import { PrioritySuggestion, SuggestionAction } from '../../api/task.api';
import { alpha } from '@mui/material/styles';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';

interface SmartSuggestionsBarProps {
  suggestions: PrioritySuggestion[];
  onActionClick: (suggestion: PrioritySuggestion, action: SuggestionAction) => void;
  onDismiss?: () => void;
}

export const SmartSuggestionsBar: React.FC<SmartSuggestionsBarProps> = ({
  suggestions,
  onActionClick,
  onDismiss
}) => {
  const theme = useTheme();
  const { t } = useUserPreferences();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [isExpanded, setIsExpanded] = useState(!isMobile);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // Filter out dismissed suggestions
  const visibleSuggestions = suggestions.filter(s => !dismissedIds.has(s.id));

  if (visibleSuggestions.length === 0) {
    return null;
  }

  // Get the highest priority suggestion (first one after sorting)
  const primarySuggestion = visibleSuggestions[0];

  const handleDismiss = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDismissedIds(prev => new Set(prev).add(id));
  };

  const getActionColor = (_action: SuggestionAction) => theme.palette.primary.main;
  const getTitle = (suggestion: PrioritySuggestion) => ({
    overdue: t('suggestion.overdue.title'),
    today: t('suggestion.today.title'),
    tomorrow: t('suggestion.tomorrow.title'),
    soon: t('suggestion.soon.title'),
  })[suggestion.translationKey];
  const getMessage = (suggestion: PrioritySuggestion) => ({
    overdue: t('suggestion.overdue.message', { count: suggestion.count }),
    today: t('suggestion.today.message', { count: suggestion.count }),
    tomorrow: t('suggestion.tomorrow.message', { count: suggestion.count }),
    soon: t('suggestion.soon.message', { count: suggestion.count }),
  })[suggestion.translationKey];
  const getActionLabel = (action: SuggestionAction) => ({
    'mark-done': t('suggestion.action.markDone'),
    'start-all': t('suggestion.action.startAll'),
    reschedule: t('suggestion.action.reschedule'),
    review: t('suggestion.action.review'),
  })[action.type];

  const getActionIcon = (type: SuggestionAction['type']) => {
    switch (type) {
      case 'mark-done': return <CheckIcon />;
      case 'start-all': return <PlayIcon />;
      case 'reschedule': return <ScheduleIcon />;
      case 'review': return <ReviewIcon />;
    }
  };

  const getSuggestionColor = (type: PrioritySuggestion['type']) => {
    if (type === 'overdue') return theme.palette.error.main;
    if (type === 'due-today') return theme.palette.warning.main;
    if (type === 'due-tomorrow') return theme.palette.info.main;
    return theme.palette.primary.main;
  };

  const getBackgroundGradient = (type: PrioritySuggestion['type']) =>
    alpha(getSuggestionColor(type), theme.palette.mode === 'dark' ? 0.16 : 0.09);
  const getBorderColor = (type: PrioritySuggestion['type']) =>
    alpha(getSuggestionColor(type), 0.3);

  return (
    <Slide direction="down" in={visibleSuggestions.length > 0} mountOnEnter unmountOnExit>
      <Box sx={{ mb: 3 }}>
        {/* Primary Suggestion - Always Visible */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 2.5 },
            borderRadius: 3,
            background: getBackgroundGradient(primarySuggestion.type),
            backdropFilter: 'blur(20px)',
            border: `1px solid ${getBorderColor(primarySuggestion.type)}`,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            cursor: 'pointer',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: `0 8px 24px ${getBorderColor(primarySuggestion.type).replace('0.3', '0.15')}`,
            }
          }}
        >
          <Box display="flex" alignItems="flex-start" gap={2}>
            {/* Icon */}
            <Box
              sx={{
                p: 1,
                borderRadius: 2,
                background: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(10px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: getSuggestionColor(primarySuggestion.type)
              }}
            >
              <FireIcon sx={{ fontSize: 20 }} />
            </Box>

            {/* Content */}
            <Box flex={1} minWidth={0}>
              <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                <Typography
                  variant="subtitle2"
                  fontWeight={600}
                  sx={{
                    color: theme.palette.mode === 'dark' ? '#fff' : '#000',
                    fontSize: { xs: '0.875rem', sm: '0.9375rem' }
                  }}
                >
                  {getTitle(primarySuggestion)}
                </Typography>
                <Chip
                  label={primarySuggestion.count}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    background: 'rgba(255, 255, 255, 0.3)',
                    color: theme.palette.mode === 'dark' ? '#000' : '#fff',
                    border: 'none'
                  }}
                />
              </Box>

              <Typography
                variant="body2"
                sx={{
                  color: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
                  fontSize: { xs: '0.8125rem', sm: '0.875rem' },
                  mb: 2
                }}
              >
                {getMessage(primarySuggestion)}
              </Typography>

              {/* Action Buttons */}
              <Box display="flex" gap={1} flexWrap="wrap">
                {primarySuggestion.actions.slice(0, isMobile ? 2 : undefined).map((action) => (
                  <Button
                    key={action.id}
                    variant="contained"
                    size="small"
                    startIcon={getActionIcon(action.type)}
                    onClick={(e) => {
                      e.stopPropagation();
                      onActionClick(primarySuggestion, action);
                    }}
                    sx={{
                      background: getActionColor(action),
                      color: '#fff',
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 600,
                      fontSize: '0.8125rem',
                      px: 2,
                      py: 0.75,
                      boxShadow: `0 4px 12px ${getActionColor(action)}40`,
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': {
                        background: getActionColor(action),
                        filter: 'brightness(1.1)',
                        boxShadow: `0 6px 16px ${getActionColor(action)}50`,
                        transform: 'translateY(-1px)',
                      }
                    }}
                  >
                    {getActionLabel(action)}
                  </Button>
                ))}

                {/* Expand/Collapse Button (Desktop) */}
                {!isMobile && visibleSuggestions.length > 1 && (
                  <Button
                    size="small"
                    endIcon={isExpanded ? <CollapseIcon /> : <ExpandIcon />}
                    onClick={() => setIsExpanded(!isExpanded)}
                    sx={{
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 500,
                      fontSize: '0.8125rem',
                      color: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
                      '&:hover': {
                        background: 'rgba(0,0,0,0.05)',
                      }
                    }}
                  >
                    {isExpanded ? 'Less' : 'More'}
                  </Button>
                )}
              </Box>
            </Box>

            {/* Dismiss Button */}
            <Tooltip title="Dismiss">
              <IconButton
                size="small"
                onClick={(e) => handleDismiss(e, primarySuggestion.id)}
                sx={{
                  color: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)',
                  p: 0.5,
                  '&:hover': {
                    background: 'rgba(0,0,0,0.05)',
                  }
                }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Paper>

        {/* Additional Suggestions (Expanded Mode) */}
        {!isMobile && isExpanded && visibleSuggestions.slice(1).map((suggestion) => (
          <Paper
            key={suggestion.id}
            elevation={0}
            sx={{
              mt: 1.5,
              p: 2,
              borderRadius: 2.5,
              background: getBackgroundGradient(suggestion.type),
              backdropFilter: 'blur(20px)',
              border: `1px solid ${getBorderColor(suggestion.type)}`,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              animation: 'slideIn 0.3s ease-out',
              '@keyframes slideIn': {
                from: { opacity: 0, transform: 'translateY(-10px)' },
                to: { opacity: 1, transform: 'translateY(0)' },
              }
            }}
          >
            <Box display="flex" alignItems="center" gap={2}>
              <Box
                sx={{
                  p: 0.75,
                  borderRadius: 1.5,
                  background: 'rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(10px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: getSuggestionColor(suggestion.type)
                }}
              >
                <FireIcon sx={{ fontSize: 16 }} />
              </Box>

              <Box flex={1} minWidth={0} sx={{ overflow: 'hidden' }}>
                <Box display="flex" alignItems="center" gap={1} mb={0.25}>
                  <Typography
                    variant="subtitle2"
                    fontWeight={600}
                    sx={{
                      color: theme.palette.mode === 'dark' ? '#fff' : '#000',
                      fontSize: '0.875rem'
                    }}
                  >
                    {getTitle(suggestion)}
                  </Typography>
                  <Chip
                    label={suggestion.count}
                    size="small"
                    sx={{
                      height: 18,
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      background: 'rgba(255, 255, 255, 0.3)',
                      color: theme.palette.mode === 'dark' ? '#000' : '#fff',
                    }}
                  />
                </Box>

                <Typography
                  variant="caption"
                  sx={{
                    color: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)',
                    fontSize: '0.75rem'
                  }}
                >
                  {getMessage(suggestion)}
                </Typography>
              </Box>

              <Box display="flex" gap={0.5}>
                {suggestion.actions.map((action) => (
                  <Tooltip key={action.id} title={getActionLabel(action)}>
                    <IconButton
                      size="small"
                      onClick={() => onActionClick(suggestion, action)}
                      sx={{
                        background: getActionColor(action),
                        color: '#fff',
                        p: 0.75,
                        borderRadius: 1.5,
                        '&:hover': {
                          filter: 'brightness(1.1)',
                        }
                      }}
                    >
                      {getActionIcon(action.type)}
                    </IconButton>
                  </Tooltip>
                ))}
              </Box>

              <IconButton
                size="small"
                onClick={(e) => handleDismiss(e, suggestion.id)}
                sx={{
                  color: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)',
                }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          </Paper>
        ))}
      </Box>
    </Slide>
  );
};

export default SmartSuggestionsBar;
