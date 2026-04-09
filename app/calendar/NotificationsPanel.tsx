'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Bell, CheckCheck, Clock, Briefcase, Calendar, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/use-toast'
import { formatDistanceToNow } from 'date-fns'

interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: 'task_assignment' | 'task_update' | 'reminder' | 'event_assignment'
  task_id: string | null
  event_id: string | null
  read: boolean
  created_at: string
}

export default function NotificationsPanel() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [markingAll, setMarkingAll] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    const getUser = async () => {
      try {
        // Try to get from localStorage
        const userData = localStorage.getItem('user')
        
        if (userData) {
          const parsedUser = JSON.parse(userData)
          
          // Find user in database by email
          const { data: dbUser } = await supabase
            .from('users')
            .select('*')
            .eq('email', parsedUser.email)
            .maybeSingle()
          
          if (dbUser) {
            setCurrentUser(dbUser)
          } else {
            // If not found by email, try by user_id (staff code)
            const { data: userByCode } = await supabase
              .from('users')
              .select('*')
              .eq('user_id', parsedUser.name || parsedUser.user_id)
              .maybeSingle()
            
            if (userByCode) {
              setCurrentUser(userByCode)
            } else {
              // Try by name
              const { data: userByName } = await supabase
                .from('users')
                .select('*')
                .eq('name', parsedUser.name)
                .maybeSingle()
              
              setCurrentUser(userByName || parsedUser)
            }
          }
        }
      } catch (error) {
        console.error('Error getting user:', error)
      }
    }
    
    getUser()
  }, [supabase])

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
  
  // ONLY subscribe if we have a user
  if (!currentUser?.id) return
  
  const channel = supabase
    .channel(`notifications-${currentUser.id}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${currentUser.id}`
      },
      (payload) => {
        console.log('🔔 NEW NOTIFICATION:', payload)
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
      console.log('Subscription status:', status)
    })

  return () => {
    supabase.removeChannel(channel)
  }
}, [currentUser, supabase, toast])

  const markAsRead = async (id: string) => {
    try {
      await supabase
        .from('notifications')
        .update({ read: true })
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
        .update({ read: true })
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
      case 'event_assignment':
        return <Calendar className="h-4 w-4 mr-2 mt-0.5 text-purple-600 flex-shrink-0" />
      case 'task_update':
        return <Briefcase className="h-4 w-4 mr-2 mt-0.5 text-green-600 flex-shrink-0" />
      default:
        return <Bell className="h-4 w-4 mr-2 mt-0.5 text-yellow-600 flex-shrink-0" />
    }
  }

  const getNotificationBgColor = (type: string, read: boolean) => {
    if (read) return 'bg-white border-gray-200'
    
    switch (type) {
      case 'task_assignment':
        return 'bg-blue-50 border-blue-200'
      case 'event_assignment':
        return 'bg-purple-50 border-purple-200'
      case 'task_update':
        return 'bg-green-50 border-green-200'
      default:
        return 'bg-yellow-50 border-yellow-200'
    }
  }

  if (!currentUser) {
    return (
      <div className="bg-white border rounded-lg shadow-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
          <Bell className="h-4 w-4 mr-2 text-blue-600" />
          Notifications
        </h3>
        <div className="text-center py-8 text-gray-500">
          <Bell className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm">Please log in to see notifications</p>
        </div>
      </div>
    )
  }

  const unreadCount = notifications.filter(n => !n.read).length

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
              {unreadCount}
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

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
        {notifications.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Bell className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm">No notifications yet</p>
            <p className="text-xs text-gray-400 mt-1">
              When you're assigned to tasks or events, notifications will appear here
            </p>
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              className={`relative p-3 rounded-lg border transition-all duration-200 ${
                getNotificationBgColor(notif.type, notif.read)
              } ${!notif.read ? 'shadow-sm' : ''}`}
            >
              <button
                onClick={() => deleteNotification(notif.id)}
                className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition-colors z-10"
                aria-label="Delete notification"
              >
                <X className="h-3 w-3" />
              </button>

              <div 
                className="pr-6 cursor-pointer" 
                onClick={() => !notif.read && markAsRead(notif.id)}
              >
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
      {notifications.length > 0 && (
        <div className="mt-3 pt-2 border-t text-xs text-gray-500 flex justify-between">
          <span>Total: {notifications.length}</span>
          <span>Unread: {unreadCount}</span>
        </div>
      )}
    </div>
  )
}