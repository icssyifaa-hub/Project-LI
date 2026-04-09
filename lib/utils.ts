import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addDays,
  format,
} from 'date-fns'

// ============== EXISTING CN FUNCTION ==============
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ============== CALENDAR TYPES ==============
export type ViewType = 'day' | 'week' | 'month' | 'year' | 'schedule' | '4days'

export interface CalendarEvent {
  id: string
  title: string
  date: string
  start_time?: string
  end_time?: string
  color?: string
  description?: string
  location?: string
}

// ============== CALENDAR UTILS ==============
export function getDaysForView(date: Date, view: ViewType): Date[] {
  switch (view) {
    case 'day':
      return [date]
    
    case 'week':
      return eachDayOfInterval({
        start: startOfWeek(date, { weekStartsOn: 0 }),
        end: endOfWeek(date, { weekStartsOn: 0 })
      })
    
    case '4days':
      return Array.from({ length: 4 }, (_, i) => addDays(date, i))
    
    case 'month':
      return eachDayOfInterval({
        start: startOfMonth(date),
        end: endOfMonth(date)
      })

    case 'year':
      // Untuk year view, kita return first day of each month
      return Array.from({ length: 12 }, (_, i) => new Date(date.getFullYear(), i, 1))
    
    case 'schedule':
      return eachDayOfInterval({
        start: date,
        end: addDays(date, 6)
      })
    
    default:
      return [date]
  }
}

export function getEventsForDate(events: CalendarEvent[], date: Date): CalendarEvent[] {
  const dateStr = format(date, 'yyyy-MM-dd')
  return events.filter(event => event.date === dateStr)
}

export function getEventsForDateRange(
  events: CalendarEvent[], 
  startDate: Date, 
  endDate: Date
): Record<string, CalendarEvent[]> {
  const days = eachDayOfInterval({ start: startDate, end: endDate })
  const eventsByDate: Record<string, CalendarEvent[]> = {}
  
  days.forEach(day => {
    const dateStr = format(day, 'yyyy-MM-dd')
    eventsByDate[dateStr] = events.filter(event => event.date === dateStr)
  })
  
  return eventsByDate
}

export function formatTime(time?: string): string {
  if (!time) return ''
  return time.substring(0, 5) // Format HH:MM
}

// ============== DATE UTILS ==============
export function isToday(date: Date): boolean {
  return format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
}

export function formatDate(date: Date, formatStr: string = 'PPP'): string {
  return format(date, formatStr)
}