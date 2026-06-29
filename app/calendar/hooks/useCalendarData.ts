'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { 
  getTasks, createTask, updateTask, deleteTask as deleteTaskApi,
  getEvents, createEvent, updateEvent, deleteEvent as deleteEventApi,
  getHolidays
} from '@/lib/supabase/calendar'
import { useToast } from '@/components/ui/use-toast'
import { createClient } from '@/lib/supabase/client'
// PDF upload/delete removed — using job order number/final report number instead
import { notifyStaffForTask, notifyStaffForEvent } from '@/lib/supabase/notifications'
import type { Task, Event, Holiday, ViewType, StaffInfo } from '@/app/calendar/types/calendar'

const computeTaskStatus = (data: {
  dateStart: string | null
  dateStop: string | null
  jobOrderNumber: string | null
  finalReportNumber: string | null
}) => {
  const hasJobOrder = !!data.jobOrderNumber
  const hasFinalReport = !!data.finalReportNumber
  
  if (hasJobOrder && hasFinalReport) return 'completed'
  if (!data.dateStart) return 'onhold'

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const dueDate = data.dateStop ? new Date(data.dateStop) : new Date(data.dateStart)
  dueDate.setHours(0, 0, 0, 0)

  const isDueDatePassed = dueDate < today
  if (isDueDatePassed && (!hasJobOrder || !hasFinalReport)) return 'incomplete'
  
  return 'in-progress'
}

