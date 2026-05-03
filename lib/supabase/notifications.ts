import { createClient } from './client'

export interface NotificationData {
  title: string
  message: string
  type: 'task_assignment' | 'task_update' | 'event_assignment' | 'event_update'
  task_id?: string | null
  event_id?: string | null
  created_by_name?: string
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
}

export async function notifyStaffForTask(
  task: any,
  action: 'created' | 'updated' = 'created',
  assignedBy?: string
) {
  const supabase = createClient()
  
  console.log(`🔔 Sending ${action} notifications for task:`, task.id)
  console.log('📦 Task data received:', task)
  
  const staffToNotify: { id: string; name: string; role: string }[] = []
  
  // Handle PIC - check both possible field names
  const picName = task.taskPicStaff || task.task_pic_name
  if (picName && typeof picName === 'string' && picName.trim()) {
    const { data: picUser } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('name', picName.trim())
      .maybeSingle()
    
    if (picUser) {
      staffToNotify.push({ id: picUser.id, name: picUser.name, role: 'PIC' })
      console.log(`✅ Found PIC: ${picUser.name}`)
    } else {
      console.warn(`⚠️ PIC not found: ${picName}`)
    }
  }
  
  // Handle Support Staff - support BOTH string and array formats
  let supportNames: string[] = []
  const supportStaff = task.taskSupportStaff || task.task_support_names
  
  if (supportStaff) {
    if (typeof supportStaff === 'string') {
      supportNames = supportStaff.split(',').map((s: string) => s.trim()).filter(s => s)
      console.log('📝 Support staff (string):', supportNames)
    } else if (Array.isArray(supportStaff)) {
      supportNames = supportStaff.filter((s: any) => s && typeof s === 'string' && s.trim())
      console.log('📝 Support staff (array):', supportNames)
    }
  }
  
  for (const supportName of supportNames) {
    if (supportName && supportName.trim()) {
      const { data: supportUser } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('name', supportName.trim())
        .maybeSingle()
      
      if (supportUser) {
        if (!staffToNotify.some(s => s.id === supportUser.id)) {
          staffToNotify.push({ id: supportUser.id, name: supportUser.name, role: 'Support' })
          console.log(`✅ Found Support: ${supportUser.name}`)
        }
      } else {
        console.warn(`⚠️ Support not found: ${supportName}`)
      }
    }
  }
  
  console.log(`📋 Total staff to notify: ${staffToNotify.length}`)
  
  // Format dates for message
  const taskDate = task.date_start || task.dateStart
  const formattedDate = taskDate ? new Date(taskDate).toLocaleDateString('en-MY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }) : 'Date not set'
  
  // Create notifications for each staff
  for (const staff of staffToNotify) {
    let title = ''
    let message = ''
    
    if (action === 'created') {
      title = '📋 New Task Assigned'
      if (assignedBy) {
        message = `${assignedBy} has assigned you as ${staff.role} for task: ${task.jobTask || task.job_task || 'Untitled Task'} for client: ${task.clientName || task.client_name || 'Unknown Client'} (Date: ${formattedDate})`
      } else {
        message = `You have been assigned as ${staff.role} for task: ${task.jobTask || task.job_task || 'Untitled Task'} for client: ${task.clientName || task.client_name || 'Unknown Client'} (Date: ${formattedDate})`
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
    
    console.log(`✅ Notification sent to ${staff.name} (${staff.role})`)
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
  console.log('📦 Event data received:', event)
  
  const staffToNotify: { id: string; name: string; role: string }[] = []
  
  // Handle PIC - check both possible field names
  const picName = event.eventPicStaff || event.event_pic_name
  if (picName && typeof picName === 'string' && picName.trim()) {
    const { data: picUser } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('name', picName.trim())
      .maybeSingle()
    
    if (picUser) {
      staffToNotify.push({ id: picUser.id, name: picUser.name, role: 'PIC' })
      console.log(`✅ Found Event PIC: ${picUser.name}`)
    } else {
      console.warn(`⚠️ Event PIC not found: ${picName}`)
    }
  }
  
  let supportNames: string[] = []
  const supportStaff = event.eventSupportStaff || event.event_support_names
  
  if (supportStaff) {
    if (typeof supportStaff === 'string') {
      supportNames = supportStaff.split(',').map((s: string) => s.trim()).filter(s => s)
      console.log('📝 Event support staff (string):', supportNames)
    } else if (Array.isArray(supportStaff)) {
      supportNames = supportStaff.filter((s: any) => s && typeof s === 'string' && s.trim())
      console.log('📝 Event support staff (array):', supportNames)
    }
  }
  
  for (const supportName of supportNames) {
    if (supportName && supportName.trim()) {
      const { data: supportUser } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('name', supportName.trim())
        .maybeSingle()
      
      if (supportUser) {
        if (!staffToNotify.some(s => s.id === supportUser.id)) {
          staffToNotify.push({ id: supportUser.id, name: supportUser.name, role: 'Support' })
          console.log(`✅ Found Event Support: ${supportUser.name}`)
        }
      } else {
        console.warn(`⚠️ Event Support not found: ${supportName}`)
      }
    }
  }
  
  console.log(`📋 Total event staff to notify: ${staffToNotify.length}`)
  
  // Format dates for message
  const eventDate = event.date_start || event.dateStart
  const formattedDate = eventDate ? new Date(eventDate).toLocaleDateString('en-MY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }) : 'Date not set'
  
  // Create notifications for each staff
  for (const staff of staffToNotify) {
    let title = ''
    let message = ''
    
    if (action === 'created') {
      title = '📅 New Event Assigned'
      if (assignedBy) {
        message = `${assignedBy} has assigned you as ${staff.role} for event: ${event.title || 'Untitled Event'} (Date: ${formattedDate})`
      } else {
        message = `You have been assigned as ${staff.role} for event: ${event.title || 'Untitled Event'} (Date: ${formattedDate})`
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
    
    console.log(`✅ Event notification sent to ${staff.name} (${staff.role})`)
  }
  
  return staffToNotify.length
}