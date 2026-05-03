import { createClient } from './client'

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
    return data || []
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return []
  }
}

export async function createTask(taskData: any) {
  const supabase = createClient()
  
  try {
    console.log('🔍 TASK DATA YANG AKAN MASUK DB:', taskData)
    if (!taskData.client_name) throw new Error('client_name is required')
    if (!taskData.date_start) throw new Error('date_start is required')
    if (!taskData.task_pic_id && !taskData.task_pic_name) throw new Error('task_pic_id or task_pic_name is required')
    
    // Handle both string and array formats for support staff
    const taskSupportIdsString = taskData.task_support_ids 
      ? (typeof taskData.task_support_ids === 'string' 
          ? taskData.task_support_ids 
          : taskData.task_support_ids.join(','))
      : null
    
    const taskSupportNamesString = taskData.task_support_names 
      ? (typeof taskData.task_support_names === 'string' 
          ? taskData.task_support_names 
          : taskData.task_support_names.join(','))
      : null
    
    const taskSupportColorsString = taskData.task_support_colors 
      ? (typeof taskData.task_support_colors === 'string' 
          ? taskData.task_support_colors 
          : taskData.task_support_colors.join(','))
      : null
    
    const dataToInsert = {
      client_name: taskData.client_name,
      running_number: taskData.running_number,
      job_task: taskData.job_task || 'General Task',
      date_start: taskData.date_start,
      date_stop: taskData.date_stop || taskData.date_start,
      time_start: taskData.time_start || null,
      time_stop: taskData.time_stop || null,
      additional_remark: taskData.additional_remark || null,
      pdf_job_order_path: taskData.pdf_job_order_path || null,
      pdf_job_order_url: taskData.pdf_job_order_url || null,
      task_pic_id: taskData.task_pic_id || null,
      task_pic_name: taskData.task_pic_name || null,
      task_pic_color: taskData.task_pic_color || null,
      task_support_ids: taskSupportIdsString,
      task_support_names: taskSupportNamesString,
      task_support_colors: taskSupportColorsString,
      pdf_final_report_path: taskData.pdf_final_report_path || null,
      pdf_final_report_url: taskData.pdf_final_report_url || null,
      job_status: taskData.job_status || 'in-progress',
      created_by: taskData.created_by || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    console.log('📦 Data to insert:', dataToInsert)
    
    const { data, error } = await supabase
      .from('tasks')
      .insert([dataToInsert])
      .select()
      .single()
    
    if (error) {
      console.error('❌ ERROR CREATING TASK:', error)
      throw error
    }
    
    console.log('✅ TASK BERJAYA MASUK DB:', data)
    return data
  } catch (error) {
    console.error('❌ ERROR CREATING TASK:', error)
    throw error
  }
}

export async function updateTask(id: string, taskData: any) {
  const supabase = createClient()
  
  try {
    console.log('🔍 UPDATING TASK:', { id, taskData })
    
    // Handle both string and array formats for support staff
    const taskSupportIdsString = taskData.task_support_ids 
      ? (typeof taskData.task_support_ids === 'string' 
          ? taskData.task_support_ids 
          : taskData.task_support_ids.join(','))
      : null
    
    const taskSupportNamesString = taskData.task_support_names 
      ? (typeof taskData.task_support_names === 'string' 
          ? taskData.task_support_names 
          : taskData.task_support_names.join(','))
      : null
    
    const taskSupportColorsString = taskData.task_support_colors 
      ? (typeof taskData.task_support_colors === 'string' 
          ? taskData.task_support_colors 
          : taskData.task_support_colors.join(','))
      : null
    
    const { data, error } = await supabase
      .from('tasks')
      .update({
        client_name: taskData.client_name,
        running_number: taskData.running_number,
        job_task: taskData.job_task,
        date_start: taskData.date_start,
        date_stop: taskData.date_stop,
        time_start: taskData.time_start,
        time_stop: taskData.time_stop,
        additional_remark: taskData.additional_remark,
        pdf_job_order_path: taskData.pdf_job_order_path,
        pdf_job_order_url: taskData.pdf_job_order_url,
        task_pic_id: taskData.task_pic_id,
        task_pic_name: taskData.task_pic_name,
        task_pic_color: taskData.task_pic_color,
        task_support_ids: taskSupportIdsString,
        task_support_names: taskSupportNamesString,
        task_support_colors: taskSupportColorsString,
        pdf_final_report_path: taskData.pdf_final_report_path,
        pdf_final_report_url: taskData.pdf_final_report_url,
        job_status: taskData.job_status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      console.error('❌ ERROR UPDATING TASK:', error)
      throw error
    }
    
    console.log('✅ TASK UPDATED:', data)
    return data
  } catch (error) {
    console.error('❌ ERROR UPDATING TASK:', error)
    throw error
  }
}

export async function deleteTask(id: string) {
  const supabase = createClient()
  
  try {
    console.log('🗑️ Calling deleteTask for ID:', id)
    
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id)
    
    if (error) {
      console.error('❌ Error in deleteTask:', error)
      throw error
    }
    
    console.log('✅ Task deleted successfully')
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
      .select(`
        *,
        creator:users!events_created_by_fkey (
          name,
          color
        )
      `)
      .gte('date_start', startDate)
      .lte('date_start', endDate)
      .order('date_start', { ascending: true })
    
    if (error) throw error
    
    return data?.map((event: {
      creator?: { name: string; color: string } | null;
      event_support_ids?: string | null;
      event_support_names?: string | null;
      event_support_colors?: string | null;
      [key: string]: any;
      }) => ({
      ...event,
      creator_color: event.creator?.color || 'blue',
      creator_name: event.creator?.name || 'Unknown',
      event_support_ids: event.event_support_ids ? event.event_support_ids.split(',') : [],
      event_support_names: event.event_support_names ? event.event_support_names.split(',') : [],
      event_support_colors: event.event_support_colors ? event.event_support_colors.split(',') : []
    })) || []
  } catch (error) {
    console.error('Error fetching events:', error)
    return []
  }
}

export async function createEvent(eventData: any) {
  const supabase = createClient()
  
  try {
    console.log('🔍 EVENT DATA YANG AKAN MASUK DB:', eventData)
    
    if (!eventData.date_start) {
      throw new Error('date_start is required')
    }
    
    const eventSupportIdsString = eventData.event_support_ids 
      ? (typeof eventData.event_support_ids === 'string' 
          ? eventData.event_support_ids 
          : eventData.event_support_ids.join(','))
      : null
    
    const eventSupportNamesString = eventData.event_support_names 
      ? (typeof eventData.event_support_names === 'string' 
          ? eventData.event_support_names 
          : eventData.event_support_names.join(','))
      : null
    
    const eventSupportColorsString = eventData.event_support_colors 
      ? (typeof eventData.event_support_colors === 'string' 
          ? eventData.event_support_colors 
          : eventData.event_support_colors.join(','))
      : null
    
    const dataToInsert = {
      title: eventData.title,
      description: eventData.description || null,
      date_start: eventData.date_start,
      date_stop: eventData.date_stop || eventData.date_start,
      time_start: eventData.time_start || null,
      time_stop: eventData.time_stop || null,
      location: eventData.location || null,
      event_pic_id: eventData.event_pic_id || null,
      event_pic_name: eventData.event_pic_name || null,
      event_pic_color: eventData.event_pic_color || null,
      event_support_ids: eventSupportIdsString,
      event_support_names: eventSupportNamesString,
      event_support_colors: eventSupportColorsString,
      created_by: eventData.created_by || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    console.log('📦 Event data to insert:', dataToInsert)
    
    const { data, error } = await supabase
      .from('events')
      .insert([dataToInsert])
      .select(`
        *,
        creator:users!events_created_by_fkey (
          name,
          color
        )
      `)
      .single()
    
    if (error) {
      console.error('❌ ERROR CREATING EVENT:', error)
      throw error
    }
    
    console.log('✅ EVENT BERJAYA MASUK DB:', data)
    
    return {
      ...data,
      creator_color: data?.creator?.color || 'blue',
      creator_name: data?.creator?.name || 'Unknown',
      event_support_ids: data?.event_support_ids ? data.event_support_ids.split(',') : [],
      event_support_names: data?.event_support_names ? data.event_support_names.split(',') : [],
      event_support_colors: data?.event_support_colors ? data.event_support_colors.split(',') : []
    }
  } catch (error) {
    console.error('❌ ERROR CREATING EVENT:', error)
    throw error
  }
}

export async function updateEvent(id: string, eventData: any) {
  const supabase = createClient()
  
  try {
    console.log('🔍 UPDATING EVENT:', { id, eventData })
    
    // Handle both string and array formats for support staff
    const eventSupportIdsString = eventData.event_support_ids 
      ? (typeof eventData.event_support_ids === 'string' 
          ? eventData.event_support_ids 
          : eventData.event_support_ids.join(','))
      : null
    
    const eventSupportNamesString = eventData.event_support_names 
      ? (typeof eventData.event_support_names === 'string' 
          ? eventData.event_support_names 
          : eventData.event_support_names.join(','))
      : null
    
    const eventSupportColorsString = eventData.event_support_colors 
      ? (typeof eventData.event_support_colors === 'string' 
          ? eventData.event_support_colors 
          : eventData.event_support_colors.join(','))
      : null
    
    const { data, error } = await supabase
      .from('events')
      .update({
        title: eventData.title,
        description: eventData.description,
        date_start: eventData.date_start,
        date_stop: eventData.date_stop,
        time_start: eventData.time_start,
        time_stop: eventData.time_stop,
        location: eventData.location,
        event_pic_id: eventData.event_pic_id,
        event_pic_name: eventData.event_pic_name,
        event_pic_color: eventData.event_pic_color,
        event_support_ids: eventSupportIdsString,
        event_support_names: eventSupportNamesString,
        event_support_colors: eventSupportColorsString,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        creator:users!events_created_by_fkey (
          name,
          color
        )
      `)
      .single()
    
    if (error) {
      console.error('❌ ERROR UPDATING EVENT:', error)
      throw error
    }
    
    console.log('✅ EVENT UPDATED:', data)
    
    return {
      ...data,
      creator_color: data?.creator?.color || 'blue',
      creator_name: data?.creator?.name || 'Unknown',
      event_support_ids: data?.event_support_ids ? data.event_support_ids.split(',') : [],
      event_support_names: data?.event_support_names ? data.event_support_names.split(',') : [],
      event_support_colors: data?.event_support_colors ? data.event_support_colors.split(',') : []
    }
  } catch (error) {
    console.error('❌ ERROR UPDATING EVENT:', error)
    throw error
  }
}

export async function deleteEvent(id: string) {
  const supabase = createClient()
  
  try {
    console.log('🗑️ Calling deleteEvent for ID:', id)
    
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id)
    
    if (error) {
      console.error('❌ Error in deleteEvent:', error)
      throw error
    }
    
    console.log('✅ Event deleted successfully')
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