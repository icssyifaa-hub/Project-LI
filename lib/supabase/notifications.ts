// lib/supabase/notifications.ts
import { createClient } from './client'

export interface NotificationData {
  title: string
  message: string
  type: 'task_assignment' | 'task_update' | 'event_assignment' | 'event_update'
  task_id?: string | null
  event_id?: string | null
  created_by_name?: string
}

const getCurrentUser = (): any | null => {
  try {
    const userData = localStorage.getItem('user')
    if (userData) {
      return JSON.parse(userData)
    }
  } catch (e) {
    console.error('Error getting user from localStorage:', e)
  }
  return null
}

export async function createNotification(
  userId: string,
  notification: NotificationData
) {
  const supabase = createClient()
  
  try {
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
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by_name: notification.created_by_name || null
      })
      .select()
    
    if (error) {
      console.error('Error creating notification:', error)
      return null
    }
    
    return data
  } catch (error) {
    console.error('Error in createNotification:', error)
    return null
  }
}

export async function notifyStaffForTask(
  task: any,
  action: 'created' | 'updated' = 'created',
  assignedBy?: string
) {
  const supabase = createClient()
  
  console.log(`🔔 Sending ${action} notifications for task:`, task.id)
  
  const staffToNotify: { id: string; name: string; role: string }[] = []
  
  const picName = task.taskPicStaff || task.task_pic_name
  if (picName && typeof picName === 'string' && picName.trim()) {
    const { data: picUser } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('name', picName.trim())
      .maybeSingle()
    
    if (picUser) {
      staffToNotify.push({ id: picUser.id, name: picUser.name, role: 'PIC' })
    }
  }
  
  let supportNames: string[] = []
  const supportStaff = task.taskSupportStaff || task.task_support_names
  
  if (supportStaff) {
    if (typeof supportStaff === 'string') {
      supportNames = supportStaff.split(',').map((s: string) => s.trim()).filter(s => s)
    } else if (Array.isArray(supportStaff)) {
      supportNames = supportStaff.filter((s: any) => s && typeof s === 'string' && s.trim())
    }
  }
  
  for (const supportName of supportNames) {
    if (supportName && supportName.trim()) {
      const { data: supportUser } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('name', supportName.trim())
        .maybeSingle()
      
      if (supportUser && !staffToNotify.some(s => s.id === supportUser.id)) {
        staffToNotify.push({ id: supportUser.id, name: supportUser.name, role: 'Support' })
      }
    }
  }
  
  const taskDate = task.date_start || task.dateStart
  const formattedDate = taskDate ? new Date(taskDate).toLocaleDateString('en-MY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }) : 'Date not set'
  
  for (const staff of staffToNotify) {
    let title = ''
    let message = ''
    
    if (action === 'created') {
      title = '📋 New Task Assigned'
      if (assignedBy) {
        message = `${assignedBy} has assigned ${staff.name} as ${staff.role} for task: ${task.jobTask || task.job_task || 'Untitled Task'} for client: ${task.clientName || task.client_name || 'Unknown Client'} (Date: ${formattedDate})`
      } else {
        message = `${staff.name} has been assigned as ${staff.role} for task: ${task.jobTask || task.job_task || 'Untitled Task'} for client: ${task.clientName || task.client_name || 'Unknown Client'} (Date: ${formattedDate})`
      }
    } else {
      title = '✏️ Task Updated'
      if (assignedBy) {
        message = `${assignedBy} has updated task: ${task.jobTask || task.job_task || 'Untitled Task'} for client: ${task.clientName || task.client_name || 'Unknown Client'} (Date: ${formattedDate})`
      } else {
        message = `Task has been updated: ${task.jobTask || task.job_task || 'Untitled Task'} for client: ${task.clientName || task.client_name || 'Unknown Client'} (Date: ${formattedDate})`
      }
    }
    
    await createNotification(staff.id, {
      title,
      message,
      type: action === 'created' ? 'task_assignment' : 'task_update',
      task_id: task.id,
      created_by_name: assignedBy || undefined
    })
  }
  
  return staffToNotify.length
}

export async function notifyStaffForEvent(
  event: any,
  action: 'created' | 'updated' = 'created',
  assignedBy?: string
) {
  const supabase = createClient()
  
  console.log(`🔔 Sending ${action} notifications for event:`, event.id)
  
  const staffToNotify: { id: string; name: string; role: string }[] = []
  
  const picName = event.eventPicStaff || event.event_pic_name
  if (picName && typeof picName === 'string' && picName.trim()) {
    const { data: picUser } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('name', picName.trim())
      .maybeSingle()
    
    if (picUser) {
      staffToNotify.push({ id: picUser.id, name: picUser.name, role: 'PIC' })
    }
  }
  
  let supportNames: string[] = []
  const supportStaff = event.eventSupportStaff || event.event_support_names
  
  if (supportStaff) {
    if (typeof supportStaff === 'string') {
      supportNames = supportStaff.split(',').map((s: string) => s.trim()).filter(s => s)
    } else if (Array.isArray(supportStaff)) {
      supportNames = supportStaff.filter((s: any) => s && typeof s === 'string' && s.trim())
    }
  }
  
  for (const supportName of supportNames) {
    if (supportName && supportName.trim()) {
      const { data: supportUser } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('name', supportName.trim())
        .maybeSingle()
      
      if (supportUser && !staffToNotify.some(s => s.id === supportUser.id)) {
        staffToNotify.push({ id: supportUser.id, name: supportUser.name, role: 'Support' })
      }
    }
  }
  
  const eventDate = event.date_start || event.dateStart
  const formattedDate = eventDate ? new Date(eventDate).toLocaleDateString('en-MY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }) : 'Date not set'
  
  for (const staff of staffToNotify) {
    let title = ''
    let message = ''
    
    if (action === 'created') {
      title = '📅 New Event Assigned'
      if (assignedBy) {
        message = `${assignedBy} has assigned ${staff.name} as ${staff.role} for event: ${event.title || 'Untitled Event'} (Date: ${formattedDate})`
      } else {
        message = `${staff.name} has been assigned as ${staff.role} for event: ${event.title || 'Untitled Event'} (Date: ${formattedDate})`
      }
    } else {
      title = '✏️ Event Updated'
      if (assignedBy) {
        message = `${assignedBy} has updated event: ${event.title || 'Untitled Event'} (Date: ${formattedDate})`
      } else {
        message = `Event has been updated: ${event.title || 'Untitled Event'} (Date: ${formattedDate})`
      }
    }
    
    await createNotification(staff.id, {
      title,
      message,
      type: action === 'created' ? 'event_assignment' : 'event_update',
      event_id: event.id,
      created_by_name: assignedBy || undefined
    })
  }
  
  return staffToNotify.length
}
