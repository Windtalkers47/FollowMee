import React, { useState } from 'react';
import {
  Box,
  Dialog,
  DialogContent,
  IconButton,
  Typography,
  Button,
  Stack,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  ChevronLeft,
  ChevronRight,
  CalendarToday,
  Close
} from '@mui/icons-material';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, getYear, setYear } from 'date-fns';


interface RangeCalendarProps {
  value: [Date | null, Date | null];
  onChange: (range: [Date | null, Date | null]) => void;
  label?: string;
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
  bookedDates?: Date[]; // New prop for booked/marked dates
}

export const RangeCalendar: React.FC<RangeCalendarProps> = ({
  value,
  onChange,
  label = 'Select Date Range',
  disabled = false,
  error = false,
  helperText,
  bookedDates = []
}) => {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [yearPickerOpen, setYearPickerOpen] = useState(false);


  const handleDateClick = (date: Date) => {
    if (disabled) return;

    // Prevent selecting past dates
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of day for fair comparison
    const selectedDate = new Date(date);
    selectedDate.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      return; // Don't allow selection of past dates
    }

    const [start, end] = value;
    
    if (!start || (start && end)) {
      // Start new selection
      onChange([date, null]);
    } else if (start && !end) {
      // Complete the range
      if (date < start) {
        onChange([date, start]);
      } else {
        onChange([start, date]);
      }
    }
  };

  const handleClear = () => {
    onChange([null, null]);
  };

  const renderCalendarDays = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    return (
      <Box>
        {/* Week days header */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, mb: 1 }}>
          {weekDays.map(day => (
            <Typography
              key={day}
              variant="caption"
              sx={{ 
                textAlign: 'center', 
                color: 'text.secondary',
                fontSize: '12px',
                fontWeight: 500
              }}
            >
              {day}
            </Typography>
          ))}
        </Box>
        
        {/* Calendar days */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
          {days.map((day, index) => {
            const [start, end] = value;
            const isSelected = (start && isSameDay(day, start)) || (end && isSameDay(day, end));
            const isInRange = start && end && day > start && day < end;
            const isToday = isSameDay(day, new Date());
            const isCurrentMonth = isSameMonth(day, currentMonth);
            
            // Check if date is in the past
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const selectedDate = new Date(day);
            selectedDate.setHours(0, 0, 0, 0);
            const isPastDate = selectedDate < today;
            
            // Check if date is booked/marked (from existing tasks)
            const isBooked = bookedDates.some(bookedDate => isSameDay(day, bookedDate));
            // Check if date is in current selection
            const isInCurrentSelection = (start && isSameDay(day, start)) || (end && isSameDay(day, end)) || (start && end && day > start && day < end);
            
            return (
              <Box
                key={index}
                onClick={() => handleDateClick(day)}
                sx={{
                  position: 'relative',
                  width: 40,
                  height: 40,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: disabled || isPastDate ? 'not-allowed' : 'pointer',
                  borderRadius: '50%',
                  fontSize: '14px',
                  fontWeight: isSelected ? 600 : 400,
                  color: isInCurrentSelection
                    ? 'primary.contrastText'
                    : isPastDate
                    ? 'text.disabled'
                    : isCurrentMonth
                    ? 'text.primary'
                    : 'text.secondary',
                  background: isInCurrentSelection
                    ? theme.palette.primary.main
                    : isBooked && !isInCurrentSelection
                    ? alpha(theme.palette.primary.main, 0.14)
                    : isToday 
                    ? theme.palette.action.hover
                    : isPastDate
                    ? theme.palette.action.disabledBackground
                    : 'transparent',
                  border: isInCurrentSelection
                    ? `2px solid ${theme.palette.primary.main}`
                    : isBooked && !isInCurrentSelection
                    ? `1px solid ${alpha(theme.palette.primary.main, 0.5)}`
                    : isToday
                    ? `1px solid ${theme.palette.divider}`
                    : '1px solid transparent',
                  transition: 'background-color 180ms ease, border-color 180ms ease',
                  opacity: isPastDate ? 0.4 : 1,
                  boxShadow: 'none',
                  '&:hover': disabled || isPastDate ? {} : {
                    background: isInCurrentSelection 
                      ? theme.palette.primary.dark
                      : isBooked && !isInCurrentSelection
                      ? alpha(theme.palette.primary.main, 0.22)
                      : theme.palette.action.hover,
                  },
                  '@media (max-width: 600px)': {
                    width: 44,
                    height: 44,
                    fontSize: '16px'
                  }
                }}
              >
                <Typography variant="body2">
                  {format(day, 'd')}
                </Typography>
                {/* Add indicator for booked dates that are not selected */}
                {isBooked && !isInCurrentSelection && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 2,
                      right: 2,
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      backgroundColor: 'primary.main',
                      border: `1px solid ${theme.palette.background.paper}`,
                    }}
                  />
                )}
              </Box>
            );
          })}
        </Box>
      </Box>
    );
  };

  const renderYearPicker = () => {
    const currentYear = getYear(new Date());
    const years = [];
    // Only show current year and future years (up to 50 years ahead)
    for (let i = currentYear; i <= currentYear + 50; i++) {
      years.push(i);
    }
    
    return (
      <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
          {years.map(year => (
            <Button
              key={year}
              onClick={() => {
                setCurrentMonth(setYear(currentMonth, year));
                setYearPickerOpen(false);
              }}
              sx={{
                color: year === getYear(currentMonth) ? 'primary.contrastText' : 'text.primary',
                background: year === getYear(currentMonth) 
                  ? theme.palette.primary.main
                  : theme.palette.background.paper,
                border: year === getYear(currentMonth) 
                  ? `1px solid ${theme.palette.primary.main}`
                  : `1px solid ${theme.palette.divider}`,
                borderRadius: '12px',
                padding: '12px 16px',
                fontWeight: year === getYear(currentMonth) ? 600 : 400,
                transition: 'background-color 180ms ease, border-color 180ms ease',
                boxShadow: 'none',
                '&:hover': {
                  background: year === getYear(currentMonth)
                    ? theme.palette.primary.dark
                    : theme.palette.action.hover,
                },
                '@media (max-width: 600px)': {
                  padding: '14px 12px',
                  fontSize: '14px',
                  borderRadius: '10px'
                }
              }}
            >
              {year}
            </Button>
          ))}
        </Box>
      </Box>
    );
  };

  const formatDisplayValue = () => {
    const [start, end] = value;
    if (!start && !end) return label;
    if (start && !end) return format(start, 'MMM d, yyyy') + ' - ...';
    if (start && end) {
      if (isSameDay(start, end)) {
        return format(start, 'MMM d, yyyy');
      }
      return format(start, 'MMM d, yyyy') + ' - ' + format(end, 'MMM d, yyyy');
    }
    return label;
  };

  return (
    <>
      <Box
        onClick={() => !disabled && setOpen(true)}
        sx={{
          position: 'relative',
          padding: '12px 16px',
          borderRadius: '16px',
          background: 'background.paper',
          border: error ? '2px solid' : '1px solid',
          borderColor: error ? 'error.main' : 'divider',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'background-color 180ms ease, border-color 180ms ease',
          minHeight: '56px',
          display: 'flex',
          alignItems: 'center',
          boxShadow: 'none',
          '&:hover': disabled ? {} : {
            background: 'action.hover',
            borderColor: 'primary.main',
          },
          '@media (max-width: 600px)': {
            padding: '14px 18px',
            minHeight: '52px',
            borderRadius: '14px'
          }
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <CalendarToday sx={{ 
            color: 'primary.main',
            fontSize: 20,
          }} />
          <Typography
            variant="body1"
            sx={{
              color: (value[0] || value[1]) ? 'text.primary' : 'text.secondary',
              flex: 1,
              fontWeight: 400,
            }}
          >
            {formatDisplayValue()}
          </Typography>
          {(value[0] || value[1]) && !disabled && (
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              sx={{ 
                color: 'error.main',
                background: 'transparent',
                borderRadius: '50%',
                padding: '6px',
                '&:hover': {
                  background: 'action.hover',
                }
              }}
            >
              <Close fontSize="small" />
            </IconButton>
          )}
        </Stack>
        
        {helperText && (
          <Typography
            variant="caption"
            sx={{
              color: error ? 'error.main' : 'text.secondary',
              marginTop: 0.5,
              display: 'block'
            }}
          >
            {helperText}
          </Typography>
        )}
      </Box>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            background: 'background.paper',
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: '24px',
            boxShadow: theme.shadows[8],
            overflow: 'hidden',
            '@media (max-width: 600px)': {
              margin: '16px',
              borderRadius: '20px',
              maxHeight: '90vh'
            }
          }
        }}
      >
        <DialogContent sx={{ 
          p: 3, 
          background: 'transparent',
          '@media (max-width: 600px)': {
            p: 2
          }
        }}>
          <Stack spacing={3}>
            {/* Header */}
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="h6" sx={{ color: 'text.primary' }}>
                {format(currentMonth, 'MMMM yyyy')}
              </Typography>
              
              <Stack direction="row" spacing={1}>
                <IconButton
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  disabled={disabled}
                  sx={{
                    color: 'text.secondary',
                    background: 'action.hover',
                    borderRadius: '50%',
                    padding: '8px',
                    '&:hover': {
                      background: 'action.selected',
                    },
                    '&:disabled': {
                      opacity: 0.3,
                      color: 'text.disabled',
                    },
                    '@media (max-width: 600px)': {
                      padding: '10px'
                    }
                  }}
                >
                  <ChevronLeft />
                </IconButton>
                
                <IconButton
                  onClick={() => setYearPickerOpen(!yearPickerOpen)}
                  disabled={disabled}
                  sx={{
                    color: 'primary.main',
                    background: 'action.hover',
                    borderRadius: '50%',
                    padding: '8px',
                    border: `1px solid ${theme.palette.divider}`,
                    '&:hover': {
                      background: 'action.selected',
                    },
                    '&:disabled': {
                      opacity: 0.3
                    },
                    '@media (max-width: 600px)': {
                      padding: '10px'
                    }
                  }}
                >
                  <CalendarToday />
                </IconButton>
                
                <IconButton
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  disabled={disabled}
                  sx={{
                    color: 'text.secondary',
                    background: 'action.hover',
                    borderRadius: '50%',
                    padding: '8px',
                    '&:hover': {
                      background: 'action.selected',
                    },
                    '&:disabled': {
                      opacity: 0.3,
                      color: 'text.disabled',
                    },
                    '@media (max-width: 600px)': {
                      padding: '10px'
                    }
                  }}
                >
                  <ChevronRight />
                </IconButton>
              </Stack>
            </Stack>

            {/* Calendar or Year Picker */}
            <Box sx={{
              background: 'background.default',
              borderRadius: '16px',
              padding: '20px',
              border: `1px solid ${theme.palette.divider}`,
              '@media (max-width: 600px)': {
                padding: '16px',
                borderRadius: '12px'
              }
            }}>
              {yearPickerOpen ? renderYearPicker() : renderCalendarDays()}
            </Box>

            {/* Footer */}
            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <Button
                onClick={() => setOpen(false)}
                sx={{
                  color: 'text.primary',
                  background: 'background.paper',
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: '12px',
                  padding: '10px 20px',
                  fontWeight: 500,
                  transition: 'background-color 180ms ease',
                  '&:hover': {
                    background: 'action.hover',
                  },
                  '@media (max-width: 600px)': {
                    padding: '12px 16px',
                    fontSize: '14px'
                  }
                }}
              >
                Cancel
              </Button>
              
              <Button
                onClick={() => setOpen(false)}
                sx={{
                  color: 'primary.contrastText',
                  background: 'primary.main',
                  border: `1px solid ${theme.palette.primary.main}`,
                  borderRadius: '12px',
                  padding: '10px 20px',
                  fontWeight: 600,
                  boxShadow: 'none',
                  transition: 'background-color 180ms ease',
                  '&:hover': {
                    background: 'primary.dark',
                  },
                  '@media (max-width: 600px)': {
                    padding: '12px 16px',
                    fontSize: '14px'
                  }
                }}
              >
                Done
              </Button>
            </Stack>
          </Stack>
        </DialogContent>
      </Dialog>
    </>
  );
};
