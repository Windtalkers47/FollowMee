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
}

export const RangeCalendar: React.FC<RangeCalendarProps> = ({
  value,
  onChange,
  label = 'Select Date Range',
  disabled = false,
  error = false,
  helperText
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
                    ? 'rgba(59, 130, 246, 0.5)' 
                    : isInRange 
                    ? 'rgba(59, 130, 246, 0.2)' 
                    : isToday 
                    ? 'rgba(255, 255, 255, 0.1)' 
                    : isPastDate
                    ? 'rgba(255, 255, 255, 0.02)'
                    : 'transparent',
                  border: isSelected ? '2px solid rgba(59, 130, 246, 0.8)' : 'none',
                  backdropFilter: 'blur(10px)',
                  transition: 'all 0.2s ease',
                  opacity: isPastDate ? 0.4 : 1,
                  '&:hover': disabled || isPastDate ? {} : {
                    background: isSelected 
                      ? 'rgba(59, 130, 246, 0.7)' 
                      : 'rgba(255, 255, 255, 0.15)',
                    transform: 'scale(1.05)'
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
    for (let i = currentYear - 50; i <= currentYear + 50; i++) {
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
                background: year === getYear(currentMonth) ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)',
                border: year === getYear(currentMonth) ? '1px solid rgba(59, 130, 246, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
                '&:hover': {
                  background: 'rgba(59, 130, 246, 0.2)'
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
          borderRadius: '8px',
          background: '#ffffff',
          border: error ? '2px solid #f44336' : '2px solid #e0e0e0',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease',
          minHeight: '56px',
          display: 'flex',
          alignItems: 'center',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          '&:hover': disabled ? {} : {
            background: '#f5f5f5',
            border: '2px solid #1976d2',
            boxShadow: '0 4px 8px rgba(0,0,0,0.15)'
          }
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <CalendarToday sx={{ color: '#1976d2', fontSize: 20 }} />
          <Typography
            variant="body1"
            sx={{
              color: '#333333',
              flex: 1
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
              sx={{ color: '#666666' }}
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
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px'
          }
        }}
      >
        <DialogContent sx={{ p: 3, background: 'transparent' }}>
          <Stack spacing={3}>
            {/* Header */}
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="h6" sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                {format(currentMonth, 'MMMM yyyy')}
              </Typography>
              
              <Stack direction="row" spacing={1}>
                <IconButton
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
                >
                  <ChevronLeft />
                </IconButton>
                <IconButton
                  onClick={() => setYearPickerOpen(!yearPickerOpen)}
                  sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
                >
                  <CalendarToday />
                </IconButton>
                <IconButton
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
                >
                  <ChevronRight />
                </IconButton>
              </Stack>
            </Stack>

            {/* Year Picker */}
            {yearPickerOpen && (
              <Box sx={{ 
                p: 2, 
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '12px',
                backdropFilter: 'blur(10px)'
              }}>
                {renderYearPicker()}
              </Box>
            )}

            {/* Calendar */}
            {renderCalendarDays()}

            {/* Actions */}
            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <Button
                onClick={() => setOpen(false)}
                sx={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  borderColor: 'rgba(255, 255, 255, 0.2)'
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => setOpen(false)}
                variant="contained"
                sx={{
                  background: 'rgba(59, 130, 246, 0.8)',
                  backdropFilter: 'blur(10px)',
                  '&:hover': {
                    background: 'rgba(59, 130, 246, 0.9)'
                  }
                }}
              >
                Apply
              </Button>
            </Stack>
          </Stack>
        </DialogContent>
      </Dialog>
    </>
  );
};
