import { createClient } from './client'

const getCurrentUserId = (): string | null => {
  try {
    const userData = localStorage.getItem('user')
    if (userData) {
      const user = JSON.parse(userData)
      return user.id || null
    }
  } catch (e) {
    console.error('Error getting user from localStorage:', e)
  }
  return null
}

// ==================== TASKS ====================

export async function getTasks(startDate: string, endDate: string) {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .gte('date_start', startDate)
      .lte('date_start', endDate)
      .order('date_start', { ascending: true })
    
    if (error) throw error
    
    const formattedTasks = data?.map((task: any) => {
      const supportIds = task.task_support_ids 
        ? (typeof task.task_support_ids === 'string' ? task.task_support_ids.split(',') : task.task_support_ids)
        : []
      const supportNames = task.task_support_names 
        ? (typeof task.task_support_names === 'string' ? task.task_support_names.split(',') : task.task_support_names)
        : []
      const supportColors = task.task_support_colors 
        ? (typeof task.task_support_colors === 'string' ? task.task_support_colors.split(',') : task.task_support_colors)
        : []
      
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
        task_pic_name: task.task_pic_name || '',
        task_pic_color: task.task_pic_color || 'blue',
        task_support_ids: supportIds,
        task_support_names: supportNames,
        task_support_colors: supportColors,
        finalReportNumber: task.final_report_number || '',
        jobStatus: task.job_status || 'in-progress',
        createdby: task.created_by,
        createdAt: task.created_at,
        updatedAt: task.updated_at
      }
    }) || []
    
    return formattedTasks
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return []
  }
}

