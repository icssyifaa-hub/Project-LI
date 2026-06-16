'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Bell, CheckCheck, Clock, Briefcase, Calendar, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/use-toast'
import { formatDistanceToNow } from 'date-fns'
import { useRouter } from 'next/navigation'

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

interface NotificationsPanelProps {
  onUnreadCountChange?: (count: number) => void
}

export default function NotificationsPanel({ onUnreadCountChange }: NotificationsPanelProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([])
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

  // Fetch notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!currentUser?.id) {
        setLoading(false)
        return
      }

      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', currentUser.id)
          .order('created_at', { ascending: false })
          .limit(50)

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

  // Realtime subscription
  useEffect(() => {
    if (!currentUser?.id) return

    let channel: any = null

    const setupRealtime = async () => {
      try {
        channel = supabase
          .channel(`user-${currentUser.id}-notifications`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${currentUser.id}`,
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
  const totalCount = filteredNotifications.length

  // Notify parent when unread count changes
  useEffect(() => {
    onUnreadCountChange?.(unreadCount)
  }, [unreadCount, onUnreadCountChange])

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
      await supabase
        .from('notifications')
        .update({ read: true, updated_at: new Date().toISOString() })
        .eq('user_id', currentUser.id)
        .eq('read', false)

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
      localStorage.setItem('highlight_task_id', notification.task_id)
      
      const { data: task } = await supabase
        .from('tasks')
        .select('date_start')
        .eq('id', notification.task_id)
        .single()
      
      if (task?.date_start) {
        const targetDate = new Date(task.date_start)
        const year = targetDate.getFullYear()
        const month = targetDate.getMonth()
        const day = targetDate.getDate()
        router.push(`/calendar?year=${year}&month=${month}&day=${day}&task=${notification.task_id}`)
      } else {
        router.push('/calendar')
      }
    } 
    // Handle event notification
    else if (notification.event_id) {
      localStorage.setItem('highlight_event_id', notification.event_id)
      
      const { data: event } = await supabase
        .from('events')
        .select('date_start')
        .eq('id', notification.event_id)
        .single()
      
      if (event?.date_start) {
        const targetDate = new Date(event.date_start)
        const year = targetDate.getFullYear()
        const month = targetDate.getMonth()
        const day = targetDate.getDate()
        
        router.push(`/calendar?year=${year}&month=${month}&day=${day}&event=${notification.event_id}`)
      } else {
        router.push('/calendar')
      }
    }
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
        return <Briefcase className="h-4 w-4 mr-2 mt-0.5 text-blue-600 flex-shrink-0" />
      case 'task_update':
        return <Briefcase className="h-4 w-4 mr-2 mt-0.5 text-green-600 flex-shrink-0" />
      case 'event_assignment':
        return <Calendar className="h-4 w-4 mr-2 mt-0.5 text-purple-600 flex-shrink-0" />
      case 'event_update':
        return <Calendar className="h-4 w-4 mr-2 mt-0.5 text-orange-600 flex-shrink-0" />
      default:
        return <Bell className="h-4 w-4 mr-2 mt-0.5 text-gray-600 flex-shrink-0" />
    }
  }

  const getNotificationBgColor = (type: string, read: boolean) => {
    if (read) return 'bg-white border-gray-200'
    
    switch (type) {
      case 'task_assignment':
        return 'bg-blue-50 border-blue-200'
      case 'task_update':
        return 'bg-green-50 border-green-200'
      case 'event_assignment':
        return 'bg-purple-50 border-purple-200'
      case 'event_update':
        return 'bg-orange-50 border-orange-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  if (loading) {
    return (
      <div className="bg-white border rounded-lg shadow-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
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
    <div className="bg-white border rounded-lg shadow-lg p-4 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b">
        <h3 className="font-semibold text-gray-900 flex items-center">
          <Bell className="h-4 w-4 mr-2 text-blue-600" />
          Notifications
          {unreadCount > 0 && (
            <span className="ml-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </h3>
        
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={markAllAsRead}
            disabled={markingAll}
            className="text-xs text-blue-600 hover:text-blue-700 h-7 px-2"
          >
            <CheckCheck className="h-3 w-3 mr-1" />
            Mark all read
          </Button>
        )}
      </div>

      {/* Category Filter */}
      <div className="mb-3">
        <div className="flex gap-2">
          <button
            onClick={() => setCategory('all')}
            className={`flex-1 px-2 py-1 text-xs rounded-md transition-colors ${
              category === 'all'
                ? 'bg-gray-800 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setCategory('task')}
            className={`flex-1 px-2 py-1 text-xs rounded-md transition-colors flex items-center justify-center gap-1 ${
              category === 'task'
                ? 'bg-blue-600 text-white'
                : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
            }`}
          >
            <Briefcase className="h-3 w-3" />
            Task
          </button>
          <button
            onClick={() => setCategory('event')}
            className={`flex-1 px-2 py-1 text-xs rounded-md transition-colors flex items-center justify-center gap-1 ${
              category === 'event'
                ? 'bg-purple-600 text-white'
                : 'bg-purple-50 text-purple-600 hover:bg-purple-100'
            }`}
          >
            <Calendar className="h-3 w-3" />
            Event
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Bell className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm">No notifications found</p>
            <p className="text-xs text-gray-400 mt-1">
              {category !== 'all' 
                ? `No ${category} notifications yet`
                : 'No notifications yet'}
            </p>
          </div>
        ) : (
          filteredNotifications.map((notif) => (
            <div
              key={notif.id}
              className={`relative p-3 rounded-lg border transition-all duration-200 cursor-pointer hover:shadow-md ${
                getNotificationBgColor(notif.type, notif.read)
              } ${!notif.read ? 'shadow-sm' : ''}`}
              onClick={() => handleNotificationClick(notif)}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  deleteNotification(notif.id)
                }}
                className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition-colors z-10"
                aria-label="Delete notification"
              >
                <X className="h-3 w-3" />
              </button>

              <div className="pr-6">
                <div className="flex items-start">
                  {getNotificationIcon(notif.type)}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {notif.title}
                    </p>
                    <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                      {notif.message}
                    </p>
                    <div className="flex items-center mt-2 text-xs text-gray-500">
                      <Clock className="h-3 w-3 mr-1" />
                      {getTimeAgo(notif.created_at)}
                    </div>
                  </div>
                </div>
              </div>

              {!notif.read && (
                <div className="absolute bottom-2 right-2">
                  <span className="block h-2 w-2 rounded-full bg-blue-600 animate-pulse"></span>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer with stats */}
      {totalCount > 0 && (
        <div className="mt-3 pt-2 border-t text-xs text-gray-500 flex justify-between">
          <span>Total: {totalCount}</span>
          <span>Unread: {unreadCount}</span>
        </div>
      )}
    </div>
  )
}