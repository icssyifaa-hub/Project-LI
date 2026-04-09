'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import {
  Calendar,
  MapPin,
  FileText,
  Users,
  Clock,
  ArrowUpDown,
  Download,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Edit2,
  Trash2,
  Eye,
  User,
  UserPlus
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

// ==================== TYPES FOR EVENT (MATCH DATABASE STRUCTURE) ====================
interface Event {
  id: string
  title: string
  description?: string
  date_start: string
  date_stop: string
  time_start?: string
  time_stop?: string
  location?: string
  event_pic_staff?: string
  event_pic_name?: string
  event_pic_color?: string
  event_support_staff?: string
  event_support_name?: string
  event_support_color?: string
  created_by?: string
  creator_name?: string
  creator_color?: string
  created_at?: string
  updated_at?: string
}



const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-GB', { 
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

const formatDateTime = (date: string, time?: string) => {
  if (!time) return formatDate(date)
  return `${formatDate(date)} ${time}`
}

const getEventStatus = (dateStart: string, dateStop: string) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const start = new Date(dateStart)
  start.setHours(0, 0, 0, 0)
  
  const stop = new Date(dateStop)
  stop.setHours(0, 0, 0, 0)
  
  if (today > stop) {
    return {
      label: 'Past',
      color: 'bg-gray-100 text-gray-700'
    }
  } else if (today >= start && today <= stop) {
    return {
      label: 'Ongoing',
      color: 'bg-green-100 text-green-700'
    }
  } else {
    return {
      label: 'Upcoming',
      color: 'bg-blue-100 text-blue-700'
    }
  }
}

