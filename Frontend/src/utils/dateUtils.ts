import { format, formatDistanceToNow, parseISO } from 'date-fns';

export const formatRelativeTime = (dateString: string | Date): string => {
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    return formatDistanceToNow(date, { addSuffix: true });
  } catch (error) {
    console.error('Error formatting relative time:', error);
    return 'Invalid date';
  }
};

export const formatDate = (dateString: string | Date): string => {
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    return format(date, 'MMM d, yyyy h:mm a');
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
};

export interface TaskWithDates {
  startDate?: string | null;
  endDate?: string | null;
  dueDate?: string | null;
}

export const getBookedDates = (task?: TaskWithDates): Date[] => {
  const dates: Date[] = [];

  // Only include dates from current editing task
  // For new tasks (task is undefined), return empty array
  if (task) {
    if (task.startDate && task.endDate) {
      const start = parseISO(task.startDate);
      const end = parseISO(task.endDate);
      const current = new Date(start);
      while (current <= end) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }
    } else if (task.dueDate) {
      dates.push(parseISO(task.dueDate));
    }
  }
  // For new tasks, calendar will be empty (no green highlighting)

  return dates;
};