export function useCalendarData(currentDate: Date, view: ViewType) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [staffMap, setStaffMap] = useState<{[key: string]: StaffInfo}>({})
  const [loadingStaff, setLoadingStaff] = useState(true)
  const { toast } = useToast()
  const supabase = createClient()
  const lastFetchRef = useRef<number>(0)
  const lastStaffFetchRef = useRef<number>(0)
  const isFetchingRef = useRef<boolean>(false)
  const staffMapRef = useRef<{[key: string]: StaffInfo}>({})

  useEffect(() => {
    try {
      const userData = localStorage.getItem('user')
      if (userData) {
        setUser(JSON.parse(userData))
      }
    } catch (e) {
      console.error('Error parsing user data:', e)
    }
  }, [])

  const getDefaultColor = useCallback((role: string) => {
    switch(role) {
      case 'admin':
        return 'purple'
      case 'staff':
        return 'blue'
      default:
        return 'gray'
    }
  }, [])

  const fetchAllStaff = useCallback(async (force: boolean = false) => {
    const now = Date.now()
    if (!force && (now - lastStaffFetchRef.current < 300000) && Object.keys(staffMapRef.current).length > 0) {
      console.log('👥 Using cached staff data')
      return staffMapRef.current
    }
    
    setLoadingStaff(true)
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, color, role, email, is_active')
        .eq('is_active', true)
        .order('name')
      
      if (error) throw error
      
      const staffMapping: {[key: string]: StaffInfo} = {}
      
      data?.forEach((user: { id: string; name: string; color?: string; role?: string; email?: string }) => {
        if (user.id && user.name) {
          const staffInfo: StaffInfo = {
            id: user.id,
            name: user.name,
            color: user.color || getDefaultColor(user.role || 'staff'),
            role: user.role,
            email: user.email
          }
          staffMapping[user.id] = staffInfo
          staffMapping[user.name] = staffInfo
        }
      })
      
      console.log('👥 Staff loaded:', Object.keys(staffMapping).length, 'entries')
      setStaffMap(staffMapping)
      staffMapRef.current = staffMapping
      lastStaffFetchRef.current = now
      return staffMapping
    } catch (error) {
      console.error('Error fetching staff:', error)
      return staffMapRef.current
    } finally {
      setLoadingStaff(false)
    }
  }, [supabase, getDefaultColor])

  const formatDate = useCallback((date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }, [])

  const getDateRange = useCallback(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    
    switch (view) {
      case 'day': {
        const dateStr = formatDate(currentDate)
        return { start: dateStr, end: dateStr }
      }
      case 'week': {
        const start = new Date(currentDate)
        start.setDate(currentDate.getDate() - currentDate.getDay())
        const end = new Date(start)
        end.setDate(start.getDate() + 6)
        return { start: formatDate(start), end: formatDate(end) }
      }
      case 'month': {
        const firstDay = new Date(year, month, 1)
        const lastDay = new Date(year, month + 1, 0)
        const extendedStart = new Date(firstDay)
        extendedStart.setDate(firstDay.getDate() - 7)
        const extendedEnd = new Date(lastDay)
        extendedEnd.setDate(lastDay.getDate() + 7)
        return { start: formatDate(extendedStart), end: formatDate(extendedEnd) }
      }
      case 'year': {
        const start = `${year}-01-01`
        const end = `${year}-12-31`
        return { start, end }
      }
      case 'schedule': {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const end = new Date(today)
        end.setMonth(today.getMonth() + 3)
        return { start: formatDate(today), end: formatDate(end) }
      }
      default:
        return { start: '', end: '' }
    }
  }, [currentDate, view, formatDate])

  const fetchData = useCallback(async () => {
    const now = Date.now()
    if (now - lastFetchRef.current < 500) {
      console.log('⏳ Fetch throttled, skipping...')
      return
    }
    
    if (isFetchingRef.current) {
      console.log('🔄 Fetch already in progress, skipping...')
      return
    }
    
    isFetchingRef.current = true
    
    try {
      const { start, end } = getDateRange()
      if (!start || !end) return
      
      console.log('🔄 Fetching data for range:', start, 'to', end)
      lastFetchRef.current = now
      
      const staffData = await fetchAllStaff()
      
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (tasksError) throw tasksError
      
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .gte('date_start', start)
        .lte('date_start', end)
        .order('date_start', { ascending: true })
      
      if (eventsError) throw eventsError
      
      const holidaysData = await getHolidays(start, end)
      
      const tasksInRange = tasksData?.filter((task: any) => 
        task.date_start && task.date_start >= start && task.date_start <= end
      ) || []

      console.log('📊 Data received:', {
        allTasks: tasksData?.length || 0,
        tasksInRange: tasksInRange.length,
        events: eventsData?.length || 0,
        holidays: holidaysData?.length || 0
      })

      const formattedTasks: Task[] = tasksData?.map((task: any) => {
        const supportIds = task.task_support_ids 
          ? (typeof task.task_support_ids === 'string' ? task.task_support_ids.split(',') : task.task_support_ids)
          : []
        const supportNames = task.task_support_names 
          ? (typeof task.task_support_names === 'string' ? task.task_support_names.split(',') : task.task_support_names)
          : []
        const supportColors = task.task_support_colors 
          ? (typeof task.task_support_colors === 'string' ? task.task_support_colors.split(',') : task.task_support_colors)
          : []
        const currentSupportNames = supportIds.map((id: string, index: number) =>
          staffData[id]?.name || supportNames[index] || ''
        )
        const currentSupportColors = supportIds.map((id: string, index: number) =>
          staffData[id]?.color || supportColors[index] || 'blue'
        )
        
        let picInfo = null
        if (task.task_pic_id) {
          picInfo = staffData[task.task_pic_id]
        } else if (task.task_pic_name) {
          picInfo = staffData[task.task_pic_name]
        }
        
        const computedStatus = computeTaskStatus({
          dateStart: task.date_start,
          dateStop: task.date_stop,
          jobOrderNumber: task.job_order_number,
          finalReportNumber: task.final_report_number,
        })
        
        return {
          id: task.id,
          clientName: task.client_name,
          runningNumber: task.running_number,
          jobTask: task.job_task,
          dateStart: task.date_start,
          dateStop: task.date_stop,
          timeStart: task.time_start,
          timeStop: task.time_stop,
          additionalRemark: task.additional_remark,
          jobOrderNumber: task.job_order_number || '',
          task_pic_id: task.task_pic_id || '',
          task_pic_name: picInfo?.name || task.task_pic_name || '',
          task_pic_color: picInfo?.color || task.task_pic_color || 'blue',
          task_support_ids: supportIds,
          task_support_names: currentSupportNames,
          task_support_colors: currentSupportColors,
          finalReportNumber: task.final_report_number || '',
          jobStatus: computedStatus,
          createdby: task.created_by,
          createdAt: task.created_at,
          updatedAt: task.updated_at
        }
      }) || []

      const formattedEvents: Event[] = eventsData?.map((event: any) => {
        const supportIds = event.event_support_ids 
          ? (typeof event.event_support_ids === 'string' ? event.event_support_ids.split(',') : event.event_support_ids)
          : []
        const supportNames = event.event_support_names 
          ? (typeof event.event_support_names === 'string' ? event.event_support_names.split(',') : event.event_support_names)
          : []
        const supportColors = event.event_support_colors 
          ? (typeof event.event_support_colors === 'string' ? event.event_support_colors.split(',') : event.event_support_colors)
          : []
        const currentSupportNames = supportIds.map((id: string, index: number) =>
          staffData[id]?.name || supportNames[index] || ''
        )
        const currentSupportColors = supportIds.map((id: string, index: number) =>
          staffData[id]?.color || supportColors[index] || 'purple'
        )
        
        let picInfo = null
        if (event.event_pic_id) {
          picInfo = staffData[event.event_pic_id]
        } else if (event.event_pic_name) {
          picInfo = staffData[event.event_pic_name]
        }
        
        return {
          id: event.id,
          title: event.title,
          description: event.description,
          dateStart: event.date_start,
          dateStop: event.date_stop,
          timeStart: event.time_start,
          timeStop: event.time_stop,
          location: event.location,
          event_pic_id: event.event_pic_id || '',
          event_pic_name: picInfo?.name || event.event_pic_name || '',
          event_pic_color: picInfo?.color || event.event_pic_color || 'purple',
          event_support_ids: supportIds,
          event_support_names: currentSupportNames,
          event_support_colors: currentSupportColors,
          createdby: event.created_by,
          createdAt: event.created_at,
          updatedAt: event.updated_at
        }
      }) || []

      setTasks(formattedTasks)
      setEvents(formattedEvents)
      setHolidays(holidaysData || [])
      
    } catch (error: any) {
      console.error('Error fetching data:', error)
      toast({
        title: "Error",
        description: error?.message || "Failed to fetch calendar data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      isFetchingRef.current = false
    }
  }, [getDateRange, toast, fetchAllStaff, supabase])

  useEffect(() => {
    const handleProfileUpdated = () => {
      lastStaffFetchRef.current = 0
      lastFetchRef.current = 0
      fetchAllStaff(true).then(() => {
        fetchData()
      })
    }

    window.addEventListener('user-profile-updated', handleProfileUpdated)
    return () => window.removeEventListener('user-profile-updated', handleProfileUpdated)
  }, [fetchAllStaff, fetchData])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Function to check if running number exists
  const checkRunningNumberExists = useCallback(async (runningNumber: string, excludeTaskId?: string): Promise<boolean> => {
    if (!runningNumber || runningNumber.trim() === '') return false
    
    try {
      let query = supabase
        .from('tasks')
        .select('running_number, id')
        .eq('running_number', runningNumber.trim())
      
      if (excludeTaskId) {
        query = query.neq('id', excludeTaskId)
      }
      
      const { data, error } = await query.maybeSingle()
      
      if (error) throw error
      return !!data
    } catch (error) {
      console.error('Error checking running number:', error)
      return false
    }
  }, [supabase])

  const saveTask = useCallback(async (taskData: any, selectedTask: Task | null, pdfFile?: File | null) => {
    try {
      console.log('💾 Saving task:', taskData)
      
      const startDate = taskData.date_start || taskData.dateStart || null

      // Get running number from user input - NO AUTO-GENERATION
      let runningNumber = taskData.running_number || taskData.runningNumber
      
      // Validate running number is provided
      if (!runningNumber || runningNumber.trim() === '') {
        throw new Error('Running number is required')
      }
      
      // Validate running number is unique (for new tasks)
      if (!selectedTask) {
        const exists = await checkRunningNumberExists(runningNumber)
        if (exists) {
          throw new Error(`Running number "${runningNumber}" already exists. Please use a different number.`)
        }
      } else {
        // For edit, check if different from original
        if (runningNumber !== selectedTask.runningNumber) {
          const exists = await checkRunningNumberExists(runningNumber, selectedTask.id)
          if (exists) {
            throw new Error(`Running number "${runningNumber}" already exists. Please use a different number.`)
          }
        }
      }

      const jobOrderNumber = taskData.job_order_number || taskData.jobOrderNumber || null
      const finalReportNumber = taskData.final_report_number || taskData.finalReportNumber || null

      const supportIds = taskData.task_support_ids 
        ? (Array.isArray(taskData.task_support_ids) ? taskData.task_support_ids.join(',') : taskData.task_support_ids)
        : null
      const supportNames = taskData.task_support_names 
        ? (Array.isArray(taskData.task_support_names) ? taskData.task_support_names.join(',') : taskData.task_support_names)
        : null
      const supportColors = taskData.task_support_colors 
        ? (Array.isArray(taskData.task_support_colors) ? taskData.task_support_colors.join(',') : taskData.task_support_colors)
        : null

      const computedStatus = computeTaskStatus({
        dateStart: startDate,
        dateStop: taskData.date_stop || taskData.dateStop || null,
        jobOrderNumber: jobOrderNumber,
        finalReportNumber: finalReportNumber,
      })

      const data = {
        client_name: taskData.client_name || taskData.clientName,
        running_number: runningNumber,
        job_task: taskData.job_task || taskData.jobTask || 'General Task',
        date_start: startDate,
        date_stop: taskData.date_stop || taskData.dateStop || null,
        time_start: taskData.time_start || taskData.timeStart || null,
        time_stop: taskData.time_stop || taskData.timeStop || null,
        additional_remark: taskData.additional_remark || taskData.additionalRemark || null,
        job_order_number: jobOrderNumber,
        task_pic_id: taskData.task_pic_id || null,
        task_pic_name: taskData.task_pic_name || null,
        task_pic_color: taskData.task_pic_color || 'blue',
        task_support_ids: supportIds,
        task_support_names: supportNames,
        task_support_colors: supportColors,
        final_report_number: finalReportNumber || null,
        job_status: computedStatus,
        created_by: user?.id,
        updated_at: new Date().toISOString()
      }

      if (!selectedTask) {
        Object.assign(data, { created_at: new Date().toISOString() })
      }

      let result
      if (selectedTask) {
        result = await updateTask(selectedTask.id, data)
      } else {
        result = await createTask(data)
      }

      console.log('✅ TASK SAVED RESULT:', result)
      
      if (result && result.id && startDate) {
        const assignedByName = user?.name || user?.email || 'Someone'
        
        const taskForNotification = {
          id: result.id,
          jobTask: result.job_task,
          clientName: result.client_name,
          taskPicStaff: result.task_pic_name,
          taskSupportStaff: result.task_support_names || '',
          date_start: result.date_start
        }
        
        console.log('📤 Task for notification:', taskForNotification)
        
        const action = selectedTask ? 'updated' : 'created'
        await notifyStaffForTask(taskForNotification, action, assignedByName)
        console.log('📨 Notifications sent for task')
      }

      await fetchData()
      
      toast({ 
        title: "Success", 
        description: `Task ${selectedTask ? 'updated' : 'created'} successfully` 
      })
      
      return result
      
    } catch (error: any) {
      // Only log unexpected errors, not validation errors
      if (!error.message?.includes('already exists')) {
        console.error('Error saving task:', error)
      }
      toast({ 
        title: "Error", 
        description: error?.message || "Failed to save task", 
        variant: "destructive" 
      })
      throw error
    }
  }, [user, fetchData, toast, checkRunningNumberExists])

  const deleteTask = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', id)
      if (error) throw error
      
      await fetchData()
      toast({ title: "Success", description: "Task deleted successfully" })
      
    } catch (error) {
      console.error('Error deleting task:', error)
      toast({ title: "Error", description: "Failed to delete task", variant: "destructive" })
      throw error
    }
  }, [supabase, fetchData, toast])

  const saveEvent = useCallback(async (eventData: any, selectedEvent: Event | null) => {
    try {
      console.log('💾 Saving event:', eventData)
      if (!user?.id) throw new Error('User not logged in')

      const startDate = eventData.date_start || eventData.dateStart
      if (!startDate) throw new Error('Start date is required for events')

      const supportIds = eventData.event_support_ids 
        ? (Array.isArray(eventData.event_support_ids) ? eventData.event_support_ids.join(',') : eventData.event_support_ids)
        : null
      const supportNames = eventData.event_support_names 
        ? (Array.isArray(eventData.event_support_names) ? eventData.event_support_names.join(',') : eventData.event_support_names)
        : null
      const supportColors = eventData.event_support_colors 
        ? (Array.isArray(eventData.event_support_colors) ? eventData.event_support_colors.join(',') : eventData.event_support_colors)
        : null

      const data = {
        title: eventData.title,
        description: eventData.description || null,
        date_start: startDate,
        date_stop: eventData.date_stop || eventData.dateStop || startDate,
        time_start: eventData.time_start || eventData.timeStart || null,
        time_stop: eventData.time_stop || eventData.timeStop || null,
        location: eventData.location || null,
        event_pic_id: eventData.event_pic_id || null,
        event_pic_name: eventData.event_pic_name || null,
        event_pic_color: eventData.event_pic_color || 'purple',
        event_support_ids: supportIds,
        event_support_names: supportNames,
        event_support_colors: supportColors,
        created_by: user.id,
        updated_at: new Date().toISOString()
      }

      if (!selectedEvent) {
        Object.assign(data, { created_at: new Date().toISOString() })
      }

      let result
      if (selectedEvent) {
        result = await updateEvent(selectedEvent.id, data)
      } else {
        result = await createEvent(data)
      }

      console.log('✅ EVENT SAVED RESULT:', result)

      if (result && result.id) {
        const assignedByName = user?.name || user?.email || 'Someone'
        
        const eventForNotification = {
          id: result.id,
          title: result.title,
          eventPicStaff: result.event_pic_name,
          eventSupportStaff: result.event_support_names || '',
          date_start: result.date_start
        }
        
        console.log('📤 Event for notification:', eventForNotification)
        
        const action = selectedEvent ? 'updated' : 'created'
        await notifyStaffForEvent(eventForNotification, action, assignedByName)
        console.log('📨 Notifications sent for event')
      }

      await fetchData()
      
      toast({ 
        title: "Success", 
        description: `Event ${selectedEvent ? 'updated' : 'created'} successfully` 
      })
      
      return result
      
    } catch (error: any) {
      console.error('Error saving event:', error)
      toast({ 
        title: "Error", 
        description: error?.message || "Failed to save event", 
        variant: "destructive" 
      })
      throw error
    }
  }, [user, fetchData, toast])

  const deleteEvent = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from('events').delete().eq('id', id)
      if (error) throw error
      
      await fetchData()
      toast({ title: "Success", description: "Event deleted successfully" })
      
    } catch (error) {
      console.error('Error deleting event:', error)
      toast({ title: "Error", description: "Failed to delete event", variant: "destructive" })
      throw error
    }
  }, [supabase, fetchData, toast])

  const getAllStaff = useCallback((): StaffInfo[] => {
    const uniqueStaff = new Map<string, StaffInfo>()
    Object.values(staffMap).forEach(staff => {
      if (staff.id && !uniqueStaff.has(staff.id)) {
        uniqueStaff.set(staff.id, staff)
      }
    })
    return Array.from(uniqueStaff.values())
  }, [staffMap])

  const getStaffById = useCallback((id: string): StaffInfo | null => {
    return staffMap[id] || null
  }, [staffMap])

  const getStaffDisplay = useCallback((staffId: string): { name: string, color: string } => {
    const staff = staffMap[staffId]
    if (!staff) return { name: 'Unknown', color: 'gray' }
    return { name: staff.name, color: staff.color }
  }, [staffMap])

  return {
    tasks,
    events,
    holidays,
    loading,
    loadingStaff,
    user,
    staffMap,
    getAllStaff,
    getStaffById,
    getStaffDisplay,
    saveTask,
    saveEvent,
    deleteTask,
    deleteEvent,
    refresh: fetchData,
    checkRunningNumberExists
  }
}
