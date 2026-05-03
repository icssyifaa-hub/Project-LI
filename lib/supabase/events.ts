import { createClient } from './client'

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