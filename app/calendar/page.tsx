'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { CalendarViews } from './components/CalendarViews'
import { useCalendarData } from '@/app/calendar/hooks/useCalendarData'
import AddCalendarItemModal from './AddCalendarItemModal'
import TaskInbox from './TaskInbox'
import CalendarFilter from './components/CalendarFilter'
import type { Task, Event, ViewType} from '@/app/calendar/types/calendar'
import type { UnscheduledTask } from './TaskInbox'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import NotificationsPanel from './NotificationsPanel'
import { createClient } from '@/lib/supabase/client'
import { 
  Inbox, 
  ChevronRight, 
  ChevronLeft,
  CalendarDays,
  ChevronDown,
  Bell,
  Filter,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import { useUsers } from '../settings/hooks/useUsers'
import { useHolidays } from '../settings/hooks/useHolidays'

const STORAGE_KEYS = {
  STAFF_FILTERS: 'calendar_staff_filters',
  SHOW_HOLIDAYS: 'calendar_show_holidays',
  SHOW_FILTER: 'calendar_show_filter',
  SHOW_NOTIFICATIONS: 'calendar_show_notifications',
  SHOW_TASK_INBOX: 'calendar_show_task_inbox',
  NOTIFICATION_BADGE_COUNT: 'notification_unread_count',
  INBOX_BADGE_COUNT: 'inbox_unread_count'
}

const createStableDate = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0)
}

interface StaffFilters {
  [staffId: string]: {
    tasks: boolean
    events: boolean
  }
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(createStableDate(new Date()))
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
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
  
  const { toast } = useToast()
  const supabase = createClient()
  
  const { 
    tasks, 
    events, 
    holidays,
    loading, 
    user,
    saveTask, 
    saveEvent, 
    deleteTask, 
    deleteEvent,
    refresh,
  } = useCalendarData(currentDate, view)

  const { users: allUsers, loading: loadingUsers } = useUsers()
  const { holidays: allHolidays, loading: loadingHolidays } = useHolidays()
  
  useEffect(() => {
    try {
      const savedNotificationCount = localStorage.getItem(STORAGE_KEYS.NOTIFICATION_BADGE_COUNT)
      const savedInboxCount = localStorage.getItem(STORAGE_KEYS.INBOX_BADGE_COUNT)
      
      if (savedNotificationCount !== null) {
        setNotificationUnreadCount(parseInt(savedNotificationCount))
        console.log('📂 Loaded notification badge count:', savedNotificationCount)
      }
      
      if (savedInboxCount !== null) {
        setInboxUnreadCount(parseInt(savedInboxCount))
        console.log('📂 Loaded inbox badge count:', savedInboxCount)
      }
    } catch (error) {
      console.error('Error loading badge counts from localStorage:', error)
    } finally {
      setBadgeCountsLoaded(true)
    }
  }, [])

  useEffect(() => {
    if (badgeCountsLoaded) {
      localStorage.setItem(STORAGE_KEYS.NOTIFICATION_BADGE_COUNT, notificationUnreadCount.toString())
      console.log('💾 Saved notification badge count:', notificationUnreadCount)
    }
  }, [notificationUnreadCount, badgeCountsLoaded])

  useEffect(() => {
    if (badgeCountsLoaded) {
      localStorage.setItem(STORAGE_KEYS.INBOX_BADGE_COUNT, inboxUnreadCount.toString())
      console.log('💾 Saved inbox badge count:', inboxUnreadCount)
    }
  }, [inboxUnreadCount, badgeCountsLoaded])

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
    if (Object.keys(staffFilters).length === 0) {
      return tasks
    }
    