export async function createTask(taskData: any) {
  const supabase = createClient()
  
  try {
    console.log('🔍 CREATING TASK:', taskData)
    
    if (!taskData.client_name && !taskData.clientName) {
      throw new Error('client_name is required')
    }
    
    const userId = getCurrentUserId()
    console.log('👤 Creating task with userId:', userId)
    
    const taskSupportIdsString = taskData.task_support_ids 
      ? (Array.isArray(taskData.task_support_ids) ? taskData.task_support_ids.join(',') : taskData.task_support_ids)
      : null
    
    const taskSupportNamesString = taskData.task_support_names 
      ? (Array.isArray(taskData.task_support_names) ? taskData.task_support_names.join(',') : taskData.task_support_names)
      : null
    
    const taskSupportColorsString = taskData.task_support_colors 
      ? (Array.isArray(taskData.task_support_colors) ? taskData.task_support_colors.join(',') : taskData.task_support_colors)
      : null
    
    const dataToInsert = {
      client_name: taskData.client_name || taskData.clientName,
      running_number: taskData.running_number || taskData.runningNumber,
      job_task: taskData.job_task || taskData.jobTask || 'General Task',
      date_start: taskData.date_start || taskData.dateStart || null,
      date_stop: taskData.date_stop || taskData.dateStop || null,
      time_start: taskData.time_start || taskData.timeStart || null,
      time_stop: taskData.time_stop || taskData.timeStop || null,
      additional_remark: taskData.additional_remark || taskData.additionalRemark || null,
      job_order_number: taskData.job_order_number || taskData.jobOrderNumber || null,
      task_pic_id: taskData.task_pic_id || null,
      task_pic_name: taskData.task_pic_name || taskData.taskPicName || null,
      task_pic_color: taskData.task_pic_color || taskData.taskPicColor || 'blue',
      task_support_ids: taskSupportIdsString,
      task_support_names: taskSupportNamesString,
      task_support_colors: taskSupportColorsString,
      final_report_number: taskData.final_report_number || taskData.finalReportNumber || null,
      job_status: taskData.job_status || taskData.jobStatus || (taskData.date_start || taskData.dateStart ? 'in-progress' : 'onhold'),
      created_by: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    const { data, error } = await supabase
      .from('tasks')
      .insert([dataToInsert])
      .select()
      .single()
    
    if (error) throw error
    
    console.log('✅ Task created successfully:', data.id)
    return data
  } catch (error) {
    console.error('❌ Error in createTask:', error)
    throw error
  }
}

export async function updateTask(id: string, taskData: any) {
  const supabase = createClient()
  
  try {
    const pickValue = (snakeKey: string, camelKey: string, fallback: any = null) => {
      if (Object.prototype.hasOwnProperty.call(taskData, snakeKey)) return taskData[snakeKey]
      if (Object.prototype.hasOwnProperty.call(taskData, camelKey)) return taskData[camelKey]
      return fallback
    }

    const taskSupportIdsString = taskData.task_support_ids 
      ? (Array.isArray(taskData.task_support_ids) ? taskData.task_support_ids.join(',') : taskData.task_support_ids)
      : null
    
    const taskSupportNamesString = taskData.task_support_names 
      ? (Array.isArray(taskData.task_support_names) ? taskData.task_support_names.join(',') : taskData.task_support_names)
      : null
    
    const taskSupportColorsString = taskData.task_support_colors 
      ? (Array.isArray(taskData.task_support_colors) ? taskData.task_support_colors.join(',') : taskData.task_support_colors)
      : null
    
    const { data, error } = await supabase
      .from('tasks')
      .update({
        client_name: pickValue('client_name', 'clientName'),
        running_number: pickValue('running_number', 'runningNumber'),
        job_task: pickValue('job_task', 'jobTask'),
        date_start: pickValue('date_start', 'dateStart'),
        date_stop: pickValue('date_stop', 'dateStop'),
        time_start: pickValue('time_start', 'timeStart'),
        time_stop: pickValue('time_stop', 'timeStop'),
        additional_remark: pickValue('additional_remark', 'additionalRemark'),
        job_order_number: pickValue('job_order_number', 'jobOrderNumber'),
        task_pic_id: taskData.task_pic_id || null,
        task_pic_name: pickValue('task_pic_name', 'taskPicName'),
        task_pic_color: pickValue('task_pic_color', 'taskPicColor'),
        task_support_ids: taskSupportIdsString,
        task_support_names: taskSupportNamesString,
        task_support_colors: taskSupportColorsString,
        final_report_number: pickValue('final_report_number', 'finalReportNumber'),
        job_status: pickValue('job_status', 'jobStatus'),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    
    console.log('✅ Task updated successfully:', data.id)
    return data
  } catch (error) {
    console.error('❌ Error in updateTask:', error)
    throw error
  }
}

export async function deleteTask(id: string) {
  const supabase = createClient()
  
  try {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    return true
  } catch (error) {
    console.error('❌ Error in deleteTask:', error)
    throw error
  }
}

// ==================== EVENTS ====================

export async function getEvents(startDate: string, endDate: string) {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .gte('date_start', startDate)
      .lte('date_start', endDate)
      .order('date_start', { ascending: true })
    
    if (error) throw error
    
    const formattedEvents = data?.map((event: any) => {
      const supportIds = event.event_support_ids 
        ? (typeof event.event_support_ids === 'string' ? event.event_support_ids.split(',') : event.event_support_ids)
        : []
      const supportNames = event.event_support_names 
        ? (typeof event.event_support_names === 'string' ? event.event_support_names.split(',') : event.event_support_names)
        : []
      const supportColors = event.event_support_colors 
        ? (typeof event.event_support_colors === 'string' ? event.event_support_colors.split(',') : event.event_support_colors)
        : []
      
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
        event_pic_name: event.event_pic_name || '',
        event_pic_color: event.event_pic_color || 'purple',
        event_support_ids: supportIds,
        event_support_names: supportNames,
        event_support_colors: supportColors,
        createdby: event.created_by,
        createdAt: event.created_at,
        updatedAt: event.updated_at
      }
    }) || []
    
    return formattedEvents
  } catch (error) {
    console.error('Error fetching events:', error)
    return []
  }
}

export async function createEvent(eventData: any) {
  const supabase = createClient()
  
  try {
    console.log('🔍 CREATING EVENT:', eventData)
    
    if (!eventData.date_start && !eventData.dateStart) {
      throw new Error('date_start is required')
    }
    
    const userId = getCurrentUserId()
    console.log('👤 Creating event with userId:', userId)
    
    const eventSupportIdsString = eventData.event_support_ids 
      ? (Array.isArray(eventData.event_support_ids) ? eventData.event_support_ids.join(',') : eventData.event_support_ids)
      : null
    
    const eventSupportNamesString = eventData.event_support_names 
      ? (Array.isArray(eventData.event_support_names) ? eventData.event_support_names.join(',') : eventData.event_support_names)
      : null
    
    const eventSupportColorsString = eventData.event_support_colors 
      ? (Array.isArray(eventData.event_support_colors) ? eventData.event_support_colors.join(',') : eventData.event_support_colors)
      : null
    
    const dataToInsert = {
      title: eventData.title,
      description: eventData.description || null,
      date_start: eventData.date_start || eventData.dateStart,
      date_stop: eventData.date_stop || eventData.dateStop || eventData.date_start || eventData.dateStart,
      time_start: eventData.time_start || eventData.timeStart || null,
      time_stop: eventData.time_stop || eventData.timeStop || null,
      location: eventData.location || null,
      event_pic_id: eventData.event_pic_id || null,
      event_pic_name: eventData.event_pic_name || null,
      event_pic_color: eventData.event_pic_color || 'purple',
      event_support_ids: eventSupportIdsString,
      event_support_names: eventSupportNamesString,
      event_support_colors: eventSupportColorsString,
      created_by: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    const { data, error } = await supabase
      .from('events')
      .insert([dataToInsert])
      .select()
      .single()
    
    if (error) throw error
    
    console.log('✅ Event created successfully:', data.id)
    return data
  } catch (error) {
    console.error('❌ Error in createEvent:', error)
    throw error
  }
}

export async function updateEvent(id: string, eventData: any) {
  const supabase = createClient()
  
  try {
    const eventSupportIdsString = eventData.event_support_ids 
      ? (Array.isArray(eventData.event_support_ids) ? eventData.event_support_ids.join(',') : eventData.event_support_ids)
      : null
    
    const eventSupportNamesString = eventData.event_support_names 
      ? (Array.isArray(eventData.event_support_names) ? eventData.event_support_names.join(',') : eventData.event_support_names)
      : null
    
    const eventSupportColorsString = eventData.event_support_colors 
      ? (Array.isArray(eventData.event_support_colors) ? eventData.event_support_colors.join(',') : eventData.event_support_colors)
      : null
    
    const { data, error } = await supabase
      .from('events')
      .update({
        title: eventData.title,
        description: eventData.description,
        date_start: eventData.date_start || eventData.dateStart,
        date_stop: eventData.date_stop || eventData.dateStop,
        time_start: eventData.time_start || eventData.timeStart,
        time_stop: eventData.time_stop || eventData.timeStop,
        location: eventData.location,
        event_pic_id: eventData.event_pic_id || null,
        event_pic_name: eventData.event_pic_name || null,
        event_pic_color: eventData.event_pic_color,
        event_support_ids: eventSupportIdsString,
        event_support_names: eventSupportNamesString,
        event_support_colors: eventSupportColorsString,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    
    console.log('✅ Event updated successfully:', data.id)
    return data
  } catch (error) {
    console.error('❌ Error in updateEvent:', error)
    throw error
  }
}

export async function deleteEvent(id: string) {
  const supabase = createClient()
  
  try {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id)
    
    if (error) throw error
    return true
  } catch (error) {
    console.error('❌ Error in deleteEvent:', error)
    throw error
  }
}

// ==================== HOLIDAYS ====================

export async function getHolidays(startDate: string, endDate: string) {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from('holidays')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true })
    
    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching holidays:', error)
    return []
  }
}
