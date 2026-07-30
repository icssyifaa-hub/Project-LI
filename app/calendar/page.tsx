'use client'

import { useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CalendarViews } from './components/CalendarViews'
import { useCalendarData } from '@/app/calendar/hooks/useCalendarData'
import AddCalendarItemModal from './components/AddCalendarItemModal'
import TaskInbox from './components/TaskInbox'
import CalendarFilter from './components/CalendarFilter'
import type { Task, Event, ViewType} from '@/app/calendar/types/calendar'
import type { UnscheduledTask } from './components/TaskInbox'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import NotificationsPanel from './components/NotificationsPanel'
import { createClient } from '@/lib/supabase/client'
import { getTaskJobGroupId } from '@/lib/job-groups'
import { getTaskClient, TASK_CLIENT_SELECT } from '@/lib/settings/task-client'
import { 
  Inbox, 
  ChevronRight, 
  ChevronLeft,
  CalendarDays,
  ChevronDown,
  Bell,
  Filter,
  X,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import { useUsers } from '@/app/settings-admin/hooks/useUsers'
import { useHolidays } from '@/app/settings-admin/hooks/useHolidays'

const STORAGE_KEYS = {
  STAFF_FILTERS: 'calendar_staff_filters',
  SHOW_HOLIDAYS: 'calendar_show_holidays',
  SHOW_FILTER: 'calendar_show_filter',
  SHOW_NOTIFICATIONS: 'calendar_show_notifications',
  SHOW_TASK_INBOX: 'calendar_show_task_inbox',
  VIEW: 'calendar_view',
}

const FOCUS_HIGHLIGHT_DURATION_MS = 5000
const CALENDAR_AUTO_REFRESH_MS = 5000

const createStableDate = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0)
}

const formatDateKey = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const isAdminUser = (user: any) => {
  const role = String(user?.role || '').toLowerCase()
  return role === 'admin' || role === 'superadmin'
}

interface StaffFilters {
  [staffId: string]: {
    tasks: boolean
    events: boolean
  }
}

interface ResponsiveCalendarPanelProps {
  title: string
  icon: ReactNode
  onClose: () => void
  children: ReactNode
  className?: string
}

