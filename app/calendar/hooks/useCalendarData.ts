'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  getTasks, createTask, updateTask, deleteTask as deleteTaskApi,
  getEvents, createEvent, updateEvent, deleteEvent as deleteEventApi,
  getHolidays
} from '@/lib/supabase/calendar'
import { useToast } from '@/components/ui/use-toast'
import { createClient } from '@/lib/supabase/client'
import type { Task, Event, Holiday, ViewType, StaffColor } from '@/types/calendar'

export function useCalendarData(currentDate: Date, view: ViewType) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [staffColors, setStaffColors] = useState<{[key: string]: StaffColor}>({})
  const [loadingStaff, setLoadingStaff] = useState(true)
  const { toast } = useToast()
  const supabase = createClient()

  // Load user from localStorage
  useEffect(() => {
    try {
      const userData = localStorage.getItem('user')
      if (userData) {
        setUser(JSON.parse(userData))
        console.log('👤 User loaded:', JSON.parse(userData))
      }
    } catch (e) {
      console.error('Error parsing user data:', e)
    }
  }, [])

  // ==================== FETCH STAFF COLORS ====================
  const fetchStaffColors = useCallback(async () => {
    setLoadingStaff(true)
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, user_id, color')
        .eq('role', 'staff')
        .not('color', 'is', null)
      
      if (error) throw error
      
      const colorMap: {[key: string]: StaffColor} = {}
      data?.forEach(user => {
        if (user.user_id && user.color) {
          colorMap[user.user_id] = {
            code: user.user_id,
            name: user.name,
            color: user.color,
            id: user.id
          }
        }
      })
      
      console.log('🎨 Staff colors loaded:', colorMap)
      setStaffColors(colorMap)
      return colorMap
    } catch (error) {
      console.error('Error fetching staff colors:', error)
      return {}
    } finally {
      setLoadingStaff(false)
    }
  }, [supabase])

  // ==================== GET DATE RANGE ====================
  const getDateRange = useCallback(() => {
    const formatDate = (date: Date) => {
      return date.toISOString().split('T')[0]
    }
    
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
        
        return {
          start: formatDate(start),
          end: formatDate(end)
        }
      }
      
      case 'month': {
        const firstDay = new Date(year, month, 1)
        const lastDay = new Date(year, month + 1, 0)
        
        return {
          start: formatDate(firstDay),
          end: formatDate(lastDay)
        }
      }
      
      case 'year':
        return {
          start: `${year}-01-01`,
          end: `${year}-12-31`
        }
        
      case 'schedule': {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        
        const end = new Date(today)
        end.setMonth(today.getMonth() + 3)
        
        return {
          start: formatDate(today),
          end: formatDate(end)
        }
      }
      
      default:
        return { start: '', end: '' }
    }
  }, [currentDate, view])

  // ==================== FETCH ALL DATA ====================
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const { start, end } = getDateRange()
      
      if (!start || !end) {
        setLoading(false)
        return
      }
      
      console.log('🔄 Fetching data for range:', start, 'to', end)
      
      const colors = await fetchStaffColors()
      
      const [tasksData, eventsData, holidaysData] = await Promise.all([
        getTasks(start, end),
        getEvents(start, end),
        getHolidays(start, end)
      ])

      console.log('📊 Data received:', {
        tasks: tasksData.length,
        events: eventsData.length,
        holidays: holidaysData.length
      })

      // ===== FORMAT TASKS WITH COLORS =====
      const formattedTasks = tasksData.map((task: any) => {
        const staffCode = task.task_pic_staff || ''
        const staff2Code = task.task_support_staff || ''
        
        const staffInfo = colors[staffCode]
        const staff2Info = staff2Code ? colors[staff2Code] : null
        
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
          pdfJobOrder: task.pdf_job_order,
          taskPicStaff: staffCode,
          taskSupportStaff: staff2Code,
          pdfFinalReport: task.pdf_final_report,
          finalReportStaff: task.final_report_staff,
          jobStatus: task.job_status,
          createdby: task.created_by,
          task_pic_color: staffInfo?.color || 'blue',
          task_pic_name: staffInfo?.name || staffCode,
          task_support_color: staff2Info?.color || null,
          task_support_name: staff2Info?.name || staff2Code
        }
      })

      // ===== FORMAT EVENTS WITH STAFF COLORS =====
      const formattedEvents = eventsData.map((event: any) => {
        const eventPicStaffCode = event.event_pic_staff || ''
        const eventSupportStaffCode = event.event_support_staff || ''
        const eventPicInfo = colors[eventPicStaffCode]
        const eventSupportInfo = eventSupportStaffCode ? colors[eventSupportStaffCode] : null
        return {
          id: event.id,
          title: event.title,
          description: event.description,
          dateStart: event.date_start,
          dateStop: event.date_stop,
          timeStart: event.time_start,
          timeStop: event.time_stop,
          location: event.location,
          createdby: event.created_by,
          eventPicStaff: eventPicStaffCode,
          eventSupportStaff: eventSupportStaffCode,
          creator_color: eventPicInfo?.color || 'purple',
          creator_name: eventPicInfo?.name || 'Unknown Creator',
          event_pic_color: eventPicInfo?.color || 'purple',
          event_pic_name: eventPicInfo?.name || eventPicStaffCode,
          event_support_color: eventSupportInfo?.color || null,
          event_support_name: eventSupportInfo?.name || eventSupportStaffCode
        }
      })

      setTasks(formattedTasks)
      setEvents(formattedEvents)
      setHolidays(holidaysData)
      
    } catch (error: any) {
      console.error('Error fetching data:', error)
      toast({
        title: "Error",
        description: error?.message || "Failed to fetch calendar data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [getDateRange, toast, fetchStaffColors])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ==================== GENERATE RUNNING NUMBER ====================
  const generateRunningNumber = async (date: Date) => {
    const year = date.getFullYear().toString().slice(-2)
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const prefix = `ICS${year}${month}`
    
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('running_number')
        .like('running_number', `${prefix}%`)
        .order('running_number', { ascending: false })
        .limit(1)
      
      if (error) throw error
      
      let nextNumber = 1
      if (data && data.length > 0) {
        const lastNumber = data[0].running_number
        const lastSeq = parseInt(lastNumber.slice(-3))
        if (!isNaN(lastSeq)) {
          nextNumber = lastSeq + 1
        }
      }
      
      const seq = nextNumber.toString().padStart(3, '0')
      return `${prefix}${seq}`
      
    } catch (error) {
      console.error('Error getting next running number:', error)
      return `${prefix}001`
    }
  }

  // ==================== SEND TASK NOTIFICATIONS ====================
const sendTaskNotifications = async (taskData: any, taskId: string) => {
  try {
    console.log('🔔 Sending notifications for task ID:', taskId);
    console.log('Task Data received:', taskData);
    
    // Check if we have any staff to notify
    const hasPIC = taskData.taskPicStaff && taskData.taskPicStaff !== '';
    const hasSupport = taskData.taskSupportStaff && taskData.taskSupportStaff.length > 0;
    
    if (!hasPIC && !hasSupport) {
      console.log('⚠️ No staff assigned to this task');
      return;
    }
    
    // Collect staff codes to notify
    const staffToNotify = [];
    
    if (hasPIC) {
      staffToNotify.push({ code: taskData.taskPicStaff, role: 'PIC' });
      console.log('📌 PIC Staff Code:', taskData.taskPicStaff);
    }
    
    if (hasSupport) {
      taskData.taskSupportStaff.forEach((code: string) => {
        if (code && code !== '') {
          staffToNotify.push({ code, role: 'Support' });
          console.log('👥 Support Staff Code:', code);
        }
      });
    }
    
    console.log('Total staff to notify:', staffToNotify.length);
    
    // Get user IDs from database
    const staffCodes = staffToNotify.map(s => s.code);
    console.log('Looking up user IDs for codes:', staffCodes);
    
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name, user_id')
      .in('user_id', staffCodes);
    
    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      toast({
        title: "Notification Error",
        description: "Failed to find staff members",
        variant: "destructive",
      });
      return;
    }
    
    if (!users || users.length === 0) {
      console.error('❌ No users found for codes:', staffCodes);
      toast({
        title: "Notification Error",
        description: `Staff not found in system: ${staffCodes.join(', ')}`,
        variant: "destructive",
      });
      return;
    }
    
    console.log('✅ Found users:', users);
    
    // Create notifications array
    const notifications = [];
    
    for (const user of users) {
      const staffInfo = staffToNotify.find(s => s.code === user.user_id);
      notifications.push({
        user_id: user.id,
        title: '📋 New Task Assignment',
        message: `You are ${staffInfo?.role || 'assigned'} for: ${taskData.clientName || 'New Task'}`,
        type: 'task_assignment',
        task_id: taskId,
        read: false,
        created_at: new Date().toISOString()
      });
    }
    
    console.log('📝 Preparing to insert notifications:', notifications);
    
    // Insert notifications
    const { data: inserted, error: insertError } = await supabase
      .from('notifications')
      .insert(notifications)
      .select();
    
    if (insertError) {
      console.error('❌ Failed to insert notifications:', insertError);
      toast({
        title: "Notification Error",
        description: insertError.message,
        variant: "destructive",
      });
      return;
    }
    
    console.log(`✅ Successfully sent ${notifications.length} notification(s)!`);
    console.log('Inserted notifications:', inserted);
    
    toast({
      title: "✅ Notifications Sent",
      description: `Task assigned to ${users.length} staff member(s)`,
    });
    
  } catch (error) {
    console.error('❌ Unexpected error in sendTaskNotifications:', error);
    toast({
      title: "Error",
      description: "Failed to send notifications",
      variant: "destructive",
    });
  }
};

  // ==================== SEND EVENT NOTIFICATIONS ====================
  const sendEventNotifications = async (eventData: any, eventId: string) => {
    try {
      console.log('📨 Sending notifications for event:', eventId)
      
      const staffToNotify = []
      
      if (eventData.eventPicStaff) {
        staffToNotify.push(eventData.eventPicStaff)
      }
      
      if (eventData.eventSupportStaff?.length) {
        staffToNotify.push(...eventData.eventSupportStaff)
      }

      if (staffToNotify.length === 0) return

      const { data: staffUsers, error: staffError } = await supabase
        .from('users')
        .select('id, user_id')
        .in('user_id', staffToNotify)

      if (staffError) throw staffError

      if (!staffUsers || staffUsers.length === 0) return

      const notifications = staffUsers.map(staff => ({
        user_id: staff.id,
        title: 'New Event Assignment',
        message: `You have been assigned to event: ${eventData.title}`,
        type: 'event_assignment',
        event_id: eventId,
        read: false,
        created_at: new Date().toISOString()
      }))

      const { error: notifError } = await supabase
        .from('notifications')
        .insert(notifications)

      if (notifError) throw notifError

      console.log('✅ Event notifications sent successfully')
      
    } catch (error) {
      console.error('Error sending event notifications:', error)
    }
  }

  // ==================== TASK FUNCTIONS ====================
  const saveTask = async (taskData: any, selectedTask: Task | null) => {
    try {
      console.log('💾 Saving task:', taskData)
      
      const startDate = taskData.date_start || taskData.dateStart
      if (!startDate) {
        throw new Error('Start date is required')
      }

      let runningNumber = taskData.running_number || taskData.runningNumber
      if (!runningNumber) {
        runningNumber = await generateRunningNumber(new Date(startDate))
      }

      const data = {
        client_name: taskData.client_name || taskData.clientName,
        running_number: runningNumber,
        job_task: taskData.job_task || taskData.jobTask || 'General Task',
        date_start: startDate,
        date_stop: taskData.date_stop || taskData.dateStop || startDate,
        time_start: taskData.time_start || taskData.timeStart || null,
        time_stop: taskData.time_stop || taskData.timeStop || null,
        additional_remark: taskData.additional_remark || taskData.additionalRemark || null,
        pdf_job_order: taskData.pdf_job_order || taskData.pdfJobOrderName || null,
        task_pic_staff: taskData.task_pic_staff || taskData.taskPicStaff,
        task_support_staff: taskData.task_support_staff || (taskData.taskSupportStaff?.join(',')),
        pdf_final_report: taskData.pdf_final_report || taskData.pdfFinalReportName || null,
        final_report_staff: null,
        job_status: taskData.job_status || taskData.jobStatus || 'in-progress',
        created_by: user?.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      console.log('📦 Task data for DB:', data)

      let result
      if (selectedTask) {
        result = await updateTask(selectedTask.id, data)
      } else {
        result = await createTask(data)
      }

      console.log('✅ Task saved:', result)
      
      if (!selectedTask) {
        await sendTaskNotifications(taskData, result.id)
      }
      
      await fetchData()
      
      toast({
        title: "Success",
        description: `Task ${selectedTask ? 'updated' : 'created'} successfully`,
      })
      
      return result
    } catch (error: any) {
      console.error('Error saving task:', error)
      toast({
        title: "Error",
        description: error?.message || "Failed to save task",
        variant: "destructive",
      })
      throw error
    }
  }

  const deleteTask = async (id: string) => {
    console.log('🗑️ Deleting task with ID:', id);
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      console.log('✅ Task deleted successfully');
      
      await fetchData();
      
      toast({
        title: "Success",
        description: "Task deleted successfully",
      });
    } catch (error) {
      console.error('❌ Error in deleteTask:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete task",
        variant: "destructive",
      });
      throw error;
    }
  }

  // ==================== EVENT FUNCTIONS ====================
  const saveEvent = async (eventData: any, selectedEvent: Event | null) => {
    try {
      console.log('💾 Saving event:', eventData)
      
      if (!user?.id) {
        throw new Error('User not logged in')
      }

      // Check for date_start (snake_case) or dateStart (camelCase)
      const startDate = eventData.date_start || eventData.dateStart
      if (!startDate) {
        console.error('No start date found in eventData:', eventData)
        throw new Error('Start date is required')
      }

      const data = {
        title: eventData.title,
        description: eventData.description || null,
        date_start: startDate,
        date_stop: eventData.date_stop || eventData.dateStop || startDate,
        time_start: eventData.time_start || eventData.timeStart || null,
        time_stop: eventData.time_stop || eventData.timeStop || null,
        location: eventData.location || null,
        event_pic_staff: eventData.event_pic_staff || eventData.eventPicStaff || null,
        event_support_staff: eventData.event_support_staff || eventData.eventSupportStaff || null,
        created_by: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      console.log('📦 Event data for DB:', data)

      let result
      if (selectedEvent) {
        result = await updateEvent(selectedEvent.id, data)
      } else {
        result = await createEvent(data)
      }

      console.log('✅ Event saved:', result)
      
      if (!selectedEvent && (eventData.event_pic_staff || eventData.eventPicStaff || (eventData.event_support_staff || eventData.eventSupportStaff))) {
        await sendEventNotifications(eventData, result.id)
      }
      
      await fetchData()
      
      toast({
        title: "Success",
        description: `Event ${selectedEvent ? 'updated' : 'created'} successfully`,
      })
      
      return result
    } catch (error: any) {
      console.error('Error saving event:', error)
      toast({
        title: "Error",
        description: error?.message || "Failed to save event",
        variant: "destructive",
      })
      throw error
    }
  }

  const deleteEvent = async (id: string) => {
    try {
      console.log('🗑️ Deleting event:', id)
      
      if (!id) {
        throw new Error('Event ID is required')
      }
      
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      console.log('✅ Event deleted successfully');
      
      await fetchData()
      
      toast({
        title: "Success",
        description: "Event deleted successfully",
      })
    } catch (error: any) {
      console.error('Error deleting event:', error)
      toast({
        title: "Error",
        description: error?.message || "Failed to delete event",
        variant: "destructive",
      })
      throw error
    }
  }

  // ==================== GET ALL STAFF WITH COLORS ====================
  const getAllStaffWithColors = useCallback(() => {
    return Object.values(staffColors)
  }, [staffColors])

  return {
    tasks,
    events,
    holidays,
    loading,
    loadingStaff,
    user,
    staffColors,
    getAllStaffWithColors,
    saveTask,
    saveEvent,
    deleteTask,
    deleteEvent,
    refresh: fetchData
  }
}