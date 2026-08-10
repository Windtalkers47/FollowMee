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
import ChevronLeft from '@mui/icons-material/ChevronLeft';
import ChevronRight from '@mui/icons-material/ChevronRight';
import CalendarToday from '@mui/icons-material/CalendarToday';
import Close from '@mui/icons-material/Close';
import { startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addDays, addMonths, subMonths, getYear, setYear, differenceInCalendarDays } from 'date-fns';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import { formatLocalizedDate, formatLocalizedNumber } from '../../utils/localeFormat';


interface RangeCalendarProps {
  value: [Date | null, Date | null];
  onChange: (range: [Date | null, Date | null]) => void;
  label?: string;
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
  bookedDates?: Date[]; // New prop for booked/marked dates
  allowPast?: boolean;
  minDate?: Date;
  maxDate?: Date;
  maxRangeDays?: number;
}

export const RangeCalendar: React.FC<RangeCalendarProps> = ({
  value,
  onChange,
  label,
  disabled = false,
  error = false,
  helperText,
  bookedDates = [],
  allowPast = false,
  minDate,
  maxDate,
  maxRangeDays,
}) => {
  const { t, locale } = useUserPreferences();
  const resolvedLabel = label || t('calendar.selectRange');
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [yearPickerOpen, setYearPickerOpen] = useState(false);
  const [draftValue, setDraftValue] = useState<[Date | null, Date | null]>(value);
  const [rangeError, setRangeError] = useState('');

  const openCalendar = () => {
    if (disabled) return;
    setDraftValue(value);
    setRangeError('');
    let preferredMonth = value[0] || new Date();
    if (maxDate && preferredMonth > maxDate) preferredMonth = maxDate;
    if (minDate && preferredMonth < minDate) preferredMonth = minDate;
    setCurrentMonth(preferredMonth);
    setOpen(true);
  };

  const dayIsDisabled = (date: Date) => {
    const day = new Date(date); day.setHours(0, 0, 0, 0);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const minimum = minDate ? new Date(minDate) : allowPast ? null : today;
    const maximum = maxDate ? new Date(maxDate) : null;
    if (minimum) minimum.setHours(0, 0, 0, 0);
    if (maximum) maximum.setHours(0, 0, 0, 0);
    return Boolean((minimum && day < minimum) || (maximum && day > maximum));
  };


  const handleDateClick = (date: Date) => {
    if (disabled) return;

    if (dayIsDisabled(date)) return;

    const [start, end] = draftValue;
    
    if (!start || (start && end)) {
      // Start new selection
      setDraftValue([date, null]);
      setRangeError('');
    } else if (start && !end) {
      // Complete the range
      if (date < start) {
        setDraftValue([date, start]);
      } else {
        setDraftValue([start, date]);
      }
    }
  };

  const handleClear = () => {
    setDraftValue([null, null]);
    setRangeError('');
  };

  const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const focusCalendarDay = (date: Date, offset: number) => {
    const next = addDays(date, offset);
    if (dayIsDisabled(next)) return;
    if (!isSameMonth(next, currentMonth)) setCurrentMonth(startOfMonth(next));
    window.requestAnimationFrame(() => {
      document.querySelector<HTMLElement>(`[data-calendar-date="${dateKey(next)}"]`)?.focus();
    });
  };

  const previousMonth = subMonths(currentMonth, 1);
  const nextMonth = addMonths(currentMonth, 1);
  const previousMonthDisabled = Boolean(minDate && endOfMonth(previousMonth) < startOfMonth(minDate));
  const nextMonthDisabled = Boolean(maxDate && startOfMonth(nextMonth) > startOfMonth(maxDate));
  const [draftStart, draftEnd] = draftValue;
  const draftTooLong = Boolean(draftStart && draftEnd && maxRangeDays && differenceInCalendarDays(draftEnd, draftStart) + 1 > maxRangeDays);
  const canApply = Boolean(draftStart && draftEnd && !draftTooLong);

  const renderCalendarDays = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    const weekDays = Array.from({ length: 7 }, (_, index) => new Intl.DateTimeFormat(locale === 'th' ? 'th-TH' : 'en-US', { weekday: 'short' }).format(new Date(2024, 0, 1 + index)));
    const leadingDays = (monthStart.getDay() + 6) % 7;
    
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
          {Array.from({ length: leadingDays }).map((_, index) => <Box key={`blank-${index}`} aria-hidden sx={{ width: 40, height: 40 }} />)}
          {days.map((day, index) => {
            const [start, end] = draftValue;
            const isSelected = Boolean((start && isSameDay(day, start)) || (end && isSameDay(day, end)));
            const isInRange = start && end && day > start && day < end;
            const isToday = isSameDay(day, new Date());
            const isCurrentMonth = isSameMonth(day, currentMonth);
            
            const isPastDate = dayIsDisabled(day);
            
            // Check if date is booked/marked (from existing tasks)
            const isBooked = bookedDates.some(bookedDate => isSameDay(day, bookedDate));
            // Check if date is in current selection
            const isInCurrentSelection = isSelected || Boolean(isInRange);
            const accessibleDate = formatLocalizedDate(day, locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
            
            return (
              <Box
                component="button"
                type="button"
                key={index}
                onClick={() => handleDateClick(day)}
                onKeyDown={(event) => {
                  const offsets: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
                  const offset = offsets[event.key];
                  if (!offset) return;
                  event.preventDefault();
                  focusCalendarDay(day, offset);
                }}
                data-calendar-date={dateKey(day)}
                aria-label={accessibleDate}
                aria-pressed={isInCurrentSelection}
                disabled={disabled || isPastDate}
                sx={{
                  position: 'relative',
                  width: 40,
                  height: 40,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: disabled || isPastDate ? 'not-allowed' : 'pointer',
                  borderRadius: isSelected ? '50%' : isInRange ? '10px' : '50%',
                  fontSize: '14px',
                  fontWeight: isSelected ? 600 : 400,
                  color: isSelected
                    ? 'primary.contrastText'
                    : isInRange
                    ? 'text.primary'
                    : isPastDate
                    ? 'text.disabled'
                    : isCurrentMonth
                    ? 'text.primary'
                    : 'text.secondary',
                  bgcolor: isSelected
                    ? theme.palette.primary.main
                    : isInRange
                    ? alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.24 : 0.14)
                    : isBooked && !isInCurrentSelection
                    ? alpha(theme.palette.primary.main, 0.14)
                    : isToday 
                    ? theme.palette.action.hover
                    : isPastDate
                    ? theme.palette.action.disabledBackground
                    : 'transparent',
                  border: isSelected
                    ? `2px solid ${theme.palette.primary.main}`
                    : isInRange
                    ? `1px solid ${alpha(theme.palette.primary.main, 0.18)}`
                    : isBooked && !isInCurrentSelection
                    ? `1px solid ${alpha(theme.palette.primary.main, 0.5)}`
                    : isToday
                    ? `1px solid ${theme.palette.divider}`
                    : '1px solid transparent',
                  transition: 'background-color 180ms ease, border-color 180ms ease',
                  opacity: isPastDate ? 0.4 : 1,
                  boxShadow: 'none',
                  '&:hover': disabled || isPastDate ? {} : {
                    bgcolor: isSelected
                      ? theme.palette.primary.dark
                      : isInRange
                      ? alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.32 : 0.2)
                      : isBooked && !isInCurrentSelection
                      ? alpha(theme.palette.primary.main, 0.22)
                      : theme.palette.action.hover,
                  },
                  '@media (max-width: 600px)': {
                    width: 44,
                    height: 44,
                    fontSize: '16px'
                  },
                  '&:focus-visible': {
                    outline: `3px solid ${alpha(theme.palette.primary.main, 0.42)}`,
                    outlineOffset: 2,
                  },
                }}
              >
                <Typography variant="body2">
                  {formatLocalizedNumber(day.getDate(), locale)}
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
    const firstYear = minDate ? getYear(minDate) : allowPast ? currentYear - 20 : currentYear;
    const lastYear = maxDate ? getYear(maxDate) : currentYear + 50;
    for (let i = firstYear; i <= lastYear; i++) {
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
    if (!start && !end) return resolvedLabel;
    if (start && !end) return `${formatLocalizedDate(start, locale)} - …`;
    if (start && end) {
      if (isSameDay(start, end)) {
        return formatLocalizedDate(start, locale);
      }
      return `${formatLocalizedDate(start, locale)} - ${formatLocalizedDate(end, locale)}`;
    }
    return resolvedLabel;
  };

  return (
    <>
      <Box
        onClick={openCalendar}
        onKeyDown={(event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          openCalendar();
        }}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={resolvedLabel}
        aria-disabled={disabled}
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
        <Stack direction="row" alignItems="center" spacing={1} sx={{ width: '100%' }}>
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
              aria-label={t('calendar.clear')}
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
        onClose={() => { setDraftValue(value); setOpen(false); }}
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
                {formatLocalizedDate(currentMonth, locale, { month: 'long', year: 'numeric' })}
              </Typography>
              
              <Stack direction="row" spacing={1}>
                <IconButton
                  aria-label={t('calendar.previousMonth')}
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  disabled={disabled || previousMonthDisabled}
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
                  aria-label={t('calendar.chooseYear')}
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
                  aria-label={t('calendar.nextMonth')}
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  disabled={disabled || nextMonthDisabled}
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
                onClick={() => { setDraftValue(value); setRangeError(''); setOpen(false); }}
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
                {t('common.cancel')}
              </Button>
              
              <Button
                aria-label={t('calendar.apply')}
                disabled={!canApply}
                onClick={() => {
                  const [start, end] = draftValue;
                  if (start && !end) { setRangeError(t('calendar.completeRange')); return; }
                  if (start && end && maxRangeDays && differenceInCalendarDays(end, start) + 1 > maxRangeDays) { setRangeError(t('calendar.rangeTooLong', { count: maxRangeDays })); return; }
                  onChange(draftValue);
                  setRangeError('');
                  setOpen(false);
                }}
                sx={{
                  color: 'primary.contrastText',
                  bgcolor: 'primary.main',
                  border: `1px solid ${theme.palette.primary.main}`,
                  borderRadius: '12px',
                  padding: '10px 20px',
                  fontWeight: 600,
                  boxShadow: 'none',
                  transition: 'background-color 180ms ease',
                  '&:hover': {
                    bgcolor: 'primary.dark',
                  },
                  '&.Mui-disabled': {
                    color: 'text.disabled',
                    bgcolor: 'action.disabledBackground',
                    borderColor: 'divider',
                  },
                  '@media (max-width: 600px)': {
                    padding: '12px 16px',
                    fontSize: '14px'
                  }
                }}
              >
                {t('calendar.apply')}
              </Button>
            </Stack>
            {(rangeError || (draftStart && !draftEnd) || draftTooLong) && <Typography role="alert" color="error.main" variant="body2">
              {rangeError || (draftTooLong ? t('calendar.rangeTooLong', { count: maxRangeDays || 366 }) : t('calendar.completeRange'))}
            </Typography>}
          </Stack>
        </DialogContent>
      </Dialog>
    </>
  );
};
