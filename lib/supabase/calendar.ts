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
    
    // Validate required fields
    if (!taskData.client_name) throw new Error('client_name is required')
    if (!taskData.date_start) throw new Error('date_start is required')
    if (!taskData.task_pic_staff) throw new Error('task_pic_staff (PIC) is required')
    
    const dataToInsert = {
      client_name: taskData.client_name,
      running_number: taskData.running_number,
      job_task: taskData.job_task || 'General Task',
      date_start: taskData.date_start,
      date_stop: taskData.date_stop || taskData.date_start,
      time_start: taskData.time_start || null,
      time_stop: taskData.time_stop || null,
      additional_remark: taskData.additional_remark || null,
      pdf_job_order: taskData.pdf_job_order || null,
      task_pic_staff: taskData.task_pic_staff,
      task_support_staff: taskData.task_support_staff || null,
      pdf_final_report: taskData.pdf_final_report || null,
      final_report_staff: taskData.final_report_staff || null,
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
    
    const { data, error } = await supabase
      .from('tasks')
      .update({
        ...taskData,
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
    
    return data?.map(event => ({
      ...event,
      creator_color: event.creator?.color || 'blue',
      creator_name: event.creator?.name || 'Unknown'
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
    
    const dataToInsert = {
      title: eventData.title,
      description: eventData.description || null,
      date_start: eventData.date_start,
      date_stop: eventData.date_stop || eventData.date_start,
      time_start: eventData.time_start || null,
      time_stop: eventData.time_stop || null,
      location: eventData.location || null,
      event_pic_staff: eventData.event_pic_staff || null,
      event_support_staff: eventData.event_support_staff || null,
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
      creator_name: data?.creator?.name || 'Unknown'
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
    
    const { data, error } = await supabase
      .from('events')
      .update({
        ...eventData,
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
      creator_name: data?.creator?.name || 'Unknown'
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