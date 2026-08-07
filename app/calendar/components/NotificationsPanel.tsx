'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Bell, CheckCheck, Clock, Briefcase, Calendar, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/use-toast'
import { formatDistanceToNow } from 'date-fns'
import { useRouter } from 'next/navigation'
import { getTaskClient } from '@/lib/settings/task-client'

interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: 'task_assignment' | 'task_update' | 'event_assignment' | 'event_update'
  task_id: string | null
  event_id: string | null
  read: boolean
  created_at: string
  updated_at: string
  created_by: string | null
  created_by_name: string | null
  color: string | null
}

type CategoryType = 'all' | 'task' | 'event'

interface TomorrowReminder {
  id: string
  sourceId: string
  type: 'task' | 'event'
  title: string
  message: string
  dateStart: string
  dateStop: string | null
  reminderDate: string
  reminderLabel: string
  timeStart: string | null
}

interface NotificationsPanelProps {
  onUnreadCountChange?: (count: number) => void
}

const toTextList = (value: unknown): string[] => {
  if (!value) return []
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean)
  if (typeof value === 'string') return value.split(',').map((item) => item.trim()).filter(Boolean)
  return []
}

const getLocalDateKey = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getTomorrowDateKey = () => {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return getLocalDateKey(tomorrow)
}

