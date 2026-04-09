import { createClient } from './client'

export interface NotificationData {
  title: string
  message: string
  type: 'task_assignment' | 'task_update' | 'reminder' | 'event_assignment'
  task_id?: string | null
  event_id?: string | null
}

export async function createNotification(
  userId: string,
  notification: NotificationData
) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      task_id: notification.task_id || null,
      event_id: notification.event_id || null,
      read: false,
      created_at: new Date().toISOString()
    })
    .select()
  
  if (error) {
    console.error('Error creating notification:', error)
    return null
  }
  
  return data
}

export async function notifyStaffForTask(
  task: any,
  action: 'created' | 'updated' = 'created'
) {
  const supabase = createClient()
  
  // Get staff IDs from their names
  const staffToNotify = []
  
  // Add PIC
  if (task.taskPicStaff) {
    const { data: picUser } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('name', task.taskPicStaff)
      .maybeSingle()
    
    if (picUser) {
      staffToNotify.push({ id: picUser.id, name: picUser.name, role: 'PIC' })
    }
  }
  
  // Add Support Staff (boleh multiple separated by commas)
  if (task.taskSupportStaff) {
    const supportNames = task.taskSupportStaff.split(',').map(s => s.trim())
    
    for (const supportName of supportNames) {
      const { data: supportUser } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('name', supportName)
        .maybeSingle()
      
      if (supportUser) {
        staffToNotify.push({ id: supportUser.id, name: supportUser.name, role: 'Support' })
      }
    }
  }
  
  // Create notifications for each staff
  for (const staff of staffToNotify) {
    const title = action === 'created' ? 'New Task Assigned' : 'Task Updated'
    const message = `You have been assigned as ${staff.role} for task: ${task.jobTask || 'Untitled Task'} for client: ${task.clientName || 'Unknown Client'}`
    
    await createNotification(staff.id, {
      title,
      message,
      type: 'task_assignment',
      task_id: task.id
    })
  }
  
  return staffToNotify.length
}

export async function notifyStaffForEvent(
  event: any,
  action: 'created' | 'updated' = 'created'
) {
  const supabase = createClient()
  
  // Get staff IDs from their names
  const staffToNotify = []
  
  // Add PIC
  if (event.eventPicStaff) {
    const { data: picUser } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('name', event.eventPicStaff)
      .maybeSingle()
    
    if (picUser) {
      staffToNotify.push({ id: picUser.id, name: picUser.name, role: 'PIC' })
    }
  }
  
  // Add Support Staff (boleh multiple separated by commas)
  if (event.eventSupportStaff) {
    const supportNames = event.eventSupportStaff.split(',').map(s => s.trim())
    
    for (const supportName of supportNames) {
      const { data: supportUser } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('name', supportName)
        .maybeSingle()
      
      if (supportUser) {
        staffToNotify.push({ id: supportUser.id, name: supportUser.name, role: 'Support' })
      }
    }
  }
  
  // Create notifications for each staff
  for (const staff of staffToNotify) {
    const title = action === 'created' ? 'New Event Assigned' : 'Event Updated'
    const message = `You have been assigned as ${staff.role} for event: ${event.title || 'Untitled Event'}`
    
    await createNotification(staff.id, {
      title,
      message,
      type: 'event_assignment',
      event_id: event.id
    })
  }
  
  return staffToNotify.length
}