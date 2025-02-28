import { format, parseISO } from 'date-fns';

export function formatTaskDate(date: Date | string) {
  // Ensure we're working with a Date object
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'MMM d, yyyy');
}

export function formatDateForStorage(date: string | Date): string {
  // Convert to Date object if string
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  
  // Create date string in YYYY-MM-DD format
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  
  // Return ISO string but only take the date part
  return `${year}-${month}-${day}`;
}