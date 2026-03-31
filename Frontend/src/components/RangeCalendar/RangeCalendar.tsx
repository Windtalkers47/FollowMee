import React, { useState } from 'react';
import {
  Box,
  Dialog,
  DialogContent,
  IconButton,
  Typography,
  Button,
  Stack
} from '@mui/material';
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
                color: 'rgba(255, 255, 255, 0.6)',
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
            
            // Check if date is booked/marked
            const isBooked = bookedDates.some(bookedDate => isSameDay(day, bookedDate));
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
                  color: isPastDate 
                    ? 'rgba(255, 255, 255, 0.2)' 
                    : isCurrentMonth 
                    ? 'rgba(255, 255, 255, 0.9)' 
                    : 'rgba(255, 255, 255, 0.4)',
                  background: isSelected 
                    ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.7), rgba(16, 185, 129, 0.7))' 
                    : isInRange 
                    ? 'rgba(34, 197, 94, 0.25)' 
                    : isBooked
                    ? 'rgba(34, 197, 94, 0.3)'
                    : isToday 
                    ? 'rgba(255, 255, 255, 0.1)' 
                    : isPastDate
                    ? 'rgba(255, 255, 255, 0.02)'
                    : 'transparent',
                  border: isSelected 
                    ? '2px solid rgba(34, 197, 94, 0.9)' 
                    : isBooked
                    ? '1px solid rgba(34, 197, 94, 0.5)'
                    : 'none',
                  backdropFilter: 'blur(10px)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  opacity: isPastDate ? 0.4 : 1,
                  boxShadow: isSelected ? '0 4px 20px rgba(34, 197, 94, 0.4)' : 'none',
                  '&:hover': disabled || isPastDate ? {} : {
                    background: isSelected 
                      ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.8), rgba(16, 185, 129, 0.8))' 
                      : 'rgba(255, 255, 255, 0.15)',
                    transform: 'scale(1.1)',
                    boxShadow: '0 6px 25px rgba(34, 197, 94, 0.3)'
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
                color: 'rgba(255, 255, 255, 0.9)',
                background: year === getYear(currentMonth) 
                  ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.4), rgba(147, 51, 234, 0.4))' 
                  : 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(15px)',
                border: year === getYear(currentMonth) 
                  ? '1px solid rgba(59, 130, 246, 0.6)' 
                  : '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '12px 16px',
                fontWeight: year === getYear(currentMonth) ? 600 : 400,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: year === getYear(currentMonth) 
                  ? '0 4px 20px rgba(59, 130, 246, 0.3)' 
                  : '0 2px 10px rgba(0, 0, 0, 0.1)',
                '&:hover': {
                  background: year === getYear(currentMonth)
                    ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.5), rgba(147, 51, 234, 0.5))'
                    : 'rgba(255, 255, 255, 0.1)',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 6px 25px rgba(59, 130, 246, 0.2)'
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
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
          border: error ? '2px solid rgba(244, 67, 54, 0.5)' : '2px solid rgba(255, 255, 255, 0.2)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          minHeight: '56px',
          display: 'flex',
          alignItems: 'center',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
          '&:hover': disabled ? {} : {
            background: 'rgba(255, 255, 255, 0.15)',
            border: '2px solid rgba(59, 130, 246, 0.4)',
            transform: 'translateY(-2px)',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.3)'
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
            color: 'rgba(59, 130, 246, 0.8)', 
            fontSize: 20,
            filter: 'drop-shadow(0 2px 4px rgba(59, 130, 246, 0.3))'
          }} />
          <Typography
            variant="body1"
            sx={{
              color: (value[0] || value[1]) ? '#1a1a1a' : 'rgba(0, 0, 0, 0.6)',
              flex: 1,
              fontWeight: 400,
              textShadow: (value[0] || value[1]) ? 'none' : '0 1px 2px rgba(0, 0, 0, 0.1)'
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
                color: 'rgba(244, 67, 54, 0.8)',
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                borderRadius: '50%',
                padding: '6px',
                '&:hover': {
                  background: 'rgba(244, 67, 54, 0.2)',
                  color: 'rgba(244, 67, 54, 0.8)'
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
              color: error ? '#f44336' : '#666666',
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
            background: 'rgba(17, 24, 39, 0.95)',
            backdropFilter: 'blur(40px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '24px',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
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
              <Typography variant="h6" sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                {format(currentMonth, 'MMMM yyyy')}
              </Typography>
              
              <Stack direction="row" spacing={1}>
                <IconButton
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  disabled={disabled}
                  sx={{
                    color: 'rgba(255, 255, 255, 0.8)',
                    background: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: '50%',
                    padding: '8px',
                    '&:hover': {
                      background: 'rgba(255, 255, 255, 0.2)',
                      transform: 'scale(1.05)'
                    },
                    '&:disabled': {
                      opacity: 0.3,
                      color: 'rgba(255, 255, 255, 0.3)'
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
                    color: 'rgba(255, 255, 255, 0.8)',
                    background: 'rgba(59, 130, 246, 0.2)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: '50%',
                    padding: '8px',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    '&:hover': {
                      background: 'rgba(59, 130, 246, 0.3)',
                      transform: 'scale(1.05)'
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
                    color: 'rgba(255, 255, 255, 0.8)',
                    background: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: '50%',
                    padding: '8px',
                    '&:hover': {
                      background: 'rgba(255, 255, 255, 0.2)',
                      transform: 'scale(1.05)'
                    },
                    '&:disabled': {
                      opacity: 0.3,
                      color: 'rgba(255, 255, 255, 0.3)'
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
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(20px)',
              borderRadius: '16px',
              padding: '20px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
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
                  color: 'rgba(255, 255, 255, 0.8)',
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '12px',
                  padding: '10px 20px',
                  fontWeight: 500,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    background: 'rgba(255, 255, 255, 0.2)',
                    transform: 'translateY(-1px)'
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
                  color: 'white',
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.8), rgba(147, 51, 234, 0.8))',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '12px',
                  padding: '10px 20px',
                  fontWeight: 600,
                  boxShadow: '0 4px 20px rgba(59, 130, 246, 0.3)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.9), rgba(147, 51, 234, 0.9))',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 6px 25px rgba(59, 130, 246, 0.4)'
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
