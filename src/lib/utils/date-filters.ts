import { startOfWeek, endOfWeek, addWeeks, isWithinInterval } from 'date-fns';

export function isThisWeek(date: Date): boolean {
  const start = startOfWeek(new Date());
  const end = endOfWeek(new Date());
  return isWithinInterval(date, { start, end });
}

export function isNextWeek(date: Date): boolean {
  const nextWeekStart = startOfWeek(addWeeks(new Date(), 1));
  const nextWeekEnd = endOfWeek(addWeeks(new Date(), 1));
  return isWithinInterval(date, { start: nextWeekStart, end: nextWeekEnd });
}