const formatDateLabel = (dateKey: string | null) => {
  if (!dateKey) return 'Date not set'

  const [year, month, day] = dateKey.split('-').map(Number)
  const date = new Date(year, month - 1, day)

  return date.toLocaleDateString('en-MY', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

const formatReminderDateRange = (dateStart: string | null, dateStop: string | null) => {
  if (!dateStart) return 'Date not set'

  const startDateKey = String(dateStart).split('T')[0]
  const stopDateKey = dateStop ? String(dateStop).split('T')[0] : ''

  if (!stopDateKey || stopDateKey === startDateKey) return formatDateLabel(startDateKey)

  return `${formatDateLabel(startDateKey)} - ${formatDateLabel(stopDateKey)}`
}

const isAdminUser = (user: any) => {
  const role = String(user?.role || '').toLowerCase()
  return role === 'admin' || role === 'superadmin'
}

export default function NotificationsPanel({ onUnreadCountChange }: NotificationsPanelProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([])
  const [tomorrowReminders, setTomorrowReminders] = useState<TomorrowReminder[]>([])
  const [loading, setLoading] = useState(true)
  const [markingAll, setMarkingAll] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [category, setCategory] = useState<CategoryType>('all')
  const supabase = createClient()
  const { toast } = useToast()
  const router = useRouter()

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      try {
        const userData = localStorage.getItem('user')
        
        if (userData) {
          const parsedUser = JSON.parse(userData)
          
          let { data: dbUser } = await supabase
            .from('users')
            .select('*')
            .eq('email', parsedUser.email)
            .maybeSingle()
          
          if (!dbUser) {
            const { data: userByName } = await supabase
              .from('users')
              .select('*')
              .eq('name', parsedUser.name)
              .maybeSingle()
            dbUser = userByName
          }
          
          setCurrentUser(dbUser || parsedUser)
        }
      } catch (error) {
        console.error('Error getting user:', error)
      }
    }
    
    getUser()
  }, [supabase])

  // Filter notifications based on category
  useEffect(() => {
    let filtered = [...notifications]
    
    if (category === 'task') {
      filtered = filtered.filter(n => 
        n.type === 'task_assignment' || n.type === 'task_update'
      )
    } else if (category === 'event') {
      filtered = filtered.filter(n => 
        n.type === 'event_assignment' || n.type === 'event_update'
      )
    }
    
    setFilteredNotifications(filtered)
  }, [notifications, category])

  const filteredTomorrowReminders = tomorrowReminders.filter((reminder) => {
    if (category === 'all') return true
    return reminder.type === category
  })

  // Fetch notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!currentUser?.id) {
        setLoading(false)
        return
      }

      try {
        const query = supabase
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50)

        const { data, error } = isAdminUser(currentUser)
          ? await query
          : await query.eq('user_id', currentUser.id)

        if (error) throw error
        setNotifications(data || [])
      } catch (error) {
        console.error('Error fetching notifications:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchNotifications()
  }, [currentUser, supabase])

  // Fetch task/event reminders for tomorrow plus active tasks for today
  useEffect(() => {
    const isAssignedToCurrentUser = (item: any, itemType: 'task' | 'event') => {
      if (isAdminUser(currentUser)) return true

      const currentUserId = currentUser?.id ? String(currentUser.id) : ''
      const currentUserName = String(currentUser?.name || '').trim().toLowerCase()
      const picId = String(itemType === 'task' ? item.task_pic_id || '' : item.event_pic_id || '')
      const picName = String(itemType === 'task' ? item.task_pic_name || '' : item.event_pic_name || '').trim().toLowerCase()
      const supportIds = toTextList(itemType === 'task' ? item.task_support_ids : item.event_support_ids)
      const supportNames = toTextList(itemType === 'task' ? item.task_support_names : item.event_support_names)
        .map((name) => name.toLowerCase())

      return (
        (!!currentUserId && (picId === currentUserId || supportIds.includes(currentUserId))) ||
        (!!currentUserName && (picName === currentUserName || supportNames.includes(currentUserName)))
      )
    }

    const fetchTomorrowReminders = async () => {
      if (!currentUser?.id) {
        setTomorrowReminders([])
        return
      }

      const todayKey = getLocalDateKey(new Date())
      const tomorrowKey = getTomorrowDateKey()

      try {
        let tasksResult: any = await supabase
            .from('tasks')
            .select('id, client_name, client_id, job_task, date_start, date_stop, time_start, task_pic_id, task_pic_name, task_support_ids, task_support_names, job_status, client:client!tasks_client_id_fkey(id, client_name, location, address)')
            .lte('date_start', tomorrowKey)
            .order('time_start', { ascending: true, nullsFirst: false })

        const eventsResult = await supabase
            .from('events')
            .select('id, title, date_start, date_stop, time_start, event_pic_id, event_pic_name, event_support_ids, event_support_names')
            .eq('date_start', tomorrowKey)
            .order('time_start', { ascending: true, nullsFirst: false })

        if (tasksResult.error) {
          tasksResult = await supabase
            .from('tasks')
            .select('id, client_name, job_task, date_start, date_stop, time_start, task_pic_id, task_pic_name, task_support_ids, task_support_names, job_status')
            .lte('date_start', tomorrowKey)
            .order('time_start', { ascending: true, nullsFirst: false })
        }

        if (tasksResult.error) throw tasksResult.error
        if (eventsResult.error) throw eventsResult.error

        const taskReminders: TomorrowReminder[] = (tasksResult.data || [])
          .filter((task: any) => {
            if (!task.date_start || String(task.job_status || '').toLowerCase() === 'completed') return false

            const startDateKey = String(task.date_start).split('T')[0]
            const endDateKey = String(task.date_stop || task.date_start).split('T')[0]
            const isOneDayBeforeTask = startDateKey === tomorrowKey
            const isTaskActiveToday = startDateKey <= todayKey && endDateKey >= todayKey

            return isOneDayBeforeTask || isTaskActiveToday
          })
          .filter((task: any) => isAssignedToCurrentUser(task, 'task'))
          .map((task: any) => {
            const picName = task.task_pic_name || 'Unassigned'
            const client = getTaskClient(task)
            const startDateKey = String(task.date_start).split('T')[0]
            const isOneDayBeforeTask = startDateKey === tomorrowKey
            const reminderLabel = isOneDayBeforeTask ? '1 day before task' : 'Today'
            const dateLabel = formatReminderDateRange(task.date_start, task.date_stop)

            return {
              id: `task-${task.id}`,
              sourceId: task.id,
              type: 'task',
              title: `Reminder: ${task.job_task || 'Untitled Task'}`,
              message: `${client.client_name || 'No client'}\n${dateLabel} (${picName})`,
              dateStart: task.date_start,
              dateStop: task.date_stop,
              reminderDate: isOneDayBeforeTask ? startDateKey : todayKey,
              reminderLabel,
              timeStart: task.time_start,
            }
          })

        const eventReminders: TomorrowReminder[] = (eventsResult.data || [])
          .filter((event: any) => event.date_start)
          .filter((event: any) => isAssignedToCurrentUser(event, 'event'))
          .map((event: any) => {
            const picName = event.event_pic_name || 'Unassigned'

            return {
              id: `event-${event.id}`,
              sourceId: event.id,
              type: 'event',
              title: `Reminder: ${event.title || 'Untitled Event'}`,
              message: `${formatDateLabel(event.date_start)} (${picName})`,
              dateStart: event.date_start,
              dateStop: event.date_stop,
              reminderDate: String(event.date_start).split('T')[0],
              reminderLabel: '1 day before event',
              timeStart: event.time_start,
            }
          })

        setTomorrowReminders([...taskReminders, ...eventReminders])
      } catch (error) {
        console.error('Error fetching tomorrow reminders:', error)
        setTomorrowReminders([])
      }
    }

    fetchTomorrowReminders()
  }, [currentUser, supabase])

  // Realtime subscription
  useEffect(() => {
    if (!currentUser?.id) return

    let channel: any = null

    const setupRealtime = async () => {
      try {
        const notificationFilter = isAdminUser(currentUser)
          ? undefined
          : `user_id=eq.${currentUser.id}`

        channel = supabase
          .channel(`user-${currentUser.id}-notifications`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'notifications',
              ...(notificationFilter ? { filter: notificationFilter } : {}),
            },
            (payload) => {
              console.log('🔔 New notification:', payload)
              const newNotif = payload.new as Notification
              setNotifications(prev => [newNotif, ...prev])
              
              toast({
                title: newNotif.title,
                description: newNotif.message,
                duration: 5000,
              })
            }
          )
          .subscribe((status) => {
            console.log('Realtime status:', status)
          })
      } catch (error) {
        console.error('Error setting up realtime:', error)
      }
    }

    setupRealtime()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [currentUser, supabase, toast])

  // Calculate unread count and notify parent
  const unreadCount = filteredNotifications.filter(n => !n.read).length
  const reminderCount = filteredTomorrowReminders.length
  const alertCount = unreadCount + reminderCount
  const totalCount = filteredNotifications.length

  // Notify parent when unread count changes
  useEffect(() => {
    onUnreadCountChange?.(alertCount)
  }, [alertCount, onUnreadCountChange])

  const markAsRead = async (id: string) => {
    try {
      await supabase
        .from('notifications')
        .update({ read: true, updated_at: new Date().toISOString() })
        .eq('id', id)

      setNotifications(notifications.map(n => 
        n.id === id ? { ...n, read: true } : n
      ))
    } catch (error) {
      console.error('Error marking as read:', error)
    }
  }

  const markAllAsRead = async () => {
    if (!currentUser) return
    
    setMarkingAll(true)
    try {
      const query = supabase
        .from('notifications')
        .update({ read: true, updated_at: new Date().toISOString() })
        .eq('read', false)

      if (isAdminUser(currentUser)) {
        await query
      } else {
        await query.eq('user_id', currentUser.id)
      }

      setNotifications(notifications.map(n => ({ ...n, read: true })))
      
      toast({
        title: "Success",
        description: "All notifications marked as read",
      })
    } catch (error) {
      console.error('Error marking all as read:', error)
    } finally {
      setMarkingAll(false)
    }
  }

  const deleteNotification = async (id: string) => {
    try {
      await supabase
        .from('notifications')
        .delete()
        .eq('id', id)

      setNotifications(notifications.filter(n => n.id !== id))
      
      toast({
        title: "Deleted",
        description: "Notification removed",
      })
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read first
    if (!notification.read) {
      await markAsRead(notification.id)
    }
    
    // Handle task notification
    if (notification.task_id) {
      const { data: task } = await supabase
        .from('tasks')
        .select('date_start')
        .eq('id', notification.task_id)
        .single()
      
      if (task?.date_start) {
        const formattedDate = task.date_start.split('T')[0]
        router.push(`/calendar?date=${formattedDate}&view=month&focus=${formattedDate}`)
      } else {
        router.push('/calendar')
      }
    } 
    // Handle event notification
    else if (notification.event_id) {
      const { data: event } = await supabase
        .from('events')
        .select('date_start')
        .eq('id', notification.event_id)
        .single()
      
      if (event?.date_start) {
        const formattedDate = event.date_start.split('T')[0]
        router.push(`/calendar?date=${formattedDate}&view=month&focus=${formattedDate}`)
      } else {
        router.push('/calendar')
      }
    }
  }

  const handleReminderClick = (reminder: TomorrowReminder) => {
    const formattedDate = reminder.reminderDate.split('T')[0]
    router.push(`/calendar?date=${formattedDate}&view=month&focus=${formattedDate}`)
  }

  const getTimeAgo = (date: string) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true })
    } catch {
      return 'recently'
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'task_assignment':
      case 'task_update':
        return <Briefcase className="h-4 w-4 text-blue-600" />
      case 'event_assignment':
      case 'event_update':
        return <Calendar className="h-4 w-4 text-purple-600" />
      default:
        return <Bell className="h-4 w-4 text-gray-600" />
    }
  }

  const getNotificationTheme = (type: string, read: boolean) => {
    const isTask = type === 'task_assignment' || type === 'task_update'
    const isEvent = type === 'event_assignment' || type === 'event_update'

    if (isTask) {
      return {
        border: 'border-blue-200 dark:border-blue-900/70',
        background: read ? 'bg-white dark:bg-gray-900' : 'bg-blue-50/70 dark:bg-blue-950/30',
        accent: 'bg-blue-500',
        iconBackground: 'bg-blue-100 dark:bg-blue-950/70',
        dot: 'bg-blue-500',
      }
    }

    if (isEvent) {
      return {
        border: 'border-purple-200 dark:border-purple-900/70',
        background: read ? 'bg-white dark:bg-gray-900' : 'bg-purple-50/70 dark:bg-purple-950/30',
        accent: 'bg-purple-500',
        iconBackground: 'bg-purple-100 dark:bg-purple-950/70',
        dot: 'bg-purple-500',
      }
    }

    return {
      border: 'border-gray-200 dark:border-gray-800',
      background: read ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-900',
      accent: 'bg-gray-400',
      iconBackground: 'bg-gray-100 dark:bg-gray-800',
      dot: 'bg-gray-500',
    }
  }

  const getReminderIcon = (type: 'task' | 'event') => {
    if (type === 'task') {
      return <Briefcase className="h-4 w-4 text-red-600" />
    }

    return <Calendar className="h-4 w-4 text-red-600" />
  }

  if (loading) {
    return (
      <div className="flex h-full min-h-0 flex-col rounded-lg border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-3 flex items-center font-semibold text-gray-900 dark:text-gray-100">
          <Bell className="h-4 w-4 mr-2 text-blue-600" />
          Notifications
        </h3>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-800 dark:bg-gray-900 sm:p-4">
      {/* Header */}
      <div className="mb-3 flex flex-col gap-2 border-b border-gray-200 pb-2 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="flex min-w-0 items-center font-semibold text-gray-900 dark:text-gray-100">
          <Bell className="h-4 w-4 mr-2 text-blue-600" />
          <span className="truncate">Notifications</span>
          {alertCount > 0 && (
            <span className="notification-count-badge ml-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs text-white">
              {alertCount > 99 ? '99+' : alertCount}
            </span>
          )}
        </h3>
        
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={markAllAsRead}
            disabled={markingAll}
            className="h-7 w-full px-2 text-xs text-blue-600 hover:text-blue-700 sm:w-auto"
          >
            <CheckCheck className="h-3 w-3 mr-1" />
            Mark all read
          </Button>
        )}
      </div>

      {/* Category Filter */}
      <div className="mb-3">
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setCategory('all')}
            className={`notification-filter-button min-w-0 rounded-md px-2 py-1 text-xs transition-colors ${
              category === 'all'
                ? 'notification-filter-button-active bg-gray-800 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setCategory('task')}
            className={`notification-filter-button flex min-w-0 items-center justify-center gap-1 rounded-md px-2 py-1 text-xs transition-colors ${
              category === 'task'
                ? 'notification-filter-button-active bg-blue-600 text-white'
                : 'bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-200 dark:hover:bg-blue-900/70'
            }`}
          >
            <Briefcase className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">Task</span>
          </button>
          <button
            onClick={() => setCategory('event')}
            className={`notification-filter-button flex min-w-0 items-center justify-center gap-1 rounded-md px-2 py-1 text-xs transition-colors ${
              category === 'event'
                ? 'notification-filter-button-active bg-purple-600 text-white'
                : 'bg-purple-50 text-purple-600 hover:bg-purple-100 dark:bg-purple-950/40 dark:text-purple-200 dark:hover:bg-purple-900/70'
            }`}
          >
            <Calendar className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">Event</span>
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        {filteredTomorrowReminders.length > 0 && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                Reminders
              </p>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                {filteredTomorrowReminders.length}
              </span>
            </div>

            {filteredTomorrowReminders.map((reminder) => (
              <div
                key={reminder.id}
                className="relative cursor-pointer overflow-hidden rounded-lg border border-red-300 bg-red-50 shadow-sm transition-all duration-200 hover:-translate-y-px hover:shadow-md dark:border-red-900/70 dark:bg-red-950/30"
                onClick={() => handleReminderClick(reminder)}
              >
                <div className="absolute inset-y-0 left-0 w-1 bg-red-600" />

                <div className="p-3 pl-4">
                  <div className="flex items-start gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-red-100 dark:bg-red-950/70">
                      {getReminderIcon(reminder.type)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {reminder.title}
                      </p>
                      <p className="mt-1 whitespace-pre-line break-words text-xs leading-relaxed text-gray-600 dark:text-gray-300">
                        {reminder.message}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center border-t border-red-200 pt-2 text-xs font-medium text-red-700 dark:border-red-900/70 dark:text-red-300">
                    <Clock className="mr-1.5 h-3.5 w-3.5" />
                    <span>{reminder.reminderLabel}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredNotifications.length === 0 && filteredTomorrowReminders.length === 0 ? (
          <div className="py-8 text-center text-gray-500 dark:text-gray-400">
            <Bell className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm">No notifications found</p>
            <p className="text-xs text-gray-400 mt-1">
              {category !== 'all' 
                ? `No ${category} notifications yet`
                : 'No notifications yet'}
            </p>
          </div>
        ) : (
          filteredNotifications.map((notif) => {
            const theme = getNotificationTheme(notif.type, notif.read)

            return (
              <div
                key={notif.id}
                className={`relative cursor-pointer overflow-hidden rounded-lg border shadow-sm transition-all duration-200 hover:-translate-y-px hover:shadow-md ${theme.border} ${theme.background}`}
                onClick={() => handleNotificationClick(notif)}
              >
                <div className={`absolute inset-y-0 left-0 w-1 ${theme.accent}`} />

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteNotification(notif.id)
                  }}
                  className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-white/80 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                  aria-label="Delete notification"
                >
                  <X className="h-3.5 w-3.5" />
                </button>

                <div className="p-3 pl-4">
                  <div className="flex items-start gap-3 pr-7">
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${theme.iconBackground}`}>
                      {getNotificationIcon(notif.type)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {notif.title}
                      </p>
                      <p className="mt-1 break-words text-xs leading-relaxed text-gray-600 dark:text-gray-300">
                        {notif.message}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-gray-200/70 pt-2 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
                    <span className="flex items-center">
                      <Clock className="mr-1.5 h-3.5 w-3.5" />
                      {getTimeAgo(notif.created_at)}
                    </span>
                    {!notif.read && (
                      <span className="flex items-center gap-1.5 font-medium">
                        <span className={`h-2 w-2 rounded-full ${theme.dot}`} />
                        New
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Footer with stats */}
      {(totalCount > 0 || reminderCount > 0) && (
        <div className="mt-3 flex flex-wrap justify-between gap-2 border-t border-gray-200 pt-2 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
          <span>Total: {totalCount + reminderCount}</span>
          <span>Unread: {unreadCount}</span>
        </div>
      )}
    </div>
  )
}
