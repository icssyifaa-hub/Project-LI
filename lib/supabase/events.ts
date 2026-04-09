import { createClient } from './client'

export async function getEvents(dateStart: string, dateEnd: string) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('events')
    .select(`
      *,
      creator:users!events_createdby_fkey (
        name,
        color
      )
    `)
    .gte('datestart', dateStart)
    .lte('datestart', dateEnd)
    .order('datestart', { ascending: true })
  
  if (error) {
    console.error('Error fetching events:', error)
    throw error
  }
  
  return data?.map(event => ({
    ...event,
    creator_color: event.creator?.color || 'blue',
    creator_name: event.creator?.name || 'Unknown'
  })) || []
}

export async function createEvent(eventData: any) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('events')
    .insert([{
      ...eventData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }])
    .select(`
      *,
      creator:users!events_createdby_fkey (
        name,
        color
      )
    `)
    .single()
  
  if (error) throw error
  
  return {
    ...data,
    creator_color: data?.creator?.color || 'blue',
    creator_name: data?.creator?.name || 'Unknown'
  }
}

export async function updateEvent(id: string, eventData: any) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('events')
    .update({
      ...eventData,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select(`
      *,
      creator:users!events_createdby_fkey (
        name,
        color
      )
    `)
    .single()
  
  if (error) throw error
  
  return {
    ...data,
    creator_color: data?.creator?.color || 'blue',
    creator_name: data?.creator?.name || 'Unknown'
  }
}

export async function deleteEvent(id: string) {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', id)
  
  if (error) throw error
  return true
}