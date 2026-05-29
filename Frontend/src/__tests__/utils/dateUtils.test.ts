import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatRelativeTime, formatDate, getBookedDates, TaskWithDates } from '../../utils/dateUtils';

// Suppress console.error during tests for expected error cases
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('dateUtils', () => {
  describe('formatRelativeTime', () => {
    it('should format relative time for recent dates', () => {
      const now = new Date().toISOString();
      const result = formatRelativeTime(now);
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should return "Invalid date" for invalid input', () => {
      const result = formatRelativeTime('invalid-date');
      expect(result).toBe('Invalid date');
    });

    it('should handle Date objects', () => {
      const date = new Date();
      const result = formatRelativeTime(date);
      expect(result).toBeDefined();
    });
  });

  describe('formatDate', () => {
    it('should format date correctly', () => {
      const date = new Date('2024-01-15T10:30:00').toISOString();
      const result = formatDate(date);
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should handle Date objects', () => {
      const date = new Date('2024-01-15');
      const result = formatDate(date);
      expect(result).toBeDefined();
    });

    it('should return "Invalid date" for invalid input', () => {
      const result = formatDate('invalid-date');
      expect(result).toBe('Invalid date');
    });
  });

  describe('getBookedDates', () => {
    it('should return empty array for undefined task', () => {
      const result = getBookedDates(undefined);
      expect(result).toEqual([]);
    });

    it('should return empty array for task without dates', () => {
      const task: TaskWithDates = {};
      const result = getBookedDates(task);
      expect(result).toEqual([]);
    });

    it('should return dates for start and end date range', () => {
      const task: TaskWithDates = {
        startDate: '2024-01-15',
        endDate: '2024-01-17',
      };
      const result = getBookedDates(task);
      expect(result).toHaveLength(3);
    });

    it('should return single date for dueDate', () => {
      const task: TaskWithDates = {
        dueDate: '2024-01-15',
      };
      const result = getBookedDates(task);
      expect(result).toHaveLength(1);
    });
  });
});
