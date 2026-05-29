import { createClient } from './client'

const handleSupportArrays = (data: any, prefix: string) => {
  const supportIds = data[`${prefix}_support_ids`] 
    ? (typeof data[`${prefix}_support_ids`] === 'string' 
        ? data[`${prefix}_support_ids`].split(',') 
        : data[`${prefix}_support_ids`])
    : []
  
  const supportNames = data[`${prefix}_support_names`] 
    ? (typeof data[`${prefix}_support_names`] === 'string' 
        ? data[`${prefix}_support_names`].split(',') 
        : data[`${prefix}_support_names`])
    : []
  
  const supportColors = data[`${prefix}_support_colors`] 
    ? (typeof data[`${prefix}_support_colors`] === 'string' 
        ? data[`${prefix}_support_colors`].split(',') 
        : data[`${prefix}_support_colors`])
    : []
  
  return { supportIds, supportNames, supportColors }
}

// ==================== EVENTS ====================
export async function getEvents(startDate: string, endDate: string) {
  const supabase = createClient()
  
  try {
    // Get current user for debugging (optional - no error if not logged in)
    const { data: { user } } = await supabase.auth.getUser()
    console.log('👤 Current user fetching events:', user?.id || 'No user', user?.email || 'Not logged in')
    
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .gte('date_start', startDate)
      .lte('date_start', endDate)
      .order('date_start', { ascending: true })
    
    if (error) {
      console.error('❌ Error fetching events:', error)
      throw error
    }
    
    console.log(`📊 Events found in range ${startDate} to ${endDate}: ${data?.length || 0}`)
    
    // Format events for frontend
    const formattedEvents = data?.map((event: any) => {
      const { supportIds, supportNames, supportColors } = handleSupportArrays(event, 'event')
      
      return {
        id: event.id,
        title: event.title,
        description: event.description || '',
        dateStart: event.date_start,
        dateStop: event.date_stop || event.date_start,
        timeStart: event.time_start || '',
        timeStop: event.time_stop || '',
        location: event.location || '',
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
    console.error('❌ Error in getEvents:', error)
    return []
  }
}

export async function getEventById(id: string) {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    
    if (!data) return null
    
    const { supportIds, supportNames, supportColors } = handleSupportArrays(data, 'event')
    
    return {
      id: data.id,
      title: data.title,
      description: data.description || '',
      dateStart: data.date_start,
      dateStop: data.date_stop || data.date_start,
      timeStart: data.time_start || '',
      timeStop: data.time_stop || '',
      location: data.location || '',
      event_pic_id: data.event_pic_id || '',
      event_pic_name: data.event_pic_name || '',
      event_pic_color: data.event_pic_color || 'purple',
      event_support_ids: supportIds,
      event_support_names: supportNames,
      event_support_colors: supportColors,
      createdby: data.created_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    }
  } catch (error) {
    console.error('❌ Error in getEventById:', error)
    return null
  }
}

export async function createEvent(eventData: any) {
  const supabase = createClient()
  
  try {
    console.log('🔍 CREATING EVENT:', eventData)
    
    // Validation
    if (!eventData.title) {
      throw new Error('Event title is required')
    }
    
    if (!eventData.date_start && !eventData.dateStart) {
      throw new Error('Start date is required')
    }
    
    // Get current user - MAKE OPTIONAL (no error if not authenticated)
    const { data: { user } } = await supabase.auth.getUser()
    
    // Use a default user ID if not authenticated (for development)
    // Change this to a valid user ID from your database
    const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000000'
    const userId = user?.id || DEFAULT_USER_ID
    
    if (!user) {
      console.warn('⚠️ No authenticated user, using default user ID:', DEFAULT_USER_ID)
    } else {
      console.log('👤 Creating event as user:', user.id)
    }
    
    // Handle support staff arrays - convert to comma-separated strings for DB
    const eventSupportIdsString = eventData.event_support_ids 
      ? (Array.isArray(eventData.event_support_ids) 
          ? eventData.event_support_ids.join(',') 
          : eventData.event_support_ids)
      : null
    
    const eventSupportNamesString = eventData.event_support_names 
      ? (Array.isArray(eventData.event_support_names) 
          ? eventData.event_support_names.join(',') 
          : eventData.event_support_names)
      : null
    
    const eventSupportColorsString = eventData.event_support_colors 
      ? (Array.isArray(eventData.event_support_colors) 
          ? eventData.event_support_colors.join(',') 
          : eventData.event_support_colors)
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
    
    console.log('📦 Inserting event data:', dataToInsert)
    
    const { data, error } = await supabase
      .from('events')
      .insert([dataToInsert])
      .select()
      .single()
    
    if (error) {
      console.error('❌ Supabase error creating event:', error)
      throw error
    }
    
    console.log('✅ Event created successfully:', data.id)
    
    // Format response for frontend
    const { supportIds, supportNames, supportColors } = handleSupportArrays(data, 'event')
    
    return {
      id: data.id,
      title: data.title,
      description: data.description || '',
      dateStart: data.date_start,
      dateStop: data.date_stop,
      timeStart: data.time_start || '',
      timeStop: data.time_stop || '',
      location: data.location || '',
      event_pic_id: data.event_pic_id || '',
      event_pic_name: data.event_pic_name || '',
      event_pic_color: data.event_pic_color || 'purple',
      event_support_ids: supportIds,
      event_support_names: supportNames,
      event_support_colors: supportColors,
      createdby: data.created_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    }
  } catch (error) {
    console.error('❌ Error in createEvent:', error)
    throw error
  }
}

export async function updateEvent(id: string, eventData: any) {
  const supabase = createClient()
  
  try {
    console.log('🔍 UPDATING EVENT:', { id, eventData })
    
    // Validation
    if (!eventData.title) {
      throw new Error('Event title is required')
    }
    
    // Handle support staff arrays - convert to comma-separated strings for DB
    const eventSupportIdsString = eventData.event_support_ids 
      ? (Array.isArray(eventData.event_support_ids) 
          ? eventData.event_support_ids.join(',') 
          : eventData.event_support_ids)
      : null
    
    const eventSupportNamesString = eventData.event_support_names 
      ? (Array.isArray(eventData.event_support_names) 
          ? eventData.event_support_names.join(',') 
          : eventData.event_support_names)
      : null
    
    const eventSupportColorsString = eventData.event_support_colors 
      ? (Array.isArray(eventData.event_support_colors) 
          ? eventData.event_support_colors.join(',') 
          : eventData.event_support_colors)
      : null
    
    const { data, error } = await supabase
      .from('events')
      .update({
        title: eventData.title,
        description: eventData.description || null,
        date_start: eventData.date_start || eventData.dateStart,
        date_stop: eventData.date_stop || eventData.dateStop,
        time_start: eventData.time_start || eventData.timeStart || null,
        time_stop: eventData.time_stop || eventData.timeStop || null,
        location: eventData.location || null,
        event_pic_id: eventData.event_pic_id || null,
        event_pic_name: eventData.event_pic_name || null,
        event_pic_color: eventData.event_pic_color || 'purple',
        event_support_ids: eventSupportIdsString,
        event_support_names: eventSupportNamesString,
        event_support_colors: eventSupportColorsString,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      console.error('❌ Error updating event:', error)
      throw error
    }
    
    console.log('✅ Event updated successfully:', data.id)
    
    // Format response for frontend
    const { supportIds, supportNames, supportColors } = handleSupportArrays(data, 'event')
    
    return {
      id: data.id,
      title: data.title,
      description: data.description || '',
      dateStart: data.date_start,
      dateStop: data.date_stop,
      timeStart: data.time_start || '',
      timeStop: data.time_stop || '',
      location: data.location || '',
      event_pic_id: data.event_pic_id || '',
      event_pic_name: data.event_pic_name || '',
      event_pic_color: data.event_pic_color || 'purple',
      event_support_ids: supportIds,
      event_support_names: supportNames,
      event_support_colors: supportColors,
      createdby: data.created_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    }
  } catch (error) {
    console.error('❌ Error in updateEvent:', error)
    throw error
  }
}

export async function deleteEvent(id: string) {
  const supabase = createClient()
  
  try {
    console.log('🗑️ Deleting event:', id)
    
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id)
    
    if (error) {
      console.error('❌ Error deleting event:', error)
      throw error
    }
    
    console.log('✅ Event deleted successfully')
    return { success: true, id }
  } catch (error) {
    console.error('❌ Error in deleteEvent:', error)
    throw error
  }
}

// ==================== BULK OPERATIONS ====================
export async function getEventsByDateRange(startDate: string, endDate: string) {
  return getEvents(startDate, endDate)
}

export async function getEventsByMonth(year: number, month: number) {
  const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const lastDay = new Date(year, month + 1, 0).getDate()
  const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${lastDay}`
  
  return getEvents(startDate, endDate)
}

export async function getEventsByWeek(date: Date) {
  const start = new Date(date)
  start.setDate(date.getDate() - date.getDay())
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  
  const startDate = start.toISOString().split('T')[0]
  const endDate = end.toISOString().split('T')[0]
  
  return getEvents(startDate, endDate)
}

export async function getEventsByDay(date: Date) {
  const dateStr = date.toISOString().split('T')[0]
  return getEvents(dateStr, dateStr)
}