const getDurationType = (dateStart: string, dateStop: string) => {
  if (dateStart === dateStop) {
    return 'Single Day'
  } else {
    const start = new Date(dateStart)
    const stop = new Date(dateStop)
    const diffTime = Math.abs(stop.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
    return `${diffDays} Days`
  }
}

export default function EventsPage() {
  const [user, setUser] = useState<any>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [sortField, setSortField] = useState<keyof Event>('date_start')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [filterCreator, setFilterCreator] = useState<string>('all')
  const [filterPIC, setFilterPIC] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [creatorList, setCreatorList] = useState<string[]>([])
  const [picList, setPicList] = useState<string[]>([])
  
  // For delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null)
  
  const itemsPerPage = 10
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (!userData) {
      router.push('/login')
    } else {
      setUser(JSON.parse(userData))
    }
  }, [router])

  // ==================== FETCH EVENTS FROM DATABASE ====================
  const fetchEvents = async () => {
    setLoading(true)
    try {
      console.log('📅 Fetching events from database...')
      
      // 1. First, get all users for names and colors
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, name, user_id, color')
        .not('color', 'is', null)
      
      if (usersError) throw usersError
      
      // Create user color map
      const userColorMap: {[key: string]: {name: string, color: string}} = {}
      usersData?.forEach(user => {
        if (user.user_id) {
          userColorMap[user.user_id] = {
            name: user.name,
            color: user.color || 'purple'
          }
        }
      })
      
      console.log('🎨 User colors loaded:', userColorMap)
      
      // 2. Fetch ALL events
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .order('date_start', { ascending: false })
      
      if (eventsError) throw eventsError
      
      console.log(`📊 Found ${eventsData?.length || 0} events in database`)
      
      // 3. Format events with creator and staff info
      const formattedEvents: Event[] = (eventsData || []).map((event: any) => {
        const creatorCode = event.created_by || ''
        const picCode = event.event_pic_staff || ''
        const supportCode = event.event_support_staff || ''
        
        const creatorInfo = userColorMap[creatorCode]
        const picInfo = userColorMap[picCode]
        const supportInfo = supportCode ? userColorMap[supportCode] : null
        
        return {
          id: event.id,
          title: event.title || 'Untitled Event',
          description: event.description,
          date_start: event.date_start,
          date_stop: event.date_stop || event.date_start,
          time_start: event.time_start,
          time_stop: event.time_stop,
          location: event.location,
          event_pic_staff: picCode,
          event_pic_name: picInfo?.name || picCode || null,
          event_pic_color: picInfo?.color || 'blue',
          event_support_staff: supportCode,
          event_support_name: supportInfo?.name || supportCode || null,
          event_support_color: supportInfo?.color || 'gray',
          created_by: creatorCode,
          creator_name: creatorInfo?.name || 'Unknown Creator',
          creator_color: creatorInfo?.color || 'purple',
          created_at: event.created_at,
          updated_at: event.updated_at
        }
      })
      
      // 4. Extract unique creator names for filter dropdown
      const creators = new Set<string>()
      const pics = new Set<string>()
      
      formattedEvents.forEach(event => {
        if (event.creator_name) creators.add(event.creator_name)
        if (event.event_pic_name) pics.add(event.event_pic_name)
      })
      
      setCreatorList(Array.from(creators).sort())
      setPicList(Array.from(pics).sort())
      setEvents(formattedEvents)
      
      toast({
        title: "Success",
        description: `Loaded ${formattedEvents.length} events`,
      })
      
    } catch (error: any) {
      console.error('❌ Error fetching events:', error)
      toast({
        title: "Error",
        description: error?.message || "Failed to fetch events",
        variant: "destructive",
      })
      
      setEvents([])
      
    } finally {
      setLoading(false)
    }
  }

  // Fetch on mount and when user changes
  useEffect(() => {
    if (user) {
      fetchEvents()
    }
  }, [user])

  // ==================== HANDLE DELETE ====================
  const handleDeleteClick = (event: Event) => {
    setEventToDelete(event)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!eventToDelete) return
    
    try {
      console.log('🗑️ Deleting event:', eventToDelete.id)
      
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventToDelete.id)
      
      if (error) throw error
      
      // Remove from local state
      setEvents(events.filter(e => e.id !== eventToDelete.id))
      
      toast({
        title: "Success",
        description: "Event deleted successfully",
      })
      
    } catch (error: any) {
      console.error('❌ Error deleting event:', error)
      toast({
        title: "Error",
        description: error?.message || "Failed to delete event",
        variant: "destructive",
      })
    } finally {
      setDeleteDialogOpen(false)
      setEventToDelete(null)
    }
  }

  // ==================== HANDLE SORT ====================
  const handleSort = (field: keyof Event) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // ==================== VIEW IN CALENDAR ====================
  const handleViewInCalendar = (date: string) => {
    router.push(`/calendar?date=${date}`)
  }

  // ==================== EDIT EVENT ====================
  const handleEditEvent = (event: Event) => {
    // Navigate to calendar with event ID for editing
    router.push(`/calendar?editEvent=${event.id}`)
  }

  // ==================== FILTER AND SORT ====================
  const filteredAndSortedEvents = events
    .filter(event => {
      const matchesSearch = 
        (event.title?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (event.description?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (event.location?.toLowerCase() || '').includes(searchTerm.toLowerCase())
      
      const matchesCreator = filterCreator === 'all' || event.creator_name === filterCreator
      const matchesPIC = filterPIC === 'all' || event.event_pic_name === filterPIC
      
      const status = getEventStatus(event.date_start, event.date_stop)
      const matchesStatus = filterStatus === 'all' || status.label.toLowerCase() === filterStatus.toLowerCase()
      
      return matchesSearch && matchesCreator && matchesPIC && matchesStatus
    })
    .sort((a, b) => {
      let aValue = a[sortField]
      let bValue = b[sortField]
      
      // Handle undefined values
      if (aValue === undefined) aValue = ''
      if (bValue === undefined) bValue = ''
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }
      return 0
    })

  // ==================== PAGINATION ====================
  const totalPages = Math.ceil(filteredAndSortedEvents.length / itemsPerPage)
  const paginatedEvents = filteredAndSortedEvents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  if (!user) return null

  const isAdmin = user.role === 'admin' || user.role === 'superadmin'

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the event "{eventToDelete?.title}". 
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmDelete}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Events List</h1>
            <p className="text-sm text-gray-500 mt-1">
              Total: {events.length} events
            </p>
          </div>
          
          <div className="flex gap-2">
            {/* Refresh Button */}
            <Button 
              variant="outline" 
              onClick={fetchEvents}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Refresh'}
            </Button>
            
            {/* Export Button */}
            <Button 
              variant="outline" 
              className="border-gray-300"
              onClick={() => {
                // Export logic
                const headers = ['Title', 'Start Date', 'End Date', 'Time', 'Location', 'PIC', 'Support Staff', 'Created By', 'Status']
                const csvRows = [headers]
                
                filteredAndSortedEvents.forEach(event => {
                  const status = getEventStatus(event.date_start, event.date_stop)
                  const row = [
                    event.title,
                    formatDate(event.date_start),
                    formatDate(event.date_stop),
                    event.time_start ? `${event.time_start}${event.time_stop ? ` - ${event.time_stop}` : ''}` : 'All day',
                    event.location || '',
                    event.event_pic_name || '',
                    event.event_support_name || '',
                    event.creator_name || '',
                    status.label
                  ]
                  csvRows.push(row.map(cell => `"${cell}"`))
                })
                
                const csvContent = csvRows.map(row => row.join(',')).join('\n')
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `events-${new Date().toISOString().split('T')[0]}.csv`
                a.click()
                window.URL.revokeObjectURL(url)
                
                toast({ title: "Events exported successfully" })
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>

            {/* Add Event Button */}
            <Button 
              onClick={() => router.push('/calendar?add=event')}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Add Event
            </Button>
          </div>
        </div>

        {/* Filters Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <Input
            placeholder="Search by title, description, location..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setCurrentPage(1)
            }}
            className="bg-white border-gray-300"
          />

          {/* Filter by PIC */}
          <Select value={filterPIC} onValueChange={(value) => {
            setFilterPIC(value)
            setCurrentPage(1)
          }}>
            <SelectTrigger className="bg-white border-gray-300">
              <SelectValue placeholder="Filter by PIC" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All PIC</SelectItem>
              {picList.map(pic => (
                <SelectItem key={pic} value={pic}>{pic}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Filter by Status */}
          <Select value={filterStatus} onValueChange={(value) => {
            setFilterStatus(value)
            setCurrentPage(1)
          }}>
            <SelectTrigger className="bg-white border-gray-300">
              <SelectValue placeholder="Filter by Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="upcoming">Upcoming</SelectItem>
              <SelectItem value="ongoing">Ongoing</SelectItem>
              <SelectItem value="past">Past</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Active Filters Summary */}
        {(searchTerm || filterCreator !== 'all' || filterPIC !== 'all' || filterStatus !== 'all') && (
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <span className="text-gray-500">Filters active:</span>
            {searchTerm && (
              <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                Search: {searchTerm}
              </span>
            )}
            {filterCreator !== 'all' && (
              <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                Creator: {filterCreator}
              </span>
            )}
            {filterPIC !== 'all' && (
              <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                PIC: {filterPIC}
              </span>
            )}
            {filterStatus !== 'all' && (
              <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                Status: {filterStatus}
              </span>
            )}
            <Button 
              variant="ghost" 
              size="sm"
              className="text-xs"
              onClick={() => {
                setSearchTerm('')
                setFilterCreator('all')
                setFilterPIC('all')
                setFilterStatus('all')
              }}
            >
              Clear all
            </Button>
          </div>
        )}

        {/* Events Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-16">No</th>
                
                {/* Sortable Headers */}
                {[
                  { key: 'title', label: 'Event Title' },
                  { key: 'date_start', label: 'Start Date' },
                  { key: 'date_stop', label: 'End Date' },
                  { key: 'time_start', label: 'Time' }
                ].map(column => (
                  <th 
                    key={column.key}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort(column.key as keyof Event)}
                  >
                    <div className="flex items-center space-x-1">
                      <span>{column.label}</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                ))}
                
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">PIC</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Support Staff</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={13} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-2"></div>
                      <p className="text-sm text-gray-500">Loading events...</p>
                    </div>
                  </td>
                </tr>
              ) : paginatedEvents.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-4 py-12 text-center">
                    <div className="text-gray-400 text-4xl mb-2">📅</div>
                    <p className="text-gray-500">No events found</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {searchTerm || filterCreator !== 'all' || filterPIC !== 'all' || filterStatus !== 'all' 
                        ? 'Try clearing your filters' 
                        : 'Click "Add Event" to create your first event'}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedEvents.map((event, index) => {
                  const status = getEventStatus(event.date_start, event.date_stop)
                  const durationType = getDurationType(event.date_start, event.date_stop)

                  
                  return (
                    <tr 
                      key={event.id} 
                      className="hover:bg-gray-50 transition-colors group"
                    >
                      <td className="px-4 py-3 text-gray-600">
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </td>
                      
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">
                            {event.title}
                          </span>
                          {event.description && (
                            <span 
                              className="text-gray-400 cursor-help text-xs" 
                              title={event.description}
                            >
                              📝
                            </span>
                          )}
                        </div>
                      </td>
                      
                      <td className="px-4 py-3 text-gray-600">
                        <div className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1 text-gray-400" />
                          {formatDate(event.date_start)}
                        </div>
                      </td>
                      
                      <td className="px-4 py-3 text-gray-600">
                        {formatDate(event.date_stop)}
                      </td>
                      
                      <td className="px-4 py-3">
                        {event.time_start ? (
                          <div className="flex items-center">
                            <Clock className="h-3 w-3 mr-1 text-gray-400" />
                            <span>
                              {event.time_start}
                              {event.time_stop && ` - ${event.time_stop}`}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">All day</span>
                        )}
                      </td>
                      
                      <td className="px-4 py-3">
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">
                          {durationType}
                        </span>
                      </td>
                      
                      <td className="px-4 py-3">
                        {event.location ? (
                          <div className="flex items-center text-gray-600">
                            <MapPin className="h-3 w-3 mr-1 text-gray-400" />
                            <span className="truncate max-w-[150px]" title={event.location}>
                              {event.location}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">No location</span>
                        )}
                      </td>
                      
                      <td className="px-4 py-3">
                        {event.event_pic_name ? (
                          <div className="flex items-center">
                            <span 
                              className="w-2 h-2 rounded-full mr-2"
                              style={{ backgroundColor: event.event_pic_color }}
                            ></span>
                            <span className="text-sm">{event.event_pic_name}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">Not assigned</span>
                        )}
                      </td>
                      
                      <td className="px-4 py-3">
                        {event.event_support_name ? (
                          <div className="flex items-center">
                            <span 
                              className="w-2 h-2 rounded-full mr-2"
                              style={{ backgroundColor: event.event_support_color }}
                            ></span>
                            <span className="text-sm">{event.event_support_name}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>
                      
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                          {status.label}
                        </span>
                      </td>
                      
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {/* View in Calendar */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            onClick={() => handleViewInCalendar(event.date_start)}
                            title="View in Calendar"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          
                          {/* Edit */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                            onClick={() => handleEditEvent(event)}
                            title="Edit Event"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          
                          {/* Delete - Admin only */}
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDeleteClick(event)}
                              title="Delete Event"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredAndSortedEvents.length > 0 && !loading && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredAndSortedEvents.length)} of {filteredAndSortedEvents.length} entries
            </p>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum = currentPage
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? 'default' : 'outline'}
                      size="sm"
                      className="w-8 h-8"
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  )
                })}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Info Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-white rounded-lg border border-gray-200">
          {/* Status Info */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">📊 Event Status:</h4>
            <div className="space-y-1 text-xs">
              <div className="flex items-center">
                <span className="w-3 h-3 rounded-full bg-blue-500 mr-2"></span>
                <span className="text-gray-600">Upcoming</span>
              </div>
              <div className="flex items-center">
                <span className="w-3 h-3 rounded-full bg-green-500 mr-2"></span>
                <span className="text-gray-600">Ongoing</span>
              </div>
              <div className="flex items-center">
                <span className="w-3 h-3 rounded-full bg-gray-400 mr-2"></span>
                <span className="text-gray-600">Past</span>
              </div>
            </div>
          </div>

          {/* Duration Info */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">⏱️ Duration Types:</h4>
            <div className="space-y-1 text-xs">
              <div className="flex items-center">
                <Calendar className="h-3 w-3 mr-2 text-gray-500" />
                <span className="text-gray-600">Single Day</span>
              </div>
              <div className="flex items-center">
                <Calendar className="h-3 w-3 mr-2 text-purple-500" />
                <span className="text-gray-600">Multi-Day</span>
              </div>
            </div>
          </div>

          {/* Staff Info */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">👥 Staff Roles:</h4>
            <div className="space-y-1 text-xs">
              <div className="flex items-center">
                <User className="h-3 w-3 mr-2 text-green-600" />
                <span className="text-gray-600">PIC (Person In Charge)</span>
              </div>
              <div className="flex items-center">
                <UserPlus className="h-3 w-3 mr-2 text-blue-600" />
                <span className="text-gray-600">Support Staff</span>
              </div>
            </div>
          </div>

          {/* Actions Info */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">🔧 Available Actions:</h4>
            <div className="space-y-1 text-xs">
              <div className="flex items-center">
                <Eye className="h-3 w-3 mr-2 text-blue-600" />
                <span className="text-gray-600">View in Calendar</span>
              </div>
              <div className="flex items-center">
                <Edit2 className="h-3 w-3 mr-2 text-purple-600" />
                <span className="text-gray-600">Edit Event</span>
              </div>
              {isAdmin && (
                <div className="flex items-center">
                  <Trash2 className="h-3 w-3 mr-2 text-red-600" />
                  <span className="text-gray-600">Delete Event (Admin only)</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}