function ResponsiveCalendarPanel({
  title,
  icon,
  onClose,
  children,
  className = '',
}: ResponsiveCalendarPanelProps) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 top-16 z-40 bg-black/40 p-2 sm:p-4 lg:static lg:z-auto lg:flex lg:bg-transparent lg:p-0"
      onClick={onClose}
    >
      <div
        className={`calendar-panel-surface mx-auto flex h-full min-h-0 w-full max-w-xl flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 lg:mx-0 lg:max-w-none lg:rounded-lg lg:shadow-none ${className}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800 lg:hidden">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200">
              {icon}
            </span>
            <h2 className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label={`Close ${title}`}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      </div>
    </div>
  )
}

const isMobileViewport = () =>
  typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches

export default function CalendarPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [currentDate, setCurrentDate] = useState(createStableDate(new Date()))
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedEndDate, setSelectedEndDate] = useState<Date | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [showItemModal, setShowItemModal] = useState(false)
  const [selectedItemType, setSelectedItemType] = useState<'event' | 'task' | null>(null)
  const [view, setView] = useState<ViewType>('month')
  const [draggedTask, setDraggedTask] = useState<UnscheduledTask | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [draggedOverDate, setDraggedOverDate] = useState<string | null>(null)
  const [showTaskInbox, setShowTaskInbox] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showFilter, setShowFilter] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [staffFilters, setStaffFilters] = useState<StaffFilters>({})
  const [showHolidays, setShowHolidays] = useState(false)
  const [prefilledTaskData, setPrefilledTaskData] = useState<any>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(0)
  const [inboxUnreadCount, setInboxUnreadCount] = useState(0)
  const [badgeCountsLoaded, setBadgeCountsLoaded] = useState(false)
  const [focusedDateKey, setFocusedDateKey] = useState<string | null>(null)
  const [focusedInboxTaskId, setFocusedInboxTaskId] = useState<string | null>(null)
  const [taskInboxRefreshKey, setTaskInboxRefreshKey] = useState(0)
  
  const { toast } = useToast()
  const supabase = createClient()
  
  const { 
    tasks, 
    events, 
    loading, 
    user,
    saveTask, 
    saveEvent, 
    deleteTask, 
    deleteEvent,
    refresh,
    refreshSilently,
  } = useCalendarData(currentDate, view)

  const { users: allUsers } = useUsers()
  const { holidays: allHolidays } = useHolidays()
  const refreshSilentlyRef = useRef(refreshSilently)
  const searchParamString = searchParams.toString()
  const userIdByName = useMemo(() => {
    const map = new Map<string, string>()

    allUsers.forEach(user => {
      const nameKey = user.name?.trim().toLowerCase()
      if (nameKey) {
        map.set(nameKey, user.id)
      }
    })

    return map
  }, [allUsers])

  useEffect(() => {
    localStorage.removeItem('notification_unread_count')
    localStorage.removeItem('inbox_unread_count')
  }, [])

  useEffect(() => {
    refreshSilentlyRef.current = refreshSilently
  }, [refreshSilently])

  useEffect(() => {
    if (!isInitialized || showItemModal) return

    const autoRefreshCalendar = () => {
      if (document.visibilityState !== 'visible') return
      void refreshSilentlyRef.current()
    }

    const intervalId = window.setInterval(autoRefreshCalendar, CALENDAR_AUTO_REFRESH_MS)
    return () => window.clearInterval(intervalId)
  }, [isInitialized, showItemModal])

  useEffect(() => {
    const fetchBadgeCounts = async () => {
      if (!user?.id) {
        setNotificationUnreadCount(0)
        setInboxUnreadCount(0)
        setBadgeCountsLoaded(true)
        return
      }

      setBadgeCountsLoaded(false)

      try {
        const notificationQuery = supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('read', false)

        const notificationResult = isAdminUser(user)
          ? await notificationQuery
          : await notificationQuery.eq('user_id', user.id)

        if (notificationResult.error) throw notificationResult.error

        const { count: inboxCount, error: inboxError } = await supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .is('date_start', null)

        if (inboxError) throw inboxError

        setNotificationUnreadCount(notificationResult.count || 0)
        setInboxUnreadCount(inboxCount || 0)
      } catch (error) {
        console.error('Error loading badge counts from database:', error)
      } finally {
        setBadgeCountsLoaded(true)
      }
    }

    fetchBadgeCounts()
  }, [user?.id, user?.role])

  useEffect(() => {
    if (!isInitialized) return

    const urlParams = new URLSearchParams(searchParamString)
    const dateFromUrl = urlParams.get('date')
    const focusFromUrl = urlParams.get('focus')
    const inboxFromUrl = urlParams.get('inbox')
    const taskFromUrl = urlParams.get('task')
    const viewFromUrl = urlParams.get('view') as ViewType | null

    if (!dateFromUrl && !focusFromUrl && inboxFromUrl !== '1' && !taskFromUrl) return

    if (inboxFromUrl === '1' || taskFromUrl) {
      setShowTaskInbox(true)
      setShowNotifications(false)
      if (taskFromUrl) {
        setFocusedInboxTaskId(taskFromUrl)
      }
    }

    if (dateFromUrl) {
      const [year, month, day] = dateFromUrl.split('-').map(Number)
      if (year && month && day) {
        const targetDate = createStableDate(new Date(year, month - 1, day))
        setCurrentDate(targetDate)
        setSelectedDate(targetDate)
        setSelectedEndDate(null)
      }
    }

    if (viewFromUrl && ['day', 'week', 'month', 'year', 'schedule'].includes(viewFromUrl)) {
      setView(viewFromUrl)
    }

    if (focusFromUrl) {
      setFocusedDateKey(focusFromUrl)

      urlParams.delete('focus')
      const newQuery = urlParams.toString()
      window.history.replaceState({}, '', `${window.location.pathname}${newQuery ? `?${newQuery}` : ''}`)
    }

    if (inboxFromUrl === '1' || taskFromUrl) {
      urlParams.delete('inbox')
      urlParams.delete('task')
      const newQuery = urlParams.toString()
      window.history.replaceState({}, '', `${window.location.pathname}${newQuery ? `?${newQuery}` : ''}`)
    }
  }, [isInitialized, searchParamString])

  useEffect(() => {
    if (!isInitialized) return

    const urlParams = new URLSearchParams(searchParamString)
    const followUpTaskId = urlParams.get('followUp')
    if (!followUpTaskId) return
    const shouldReturnToJobOrders = urlParams.get('returnTo') === 'job-orders'

    const openFollowUpModal = async () => {
      try {
        let { data, error } = await supabase
          .from('tasks')
          .select(TASK_CLIENT_SELECT)
          .eq('id', followUpTaskId)
          .maybeSingle()

        if (error) {
          const fallback = await supabase
            .from('tasks')
            .select('*')
            .eq('id', followUpTaskId)
            .maybeSingle()

          data = fallback.data
          error = fallback.error
        }

        if (error) throw error
        if (!data) throw new Error('Source task not found.')

        const client = getTaskClient(data)

        setSelectedDate(null)
        setSelectedEndDate(null)
        setSelectedTask(null)
        setSelectedEvent(null)
        setSelectedItemType('task')
        setPrefilledTaskData({
          clientName: client.client_name || '',
          clientId: client.id || '',
          location: client.location || '',
          address: client.address || '',
          jobTask: data.job_task || '',
          jobOrderNumber: data.job_order_number || '',
          jobGroupId: getTaskJobGroupId(data),
          followUpOfTaskId: data.id,
          sourceDateStart: data.date_start || null,
          sourceDateStop: data.date_stop || null,
          sourcePicName: data.task_pic_name || null,
          returnToJobOrders: shouldReturnToJobOrders,
        })
        setShowItemModal(true)
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error?.message || 'Failed to open follow-up task.',
          variant: 'destructive',
        })
      } finally {
        urlParams.delete('followUp')
        urlParams.delete('returnTo')
        const newQuery = urlParams.toString()
        window.history.replaceState({}, '', `${window.location.pathname}${newQuery ? `?${newQuery}` : ''}`)
      }
    }

    openFollowUpModal()
  }, [isInitialized, searchParamString, toast])

  useEffect(() => {
    if (!focusedDateKey) return

    const focusTimeoutId = setTimeout(() => {
      setFocusedDateKey(null)
    }, FOCUS_HIGHLIGHT_DURATION_MS)

    return () => clearTimeout(focusTimeoutId)
  }, [focusedDateKey])

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const taskIdFromUrl = urlParams.get('task')
    const eventIdFromUrl = urlParams.get('event')
    const highlightTaskId = localStorage.getItem('highlight_task_id') || taskIdFromUrl
    const highlightEventId = localStorage.getItem('highlight_event_id') || eventIdFromUrl
    
    if (highlightTaskId) {
      console.log('🔍 Looking for task to highlight:', highlightTaskId)
      
      const timeoutId = setTimeout(() => {
        let taskElement = document.querySelector(`[data-task-id="${highlightTaskId}"]`)
        
        if (!taskElement) {
          taskElement = document.querySelector(`[data-id="${highlightTaskId}"]`)
        }
        
        if (!taskElement) {
          taskElement = document.querySelector(`.task-item[data-id="${highlightTaskId}"]`)
        }
        
        if (taskElement) {
          console.log('✅ Found task element, highlighting...')
          taskElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
          taskElement.classList.add('ring-4', 'ring-blue-500', 'animate-pulse', 'bg-blue-100', 'shadow-lg')
          
          setTimeout(() => {
            taskElement?.classList.remove('ring-4', 'ring-blue-500', 'animate-pulse', 'bg-blue-100', 'shadow-lg')
          }, 3000)
        } else {
          console.warn('❌ Task element not found for ID:', highlightTaskId)
        }
        
        localStorage.removeItem('highlight_task_id')
        const newUrl = window.location.pathname
        window.history.replaceState({}, '', newUrl)
      }, 1000)
      
      return () => clearTimeout(timeoutId)
    }
    
    if (highlightEventId) {
      console.log('🔍 Looking for event to highlight:', highlightEventId)
      const timeoutId = setTimeout(() => {
        let eventElement = document.querySelector(`[data-event-id="${highlightEventId}"]`)
        
        if (!eventElement) {
          eventElement = document.querySelector(`[data-id="${highlightEventId}"]`)
        }
        
        if (!eventElement) {
          eventElement = document.querySelector(`.event-item[data-id="${highlightEventId}"]`)
        }
        
        if (eventElement) {
          console.log('✅ Found event element, highlighting...')
          eventElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
          eventElement.classList.add('ring-4', 'ring-purple-500', 'animate-pulse', 'bg-purple-100', 'shadow-lg')
          
          setTimeout(() => {
            eventElement?.classList.remove('ring-4', 'ring-purple-500', 'animate-pulse', 'bg-purple-100', 'shadow-lg')
          }, 3000)
        } else {
          console.warn('❌ Event element not found for ID:', highlightEventId)
        }
        localStorage.removeItem('highlight_event_id')
        const newUrl = window.location.pathname
        window.history.replaceState({}, '', newUrl)
      }, 1000)
      
      return () => clearTimeout(timeoutId)
    }
  }, [tasks, events, view, currentDate])

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const assignedStaffIds = [
        task.task_pic_id,
        userIdByName.get((task.task_pic_name || '').trim().toLowerCase()),
        ...(task.task_support_ids || []),
        ...(task.task_support_names || []).map(name => userIdByName.get(name.trim().toLowerCase())),
      ].filter((staffId): staffId is string => Boolean(staffId))

      if (assignedStaffIds.length === 0) return true

      return assignedStaffIds.some(staffId => staffFilters[staffId]?.tasks !== false)
    })
  }, [tasks, staffFilters, userIdByName])

  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      const assignedStaffIds = [
        event.event_pic_id,
        userIdByName.get((event.event_pic_name || '').trim().toLowerCase()),
        ...(event.event_support_ids || []),
        ...(event.event_support_names || []).map(name => userIdByName.get(name.trim().toLowerCase())),
      ].filter((staffId): staffId is string => Boolean(staffId))

      if (assignedStaffIds.length === 0) return true

      return assignedStaffIds.some(staffId => staffFilters[staffId]?.events !== false)
    })
  }, [events, staffFilters, userIdByName])

  const filteredHolidays = useMemo(() => {
    if (!showHolidays) return []
    
    return allHolidays.map(holiday => ({
      id: holiday.id,
      name: holiday.name,
      date: holiday.date,
      states: holiday.states || undefined
    }))
  }, [allHolidays, showHolidays])

  const viewOptions = useMemo(() => [
    { value: 'day', label: 'Day' },
    { value: 'week', label: 'Week' },
    { value: 'month', label: 'Month' },
    { value: 'year', label: 'Year' },
    { value: 'schedule', label: 'Schedule' },
  ], [])

  useEffect(() => {
    try {
      const savedStaffFilters = localStorage.getItem(STORAGE_KEYS.STAFF_FILTERS)
      if (savedStaffFilters) {
        const parsed = JSON.parse(savedStaffFilters)
        setStaffFilters(parsed)
        console.log('📂 Loaded staff filters:', parsed)
      }
      
      const savedHolidays = localStorage.getItem(STORAGE_KEYS.SHOW_HOLIDAYS)
      if (savedHolidays !== null) {
        setShowHolidays(JSON.parse(savedHolidays))
      }
      
      const savedShowFilter = localStorage.getItem(STORAGE_KEYS.SHOW_FILTER)
      if (savedShowFilter !== null) {
        setShowFilter(JSON.parse(savedShowFilter))
        console.log('📂 Loaded showFilter:', JSON.parse(savedShowFilter))
      }
      
      const savedShowNotifications = localStorage.getItem(STORAGE_KEYS.SHOW_NOTIFICATIONS)
      if (savedShowNotifications !== null) {
        setShowNotifications(JSON.parse(savedShowNotifications))
        console.log('📂 Loaded showNotifications:', JSON.parse(savedShowNotifications))
      }
      
      const savedShowTaskInbox = localStorage.getItem(STORAGE_KEYS.SHOW_TASK_INBOX)
      if (savedShowTaskInbox !== null) {
        setShowTaskInbox(JSON.parse(savedShowTaskInbox))
        console.log('📂 Loaded showTaskInbox:', JSON.parse(savedShowTaskInbox))
      }
      
      const urlParams = new URLSearchParams(window.location.search)
      const dateFromUrl = urlParams.get('date')
      const focusFromUrl = urlParams.get('focus')
      const viewFromUrl = urlParams.get('view') as ViewType | null
      const savedView = localStorage.getItem(STORAGE_KEYS.VIEW) as ViewType | null

      if (dateFromUrl) {
        const [year, month, day] = dateFromUrl.split('-').map(Number)
        if (year && month && day) {
          const targetDate = createStableDate(new Date(year, month - 1, day))
          setCurrentDate(targetDate)
          setSelectedDate(targetDate)

          if (focusFromUrl) {
            setFocusedDateKey(focusFromUrl)

            urlParams.delete('focus')
            const newQuery = urlParams.toString()
            window.history.replaceState({}, '', `${window.location.pathname}${newQuery ? `?${newQuery}` : ''}`)
          }
        }
      }

      if (viewFromUrl && ['day', 'week', 'month', 'year', 'schedule'].includes(viewFromUrl)) {
        setView(viewFromUrl)
      } else if (savedView && ['day', 'week', 'month', 'year', 'schedule'].includes(savedView)) {
        setView(savedView)
      }

    } catch (error) {
      console.error('Error loading state from localStorage:', error)
    } finally {
      setIsInitialized(true)
    }
  }, [])

  useEffect(() => {
    if (!isInitialized) return
    try {
      localStorage.setItem(STORAGE_KEYS.STAFF_FILTERS, JSON.stringify(staffFilters))
      console.log('💾 Saved staff filters:', staffFilters)
    } catch (error) {
      console.error('Error saving staff filters:', error)
    }
  }, [staffFilters, isInitialized])

  useEffect(() => {
    if (!isInitialized) return
    try {
      localStorage.setItem(STORAGE_KEYS.SHOW_HOLIDAYS, JSON.stringify(showHolidays))
    } catch (error) {
      console.error('Error saving holidays:', error)
    }
  }, [showHolidays, isInitialized])

  useEffect(() => {
    if (!isInitialized) return
    try {
      localStorage.setItem(STORAGE_KEYS.SHOW_FILTER, JSON.stringify(showFilter))
      console.log('💾 Saved showFilter:', showFilter)
    } catch (error) {
      console.error('Error saving showFilter:', error)
    }
  }, [showFilter, isInitialized])

  useEffect(() => {
    if (!isInitialized) return
    try {
      localStorage.setItem(STORAGE_KEYS.SHOW_NOTIFICATIONS, JSON.stringify(showNotifications))
      console.log('💾 Saved showNotifications:', showNotifications)
    } catch (error) {
      console.error('Error saving showNotifications:', error)
    }
  }, [showNotifications, isInitialized])

  useEffect(() => {
    if (!isInitialized) return
    try {
      localStorage.setItem(STORAGE_KEYS.SHOW_TASK_INBOX, JSON.stringify(showTaskInbox))
      console.log('💾 Saved showTaskInbox:', showTaskInbox)
    } catch (error) {
      console.error('Error saving showTaskInbox:', error)
    }
  }, [showTaskInbox, isInitialized])

  useEffect(() => {
    if (!isInitialized) return
    try {
      localStorage.setItem(STORAGE_KEYS.VIEW, view)
    } catch (error) {
      console.error('Error saving calendar view:', error)
    }
  }, [view, isInitialized])

  const handlePrev = useCallback(() => {
    const newDate = new Date(currentDate)
    switch (view) {
      case 'day': newDate.setDate(currentDate.getDate() - 1); break
      case 'week': newDate.setDate(currentDate.getDate() - 7); break
      case 'month': newDate.setMonth(currentDate.getMonth() - 1); break
      case 'year': newDate.setFullYear(currentDate.getFullYear() - 1); break
      case 'schedule': newDate.setMonth(currentDate.getMonth() - 1); break
    }
    newDate.setHours(12, 0, 0, 0)
    setCurrentDate(newDate)
  }, [currentDate, view])

  const handleNext = useCallback(() => {
    const newDate = new Date(currentDate)
    switch (view) {
      case 'day': newDate.setDate(currentDate.getDate() + 1); break
      case 'week': newDate.setDate(currentDate.getDate() + 7); break
      case 'month': newDate.setMonth(currentDate.getMonth() + 1); break
      case 'year': newDate.setFullYear(currentDate.getFullYear() + 1); break
      case 'schedule': newDate.setMonth(currentDate.getMonth() + 1); break
    }
    newDate.setHours(12, 0, 0, 0)
    setCurrentDate(newDate)
  }, [currentDate, view])

  const getTitle = useCallback(() => {
    switch (view) {
      case 'day':
        return currentDate.toLocaleDateString('default', { 
          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' 
        })
      case 'week': {
        const weekStart = new Date(currentDate)
        weekStart.setDate(currentDate.getDate() - currentDate.getDay())
        weekStart.setHours(12, 0, 0, 0)
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 6)
        weekEnd.setHours(12, 0, 0, 0)
        return `${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}`
      }
      case 'month':
        return currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })
      case 'year':
        return currentDate.getFullYear().toString()
      case 'schedule':
        return currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })
      default:
        return ''
    }
  }, [currentDate, view])

  const handleAddClick = useCallback((date: Date, endDate?: Date | null) => {
    const fixedDate = createStableDate(date)
    const fixedEndDate = endDate ? createStableDate(endDate) : null
    const startDate = fixedEndDate && fixedEndDate < fixedDate ? fixedEndDate : fixedDate
    const stopDate = fixedEndDate && fixedEndDate < fixedDate ? fixedDate : fixedEndDate

    setSelectedDate(startDate)
    setSelectedEndDate(stopDate && stopDate.getTime() !== startDate.getTime() ? stopDate : null)
    setSelectedTask(null)
    setSelectedEvent(null)
    setSelectedItemType(null)
    setPrefilledTaskData(null)
    setShowItemModal(true)
  }, [])

  const handleEditTask = useCallback((task: Task) => {
    setSelectedTask(task)
    setSelectedEvent(null)
    setSelectedDate(createStableDate(new Date(task.dateStart)))
    setSelectedEndDate(null)
    setSelectedItemType('task')
    setPrefilledTaskData(null)
    setShowItemModal(true)
  }, [])

  const handleEditEvent = useCallback((event: Event) => {
    setSelectedEvent(event)
    setSelectedTask(null)
    setSelectedDate(createStableDate(new Date(event.dateStart)))
    setSelectedEndDate(null)
    setSelectedItemType('event')
    setPrefilledTaskData(null)
    setShowItemModal(true)
  }, [])

  const handleDragStart = useCallback((task: UnscheduledTask) => {
    setDraggedTask(task)
    setIsDragging(true)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, date: Date) => {
    e.preventDefault()
    const dateKey = formatDateKey(date)
    setDraggedOverDate(dateKey)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, date: Date) => {
    e.preventDefault()
    
    if (draggedTask) {
      const dateStart = createStableDate(date)
      const dateStartValue = [
        dateStart.getFullYear(),
        String(dateStart.getMonth() + 1).padStart(2, '0'),
        String(dateStart.getDate()).padStart(2, '0'),
      ].join('-')

      setSelectedTask({
        id: draggedTask.id,
        clientName: draggedTask.clientName,
        clientId: draggedTask.clientId || '',
        location: draggedTask.location || '',
        address: draggedTask.address || '',
        jobTask: draggedTask.jobTask,
        dateStart: dateStartValue,
        dateStop: '',
        timeStart: draggedTask.timeStart || '',
        timeStop: draggedTask.timeStop || '',
        additionalRemark: draggedTask.additionalRemark || draggedTask.notes || '',
        jobGroupId: draggedTask.jobGroupId,
        jobOrderNumber: draggedTask.jobOrderNumber || '',
        finalReportNumber: draggedTask.finalReportNumber || '',
        jobStatus: draggedTask.jobStatus || 'onhold',
        task_pic_id: draggedTask.task_pic_id || '',
        task_pic_name: draggedTask.task_pic_name || '',
        task_pic_color: draggedTask.task_pic_color || 'blue',
        task_support_ids: draggedTask.task_support_ids || [],
        task_support_names: draggedTask.task_support_names || [],
        task_support_colors: draggedTask.task_support_colors || [],
      })
      
      setSelectedDate(dateStart)
      setSelectedEndDate(null)
      setSelectedEvent(null)
      setSelectedItemType('task')
      setPrefilledTaskData(null)
      setShowItemModal(true)
      setDraggedTask(null)
      setIsDragging(false)
      setDraggedOverDate(null)
    }
  }, [draggedTask])

  // ========== FIXED handleSaveItem - NO reminders ==========
  const handleSaveItem = useCallback(async (data: any, type: 'event' | 'task') => {
    if (isSaving) return
    setIsSaving(true)
    
    try {
      let finalData = data
      
      if (prefilledTaskData && type === 'task') {
        finalData = {
          ...data,
          client_name: data.client_name || prefilledTaskData.clientName,
          client_id: data.client_id || prefilledTaskData.clientId,
          location: data.location || prefilledTaskData.location,
          address: data.address || prefilledTaskData.address,
          job_task: data.job_task || prefilledTaskData.jobTask,
          task_pic_id: data.task_pic_id || prefilledTaskData.task_pic_id,
          task_pic_name: data.task_pic_name || prefilledTaskData.task_pic_name,
          task_pic_color: data.task_pic_color || prefilledTaskData.task_pic_color,
          job_group_id: data.job_group_id || prefilledTaskData.jobGroupId,
          job_order_number: data.job_order_number || prefilledTaskData.jobOrderNumber,
        }
      }
      const returnToJobOrdersGroupId = type === 'task' && prefilledTaskData?.returnToJobOrders
        ? finalData.job_group_id || prefilledTaskData.jobGroupId
        : null
      
      if (type === 'event') {
        await saveEvent(finalData, selectedEvent)
      } else {
        await saveTask(finalData, selectedTask)
      }
      
      setShowItemModal(false)
      setSelectedTask(null)
      setSelectedEvent(null)
      setSelectedDate(null)
      setPrefilledTaskData(null)
      await refresh()
      if (type === 'task') {
        setTaskInboxRefreshKey((key) => key + 1)
      }

      if (returnToJobOrdersGroupId) {
        router.push(`/job-orders?group=${encodeURIComponent(returnToJobOrdersGroupId)}&flash=1`)
      }
      
    } catch (error: any) {
      console.error('Error in handleSaveItem:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to save",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }, [isSaving, prefilledTaskData, saveEvent, saveTask, selectedEvent, selectedTask, refresh, router, toast])

  const handleDeleteItem = useCallback(async (id: string, type: 'event' | 'task') => {
    if (isDeleting) return
    setIsDeleting(true)
    
    try {
      if (type === 'event') {
        await deleteEvent(id)
      } else {
        await deleteTask(id)
      }
      
      setShowItemModal(false)
      setPrefilledTaskData(null)
      await refresh()
      
      toast({
        title: "Success",
        description: `${type === 'event' ? 'Event' : 'Task'} deleted successfully`,
      })
      
    } catch (error: any) {
      console.error('Error in handleDeleteItem:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }, [isDeleting, deleteEvent, deleteTask, refresh, toast])

  const handleStaffTaskToggle = useCallback((staffId: string, value: boolean) => {
    console.log('🎯 Toggle Task for staff:', staffId, value)
    setStaffFilters(prev => {
      const newFilters = { ...prev }
      const nextFilter = {
        tasks: value,
        events: prev[staffId]?.events ?? true
      }

      if (nextFilter.tasks && nextFilter.events) {
        delete newFilters[staffId]
      } else {
        newFilters[staffId] = nextFilter
      }
      console.log('📊 New staff filters:', newFilters)
      return newFilters
    })
  }, [])

  const handleStaffEventToggle = useCallback((staffId: string, value: boolean) => {
    console.log('🎯 Toggle Event for staff:', staffId, value)
    setStaffFilters(prev => {
      const newFilters = { ...prev }
      const nextFilter = {
        tasks: prev[staffId]?.tasks ?? true,
        events: value
      }

      if (nextFilter.tasks && nextFilter.events) {
        delete newFilters[staffId]
      } else {
        newFilters[staffId] = nextFilter
      }
      console.log('📊 New staff filters:', newFilters)
      return newFilters
    })
  }, [])

  const handleHolidaysToggle = useCallback(() => {
    setShowHolidays(prev => !prev)
  }, [])

  const handleFilterToggle = useCallback(() => {
    setShowFilter(prev => {
      const next = !prev
      if (next && isMobileViewport()) {
        setShowNotifications(false)
        setShowTaskInbox(false)
      }
      return next
    })
  }, [])

  const handleNotificationsToggle = useCallback(() => {
    setShowNotifications(prev => {
      const next = !prev
      if (next && isMobileViewport()) {
        setShowFilter(false)
        setShowTaskInbox(false)
      }
      return next
    })
  }, [])

  const handleTaskInboxToggle = useCallback(() => {
    setShowTaskInbox(prev => {
      const next = !prev
      if (next && isMobileViewport()) {
        setShowFilter(false)
        setShowNotifications(false)
      }
      return next
    })
  }, [])

  const filterUsers = useMemo(() => {
    return allUsers.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email || '',
      user_id: user.id,
      role: user.role,
      color: user.color || 'blue',
      created_at: user.created_at || new Date().toISOString()
    }))
  }, [allUsers])

  useEffect(() => {
    console.log('🔍 Debug - Staff Filters:', staffFilters)
    console.log('🔍 Debug - Total Tasks:', tasks.length)
    console.log('🔍 Debug - Filtered Tasks:', filteredTasks.length)
    console.log('🔍 Debug - Total Events:', events.length)
    console.log('🔍 Debug - Filtered Events:', filteredEvents.length)
  }, [staffFilters, tasks, events, filteredTasks, filteredEvents])

  const title = getTitle()

  return (
    <div className="calendar-page-shell flex min-h-[calc(100vh-4rem)] flex-col overflow-hidden bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100 lg:h-[calc(100vh-4rem)]">
      <div className="calendar-header-surface border-b border-gray-200 bg-white px-2 py-2 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:px-4">
        <div className="flex flex-col gap-2 sm:gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="grid min-w-0 grid-cols-[auto_auto_minmax(0,1fr)] items-center gap-2 sm:gap-4">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100 sm:text-xl">Calendar</h1>
            <div className="flex items-center gap-1 sm:gap-2">
              <Button variant="outline" size="icon" onClick={handlePrev} className="calendar-toolbar-button h-8 w-8 sm:h-9 sm:w-9">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={handleNext} className="calendar-toolbar-button h-8 w-8 sm:h-9 sm:w-9">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <span className="min-w-0 truncate text-sm font-medium text-gray-700 dark:text-gray-200 sm:text-lg">{title}</span>
          </div>

          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
            <Button
              variant={showFilter ? "default" : "outline"}
              onClick={handleFilterToggle}
              aria-label="Filter"
              className={`calendar-toolbar-button relative flex h-9 min-w-0 w-full items-center justify-center gap-2 px-2 sm:w-auto sm:px-4 ${showFilter ? 'calendar-toolbar-button-active' : ''}`}
            >
              <Filter className="h-4 w-4 shrink-0" />
              <span className="truncate">Filter</span>
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="calendar-toolbar-button flex h-9 min-w-0 w-full items-center justify-center gap-2 bg-white px-2 sm:w-auto sm:px-4">
                  <CalendarDays className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 truncate">{viewOptions.find(v => v.value === view)?.label}</span>
                  <ChevronDown className="h-4 w-4 shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="border border-gray-200 bg-white shadow-lg dark:border-gray-800 dark:bg-gray-900">
                {viewOptions.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => setView(option.value as ViewType)}
                    className={`cursor-pointer ${
                      view === option.value ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-200' : 'text-gray-700 dark:text-gray-200'
                    } hover:bg-gray-100 dark:hover:bg-gray-800`}
                  >
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant={showNotifications ? "default" : "outline"}
              onClick={handleNotificationsToggle}
              aria-label="Notifications"
              className={`calendar-toolbar-button relative flex h-9 min-w-0 w-full items-center justify-center gap-2 px-2 sm:w-auto sm:px-4 ${showNotifications ? 'calendar-toolbar-button-active' : ''}`}
            >
              <Bell className="h-4 w-4 shrink-0" />
              <span className="min-w-0 truncate">Notifications</span>
              {notificationUnreadCount > 0 && !showNotifications && badgeCountsLoaded && (
                <span className="notification-count-badge absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center px-1">
                  {notificationUnreadCount > 99 ? '99+' : notificationUnreadCount}
                </span>
              )}
            </Button>

            <Button
              variant={showTaskInbox ? "default" : "outline"}
              onClick={handleTaskInboxToggle}
              aria-label="Inbox"
              className={`calendar-toolbar-button relative flex h-9 min-w-0 w-full items-center justify-center gap-2 px-2 sm:w-auto sm:px-4 ${showTaskInbox ? 'calendar-toolbar-button-active' : ''}`}
            >
              <Inbox className="h-4 w-4 shrink-0" />
              <span className="min-w-0 truncate">Inbox</span>
              {inboxUnreadCount > 0 && !showTaskInbox && badgeCountsLoaded && (
                <span className="notification-count-badge absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center px-1">
                  {inboxUnreadCount > 99 ? '99+' : inboxUnreadCount}
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {showFilter && (
          <ResponsiveCalendarPanel
            title="Calendar filter"
            icon={<Filter className="h-4 w-4" />}
            onClose={() => setShowFilter(false)}
            className="lg:w-80 xl:w-96"
          >
            <CalendarFilter
              users={filterUsers}
              holidays={filteredHolidays}
              showHolidays={showHolidays}
              onHolidaysToggle={handleHolidaysToggle}
              staffTaskEventFilters={staffFilters}
              onStaffTaskToggle={handleStaffTaskToggle}
              onStaffEventToggle={handleStaffEventToggle}
            />
          </ResponsiveCalendarPanel>
        )}

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 py-3 lg:flex-row lg:gap-4 lg:overflow-hidden lg:px-4">
          <div className={`flex min-w-0 flex-col min-h-0 transition-all duration-300 ${
            showTaskInbox && showNotifications ? 'flex-[2]' : 
            showTaskInbox || showNotifications ? 'flex-[2.5]' : 'flex-1'
          }`}>
            <div className="min-h-[520px] flex-1 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-800 dark:bg-gray-950 sm:min-h-[560px] lg:min-h-0">
              {!isInitialized ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-sm text-gray-500 mt-2 dark:text-gray-400">Loading your preferences...</p>
                  </div>
                </div>
              ) : (
                <CalendarViews
                  view={view}
                  currentDate={currentDate}
                  tasks={filteredTasks}
                  events={filteredEvents}
                  holidays={filteredHolidays}
                  loading={loading}
                  onAddClick={handleAddClick}
                  onEditTask={handleEditTask}
                  onEditEvent={handleEditEvent}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  draggedOverDate={draggedOverDate}
                  isDragging={isDragging}
                  focusedDateKey={focusedDateKey}
                  staffTaskEventFilters={staffFilters}
                />
              )}
            </div>
          </div>

          <div className="flex min-h-0 w-full flex-col gap-3 lg:w-auto lg:flex-row lg:gap-4">
            {showNotifications && (
              <ResponsiveCalendarPanel
                title="Notifications"
                icon={<Bell className="h-4 w-4" />}
                onClose={() => setShowNotifications(false)}
                className="lg:w-80 xl:w-96"
              >
                <NotificationsPanel onUnreadCountChange={setNotificationUnreadCount} />
              </ResponsiveCalendarPanel>
            )}
            
            {showTaskInbox && (
              <ResponsiveCalendarPanel
                title="Task inbox"
                icon={<Inbox className="h-4 w-4" />}
                onClose={() => setShowTaskInbox(false)}
                className="lg:w-80 xl:w-96"
              >
                <TaskInbox 
                  onDragStart={handleDragStart}
                  onDragEnd={() => {
                    setIsDragging(false)
                    setDraggedTask(null)
                  }}
                  onTaskClick={(task) => {
                    setSelectedDate(null)
                    setSelectedEndDate(null)
                    setSelectedTask({
                      id: task.id,
                      clientName: task.clientName,
                      clientId: task.clientId || '',
                      location: task.location || '',
                      address: task.address || '',
                      jobTask: task.jobTask,
                      dateStart: '',
                      dateStop: '',
                      timeStart: task.timeStart || '',
                      timeStop: task.timeStop || '',
                      additionalRemark: task.additionalRemark || task.notes || '',
                      jobGroupId: task.jobGroupId,
                      jobOrderNumber: task.jobOrderNumber || '',
                      finalReportNumber: task.finalReportNumber || '',
                      jobStatus: task.jobStatus || 'onhold',
                      task_pic_id: task.task_pic_id || '',
                      task_pic_name: task.task_pic_name || '',
                      task_pic_color: task.task_pic_color || 'blue',
                      task_support_ids: task.task_support_ids || [],
                      task_support_names: task.task_support_names || [],
                      task_support_colors: task.task_support_colors || []
                    } as Task)
                    setSelectedItemType('task')
                    setPrefilledTaskData(null)
                    setShowItemModal(true)
                  }}
                  onTaskSaved={refresh}
                  onUnreadCountChange={setInboxUnreadCount}
                  refreshKey={taskInboxRefreshKey}
                  focusedTaskId={focusedInboxTaskId}
                  onFocusedTaskHandled={() => setFocusedInboxTaskId(null)}
                />
              </ResponsiveCalendarPanel>
            )}
          </div>
        </div>
      </div>

      <AddCalendarItemModal 
        isOpen={showItemModal}
        onClose={() => {
          setShowItemModal(false)
          setSelectedTask(null)
          setSelectedEvent(null)
          setSelectedItemType(null)
          setSelectedEndDate(null)
          setPrefilledTaskData(null)
          setIsSaving(false)
          setIsDeleting(false)
        }}
        selectedDate={selectedDate}
        selectedEndDate={selectedEndDate}
        selectedItem={selectedTask || selectedEvent}
        selectedType={selectedItemType}
        prefilledData={prefilledTaskData}
        onSave={handleSaveItem}
        onDelete={handleDeleteItem}
      />
    </div>
  )
}