    return tasks.filter(task => {
      if (task.task_pic_id && staffFilters[task.task_pic_id]?.tasks === true) {
        return true
      }
      
      const supportIds = task.task_support_ids || []
      for (const supportId of supportIds) {
        if (staffFilters[supportId]?.tasks === true) {
          return true
        }
      }
      
      return false
    })
  }, [tasks, staffFilters])

  const filteredEvents = useMemo(() => {
    if (Object.keys(staffFilters).length === 0) {
      return events
    }
    
    return events.filter(event => {
      if (event.event_pic_id && staffFilters[event.event_pic_id]?.events === true) {
        return true
      }
      
      const supportIds = event.event_support_ids || []
      for (const supportId of supportIds) {
        if (staffFilters[supportId]?.events === true) {
          return true
        }
      }
      
      return false
    })
  }, [events, staffFilters])

  const filteredHolidays = useMemo(() => {
    if (!showHolidays) return []
    
    return allHolidays.map(holiday => ({
      id: holiday.id,
      name: holiday.name,
      date: holiday.date,
      states: holiday.states || undefined
    }))
  }, [allHolidays, showHolidays])

  const activeFilterCount = useMemo(() => {
    return Object.values(staffFilters).filter(f => f.tasks || f.events).length + (showHolidays ? 1 : 0)
  }, [staffFilters, showHolidays])
  
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
        return 'Schedule'
      default:
        return ''
    }
  }, [currentDate, view])

  const handleDateClick = useCallback((date: Date) => {
    const fixedDate = createStableDate(date)
    setCurrentDate(fixedDate)
    setSelectedDate(fixedDate)
    setSelectedTask(null)
    setSelectedEvent(null)
    setSelectedItemType(null)
    setPrefilledTaskData(null)
    setShowItemModal(true)
  }, [])

  const handleAddClick = useCallback((date: Date) => {
    const fixedDate = createStableDate(date)
    setSelectedDate(fixedDate)
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
    setSelectedItemType('task')
    setPrefilledTaskData(null)
    setShowItemModal(true)
  }, [])

  const handleEditEvent = useCallback((event: Event) => {
    setSelectedEvent(event)
    setSelectedTask(null)
    setSelectedDate(createStableDate(new Date(event.dateStart)))
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
    const dateKey = date.toISOString().split('T')[0]
    setDraggedOverDate(dateKey)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, date: Date) => {
    e.preventDefault()
    
    if (draggedTask) {
      setPrefilledTaskData({
        clientName: draggedTask.clientName,
        jobTask: draggedTask.jobTask,
        task_pic_id: draggedTask.task_pic_id,     
        task_pic_name: draggedTask.task_pic_name, 
        task_pic_color: draggedTask.task_pic_color,
        jobOrderNumber: draggedTask.jobOrderNumber,
        runningNumber: draggedTask.runningNumber,
      })
      
      setSelectedDate(createStableDate(date))
      setSelectedTask(null)
      setSelectedEvent(null)
      setSelectedItemType('task')
      setShowItemModal(true)
      setDraggedTask(null)
      setIsDragging(false)
      setDraggedOverDate(null)
    }
  }, [draggedTask])

  const handleDragLeave = useCallback(() => {
    setDraggedOverDate(null)
  }, [])

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
          job_task: data.job_task || prefilledTaskData.jobTask,
          task_pic_id: data.task_pic_id || prefilledTaskData.task_pic_id,
          task_pic_name: data.task_pic_name || prefilledTaskData.task_pic_name,
          task_pic_color: data.task_pic_color || prefilledTaskData.task_pic_color,
          running_number: data.running_number || prefilledTaskData.runningNumber,
          job_order_number: data.job_order_number || prefilledTaskData.jobOrderNumber,
          // PDFs removed: job order URL no longer used
        }
      }
      
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
  }, [isSaving, prefilledTaskData, saveEvent, saveTask, selectedEvent, selectedTask, refresh, toast])

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
      const newFilters = {
        ...prev,
        [staffId]: {
          tasks: value,
          events: prev[staffId]?.events || false
        }
      }
      console.log('📊 New staff filters:', newFilters)
      return newFilters
    })
  }, [])

  const handleStaffEventToggle = useCallback((staffId: string, value: boolean) => {
    console.log('🎯 Toggle Event for staff:', staffId, value)
    setStaffFilters(prev => {
      const newFilters = {
        ...prev,
        [staffId]: {
          tasks: prev[staffId]?.tasks || false,
          events: value
        }
      }
      console.log('📊 New staff filters:', newFilters)
      return newFilters
    })
  }, [])

  const handleHolidaysToggle = useCallback(() => {
    setShowHolidays(prev => !prev)
  }, [])

  const handleFilterToggle = useCallback(() => {
    setShowFilter(prev => !prev)
  }, [])

  const handleNotificationsToggle = useCallback(() => {
    setShowNotifications(prev => !prev)
  }, [])

  const handleTaskInboxToggle = useCallback(() => {
    setShowTaskInbox(prev => !prev)
  }, [])

  const filterUsers = useMemo(() => {
    return allUsers.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email || '',
      password: user.password || '',
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
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      <div className="bg-white border-b border-gray-200 px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-gray-900">Calendar</h1>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="icon" onClick={handlePrev} className="bg-white">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={handleNext} className="bg-white">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <span className="text-lg font-medium text-gray-700">{title}</span>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant={showFilter ? "default" : "outline"}
              onClick={handleFilterToggle}
              className="flex items-center space-x-2 relative"
            >
              <Filter className="h-4 w-4" />
              <span>Filter</span>
              {activeFilterCount > 0 && !showFilter && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-blue-600 text-white text-[10px] rounded-full flex items-center justify-center px-1">
                  {activeFilterCount > 99 ? '99+' : activeFilterCount}
                </span>
              )}
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center space-x-2 bg-white">
                  <CalendarDays className="h-4 w-4" />
                  <span>{viewOptions.find(v => v.value === view)?.label}</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="bg-white border border-gray-200 shadow-lg">
                {viewOptions.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => setView(option.value as ViewType)}
                    className={`cursor-pointer ${
                      view === option.value ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                    } hover:bg-gray-100`}
                  >
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant={showNotifications ? "default" : "outline"}
              onClick={handleNotificationsToggle}
              className="flex items-center space-x-2 relative"
            >
              <Bell className="h-4 w-4" />
              <span>Notifications</span>
              {notificationUnreadCount > 0 && !showNotifications && badgeCountsLoaded && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center px-1">
                  {notificationUnreadCount > 99 ? '99+' : notificationUnreadCount}
                </span>
              )}
            </Button>

            <Button
              variant={showTaskInbox ? "default" : "outline"}
              onClick={handleTaskInboxToggle}
              className="flex items-center space-x-2 relative"
            >
              <Inbox className="h-4 w-4" />
              <span>Inbox</span>
              {inboxUnreadCount > 0 && !showTaskInbox && badgeCountsLoaded && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center px-1">
                  {inboxUnreadCount > 99 ? '99+' : inboxUnreadCount}
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {showFilter && (
          <CalendarFilter
            users={filterUsers}
            holidays={filteredHolidays}
            showHolidays={showHolidays}
            onHolidaysToggle={handleHolidaysToggle}
            staffTaskEventFilters={staffFilters}
            onStaffTaskToggle={handleStaffTaskToggle}
            onStaffEventToggle={handleStaffEventToggle}
          />
        )}

        <div className="flex-1 flex min-h-0 px-4 py-3 gap-4">
          <div className={`flex flex-col min-h-0 transition-all duration-300 ${
            showTaskInbox && showNotifications ? 'flex-[2]' : 
            showTaskInbox || showNotifications ? 'flex-[2.5]' : 'flex-1'
          }`}>
            <div className="flex-1 min-h-0 bg-white border rounded-lg shadow-lg overflow-hidden">
              {!isInitialized ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-sm text-gray-500 mt-2">Loading your preferences...</p>
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
                  onDateClick={handleDateClick}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onDragLeave={handleDragLeave}
                  draggedOverDate={draggedOverDate}
                  isDragging={isDragging}
                  staffTaskEventFilters={staffFilters}
                />
              )}
            </div>
          </div>

          <div className="flex gap-4">
            {showNotifications && (
              <div className="w-80 flex flex-col min-h-0">
                <NotificationsPanel onUnreadCountChange={setNotificationUnreadCount} />
              </div>
            )}
            
            {showTaskInbox && (
              <div className="w-80 flex flex-col min-h-0">
                <TaskInbox 
                  onDragStart={handleDragStart}
                  onDragEnd={() => {
                    setIsDragging(false)
                    setDraggedTask(null)
                  }}
                  onTaskClick={(task) => {
                    setSelectedDate(null)
                    setSelectedTask({
                      id: task.id,
                      clientName: task.clientName,
                      runningNumber: task.runningNumber || '',
                      jobTask: task.jobTask,
                      dateStart: '',
                      dateStop: '',
                      timeStart: '',
                      timeStop: '',
                      additionalRemark: task.notes || '',
                      jobOrderNumber: task.jobOrderNumber || '',
                      jobStatus: 'in-progress',
                      task_pic_id: task.task_pic_id || '',
                      task_pic_name: task.task_pic_name || '',
                      task_pic_color: task.task_pic_color || 'blue',
                      task_support_ids: [],
                      task_support_names: [],
                      task_support_colors: []
                    } as Task)
                    setSelectedItemType('task')
                    setPrefilledTaskData(null)
                    setShowItemModal(true)
                  }}
                  onTaskSaved={refresh}
                  onUnreadCountChange={setInboxUnreadCount}
                />
              </div>
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
          setPrefilledTaskData(null)
          setIsSaving(false)
          setIsDeleting(false)
        }}
        selectedDate={selectedDate}
        selectedItem={selectedTask || selectedEvent}
        selectedType={selectedItemType}
        prefilledData={prefilledTaskData}
        onSave={handleSaveItem}
        onDelete={handleDeleteItem}
      />
    </div>
  )
}
