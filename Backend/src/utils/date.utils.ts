/**
 * Date utility functions for handling timezone conversions
 */

/**
 * Formats a date in Bangkok timezone (UTC+7)
 * @param date Date to format (can be string, Date, or null/undefined)
 * @returns Formatted date string in YYYY-MM-DDTHH:mm format in Bangkok timezone
 */
export function formatDateWithTimezone(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  
  try {
      // Convert to Date object if it's a string
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      
      if (isNaN(dateObj.getTime())) {
          console.warn('Invalid date provided to formatDateWithTimezone:', date);
          return null;
      }

      // Format to Bangkok time (UTC+7)
      return new Date(dateObj.getTime() + 7 * 60 * 60 * 1000)
          .toISOString()
          .replace('Z', '+07:00');
  } catch (error) {
      console.error('Error formatting date:', error);
      return null;
  }
}

/**
 * Processes an object and formats all Date properties with timezone info
 * @param obj Object to process
 * @returns New object with formatted dates
 */
export function processObjectDates<T>(obj: T): T {
  if (!obj || typeof obj !== 'object') return obj;
  
  if (obj instanceof Date) {
      return formatDateWithTimezone(obj) as any;
  }
  
  if (Array.isArray(obj)) {
      return obj.map(item => processObjectDates(item)) as any;
  }
  
  const result: any = {};
  for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
          const value = (obj as any)[key];
          
          // Process date fields
          if (key.toLowerCase().includes('date') || key.toLowerCase().includes('at')) {
              if (value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)))) {
                  result[key] = formatDateWithTimezone(value);
                  continue;
              }
          }
          
          // Process nested objects and arrays
          result[key] = processObjectDates(value);
      }
  }
  
  return result;
}

/**
 * Middleware to process response objects and format dates
 */
export function dateResponseFormatter(req: any, res: any, next: Function) {
  const originalJson = res.json;
  
  res.json = function(data: any) {
    if (data && typeof data === 'object') {
      // Process the data to format dates
      const processedData = processObjectDates(data);
      return originalJson.call(this, processedData);
    }
    return originalJson.call(this, data);
  };
  
  next();
}
