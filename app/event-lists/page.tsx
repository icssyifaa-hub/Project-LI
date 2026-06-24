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
  Trash2,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { getDotClass } from '@/lib/colors'
import { downloadExcelReport, downloadPdfReport } from '@/lib/report-export'

interface Event {
  id: string
  title: string
  description?: string
  date_start: string | null
  date_stop: string | null
  time_start?: string
  time_stop?: string
  location?: string
  event_pic_id?: string
  event_pic_name?: string
  event_pic_color?: string
  event_support_ids?: string[]
  event_support_names?: string[]
  event_support_colors?: string[]
  created_by?: string
  created_at?: string
  updated_at?: string
}

const formatDate = (dateString: string | null) => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return 'N/A'
  return date.toLocaleDateString('en-GB', { 
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

const getEventStatus = (dateStart: string | null, dateStop: string | null) => {
  if (!dateStart) {
    return {
      label: 'Past',
      color: 'border border-gray-300 [background-color:white] [color:#111827]'
    }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const start = new Date(dateStart)
  start.setHours(0, 0, 0, 0)
  
  const stop = new Date(dateStop || dateStart)
  stop.setHours(0, 0, 0, 0)
  
  if (today > stop) {
    return {
      label: 'Past',
      color: 'border border-gray-300 [background-color:white] [color:#111827]'
    }
  } else if (today >= start && today <= stop) {
    return {
      label: 'Ongoing',
      color: 'border [border-color:#16a34a] [background-color:#dcfce7] [color:#15803d]'
    }
  } else {
    return {
      label: 'Upcoming',
      color: 'border [border-color:#2563eb] [background-color:#dbeafe] [color:#1d4ed8]'
    }
  }
}

const tableHeaderCellClass = 'border-r border-black px-4 py-3 text-left text-[11px] font-semibold uppercase text-gray-700 dark:text-gray-200'
const sortableHeaderCellClass = `${tableHeaderCellClass} cursor-pointer transition-colors hover:bg-gray-200/80 dark:hover:bg-gray-700/70`
const tableCellClass = 'border-r border-black px-4 py-3'
const paginationButtonClass = 'border-gray-300 bg-white text-gray-900 shadow-sm hover:bg-gray-100 disabled:border-gray-200 disabled:bg-gray-200 disabled:text-gray-500 disabled:opacity-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800 dark:disabled:border-gray-800 dark:disabled:bg-gray-800 dark:disabled:text-gray-500'
const activePaginationButtonClass = 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:text-white dark:hover:bg-blue-400'

const getEventRowClass = (statusLabel: string) => {
  switch (statusLabel) {
    case 'Past':
      return '[background-color:white] hover:[background-color:#f9fafb] [&_td]:border-black [&_td]:text-black [&_button]:text-black'
    case 'Ongoing':
      return '[background-color:#bbf7d0] hover:[background-color:#86efac] [&_td]:border-black [&_td]:text-black [&_button]:text-black'
    case 'Upcoming':
      return '[background-color:#bfdbfe] hover:[background-color:#93c5fd] [&_td]:border-black [&_td]:text-black [&_button]:text-black'
    default:
      return '[background-color:white] hover:[background-color:#f9fafb] [&_td]:border-black [&_td]:text-black [&_button]:text-black'
  }
}

const parseTextArray = (textValue: string | null | undefined): string[] => {
  if (!textValue) return []
  
  try {
    if (textValue.startsWith('[')) {
      return JSON.parse(textValue)
    }
    return textValue.split(',').map(item => item.trim()).filter(item => item)
  } catch (e) {
    console.error('Error parsing array:', e)
    return []
  }
}

export default function EventsPage() {
  const [user, setUser] = useState<any>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [sortField, setSortField] = useState<keyof Event>('created_at')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [filterStaff, setFilterStaff] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [staffList, setStaffList] = useState<string[]>([])
  const [staffStatusMap, setStaffStatusMap] = useState<Map<string, boolean>>(new Map())
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null)
  const itemsPerPage = 10
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()
  const isAdmin = ['admin', 'superadmin'].includes(String(user?.role || '').toLowerCase())

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (!userData) {
      router.push('/login')
    } else {
      setUser(JSON.parse(userData))
    }
  }, [router])

  const fetchEvents = async () => {
    setLoading(true)
    try {
      console.log('📅 Fetching events from database...')
      
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, name, color, role, is_active')
      
      if (usersError) throw usersError
      
      const userMap: {[key: string]: {name: string, color: string, is_active: boolean}} = {}
      const staffNames: string[] = []
      const statusMap = new Map<string, boolean>()
      
      usersData?.forEach((user: {id: string; name: string; color?: string; role?: string; is_active?: boolean}) => {
        const isActive = user.is_active ?? true
        const displayColor = user.color || 'purple'
        if (user.id) {
          userMap[user.id] = {
            name: user.name,
            color: displayColor,
            is_active: isActive
          }
          userMap[user.name] = {
            name: user.name,
            color: displayColor,
            is_active: isActive
          }
        }
        
        if (user.role === 'staff' && user.name) {
          staffNames.push(user.name)
          statusMap.set(user.name, isActive)
        }
      })
      
      staffNames.sort()
      setStaffList(staffNames)
      setStaffStatusMap(statusMap)
      
      console.log(`📋 Found ${staffNames.length} staff members for filter (including inactive)`)
      
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (eventsError) throw eventsError
      
      console.log(`📊 Found ${eventsData?.length || 0} events in database`)
      
      const formattedEvents: Event[] = (eventsData || []).map((event: any) => {
        const picId = event.event_pic_id || ''
        const picName = event.event_pic_name || ''
        
        let picInfo = null
        if (picId && userMap[picId]) {
          picInfo = userMap[picId]
        } else if (picName && userMap[picName]) {
          picInfo = userMap[picName]
        }
        
        const picColor = picInfo?.color || event.event_pic_color || 'blue'
        const actualPicName = picInfo?.name || picName || null
        
        const supportIds = parseTextArray(event.event_support_ids)
        const supportNamesRaw = parseTextArray(event.event_support_names)
        const supportColorsRaw = parseTextArray(event.event_support_colors || '')
        const supportNames: string[] = []
        const supportColors: string[] = []
        
        for (let i = 0; i < supportIds.length; i++) {
          const supportId = supportIds[i]
          const supportInfo = userMap[supportId]
          
          if (supportInfo) {
            supportNames.push(supportInfo.name)
            supportColors.push(supportInfo.color)
          } else if (supportNamesRaw[i]) {
            supportNames.push(supportNamesRaw[i])
            supportColors.push(supportColorsRaw[i] || 'blue')
          }
        }
        
        if (supportIds.length === 0 && supportNamesRaw.length > 0) {
          for (let i = 0; i < supportNamesRaw.length; i++) {
            const sname = supportNamesRaw[i]
            const supportInfo = userMap[sname]
            if (supportInfo) {
              supportNames.push(supportInfo.name)
              supportColors.push(supportInfo.color)
            } else {
              supportNames.push(sname)
              supportColors.push(supportColorsRaw[i] || 'blue')
            }
          }
        }
        
        return {
          id: event.id,
          title: event.title || 'Untitled Event',
          description: event.description,
          date_start: event.date_start,
          date_stop: event.date_stop || event.date_start,
          time_start: event.time_start,
          time_stop: event.time_stop,
          location: event.location,
          event_pic_id: picId,
          event_pic_name: actualPicName,
          event_pic_color: picColor,
          event_support_ids: supportIds,
          event_support_names: supportNames,
          event_support_colors: supportColors,
          created_by: event.created_by,
          created_at: event.created_at,
          updated_at: event.updated_at
        }
      })
      
      setEvents(formattedEvents)
      
      const activeStaffCount = Array.from(statusMap.values()).filter(isActive => isActive === true).length
      const inactiveStaffCount = statusMap.size - activeStaffCount
      
      toast({
        title: "Success",
        description: `Loaded ${formattedEvents.length} events | ${statusMap.size} staff members (${activeStaffCount} active, ${inactiveStaffCount} inactive)`,
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

  useEffect(() => {
    if (user) {
      fetchEvents()
    }
  }, [user])

  const handleDeleteClick = (event: Event) => {
    if (!isAdmin) {
      toast({
        title: "Access denied",
        description: "Only admins can delete events",
        variant: "destructive",
      })
      return
    }

    setEventToDelete(event)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!eventToDelete) return
    if (!isAdmin) {
      setDeleteDialogOpen(false)
      setEventToDelete(null)
      toast({
        title: "Access denied",
        description: "Only admins can delete events",
        variant: "destructive",
      })
      return
    }
    
    try {
      console.log('🗑️ Deleting event:', eventToDelete.id)
      
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventToDelete.id)
      
      if (error) throw error
      
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

  const handleSort = (field: keyof Event) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const handleViewInCalendar = (date: string | null) => {
    if (!date) {
      toast({
        title: 'No start date',
        description: 'This event has no start date to show in calendar.',
        variant: 'destructive',
      })
      return
    }

    const formattedDate = date.split('T')[0]
    router.push(`/calendar?date=${formattedDate}&view=month&focus=${formattedDate}`)
  }

  const matchesStaffFilter = (event: Event, filterStaffValue: string): boolean => {
    if (filterStaffValue === 'all') return true
    if (event.event_pic_name === filterStaffValue) return true
    if (event.event_support_names?.includes(filterStaffValue)) return true
    return false
  }

  const filteredAndSortedEvents = events
    .filter(event => {
      const matchesSearch = 
        (event.title?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (event.description?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (event.location?.toLowerCase() || '').includes(searchTerm.toLowerCase())
      
      const matchesStaff = matchesStaffFilter(event, filterStaff)
      
      const status = getEventStatus(event.date_start, event.date_stop)
      const matchesStatus = filterStatus === 'all' || status.label.toLowerCase() === filterStatus.toLowerCase()
      
      return matchesSearch && matchesStaff && matchesStatus
    })
    .sort((a, b) => {
      let aValue = a[sortField]
      let bValue = b[sortField]
      
      if (aValue == null) aValue = ''
      if (bValue == null) bValue = ''
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }
      return 0
    })

  const totalPages = Math.ceil(filteredAndSortedEvents.length / itemsPerPage)
  const paginatedEvents = filteredAndSortedEvents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  if (!user) return null

  const activeStaffCount = Array.from(staffStatusMap.values()).filter(isActive => isActive === true).length
  const inactiveStaffCount = staffList.length - activeStaffCount
  const reportHeaders = ['Title', 'Start Date', 'End Date', 'Start Time', 'End Time', 'Location', 'PIC', 'Support Staff', 'Status']
  const reportRows = filteredAndSortedEvents.map(event => {
    const status = getEventStatus(event.date_start, event.date_stop)

    return [
      event.title,
      formatDate(event.date_start),
      formatDate(event.date_stop),
      event.time_start || '',
      event.time_stop || '',
      event.location || '',
      event.event_pic_name || '',
      event.event_support_names?.join(', ') || '',
      status.label,
    ]
  })
  const reportDate = new Date().toISOString().split('T')[0]
  const exportReport = (format: 'pdf' | 'excel') => {
    const options = {
      title: 'Events List',
      headers: reportHeaders,
      rows: reportRows,
      filename: `events-list-${reportDate}`,
    }

    if (format === 'pdf') {
      downloadPdfReport(options)
    } else {
      downloadExcelReport(options)
    }

    toast({ title: `Events exported as ${format === 'pdf' ? 'PDF' : 'Excel'}` })
  }

  return (
    <div className="min-h-screen bg-gray-50 p-2 dark:bg-gray-950 sm:p-3 lg:p-4">
      <div className="w-full max-w-none space-y-6">
        <AlertDialog open={isAdmin && deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
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

        <div className="-mx-2 -mt-2 flex flex-col gap-4 border-b border-gray-200 bg-white px-2 py-4 dark:border-gray-800 dark:bg-gray-950 sm:-mx-3 sm:-mt-3 sm:flex-row sm:items-center sm:justify-between sm:px-3 lg:-mx-4 lg:-mt-4 lg:px-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Events List</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Total: {events.length} events | Staff: {staffList.length} total
              {inactiveStaffCount > 0 && ` (${activeStaffCount} active, ${inactiveStaffCount} inactive)`}
            </p>
          </div>
          
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button
              variant="outline"
              onClick={fetchEvents}
              disabled={loading}
              className="w-full border-gray-300 text-gray-900 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-800 sm:w-auto"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full border-gray-300 text-gray-900 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-800 sm:w-auto"
                >
                  <Download className="mr-2 h-4 w-4" /> Report
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
                <DropdownMenuItem onClick={() => exportReport('pdf')} className="cursor-pointer text-gray-900 dark:text-gray-100">
                  <FileText className="mr-2 h-4 w-4" /> Download PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportReport('excel')} className="cursor-pointer text-gray-900 dark:text-gray-100">
                  <Download className="mr-2 h-4 w-4" /> Download Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Input
            placeholder="Search by title, description, location..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setCurrentPage(1)
            }}
            className="border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-900"
          />

          <Select value={filterStaff} onValueChange={(value) => {
            setFilterStaff(value)
            setCurrentPage(1)
          }}>
            <SelectTrigger className="border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-900">
              <SelectValue placeholder="Filter by Staff (PIC/Support)" />
            </SelectTrigger>
            <SelectContent className="max-h-80 border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
              <SelectItem value="all">All Staff ({staffList.length})</SelectItem>
              {staffList.map(staff => {
                const isActive = staffStatusMap.get(staff)
                return (
                  <SelectItem key={staff} value={staff}>
                    <div className="flex items-center gap-2">
                      <span>{staff}</span>
                      {!isActive && <span className="text-xs text-gray-400">(inactive)</span>}
                    </div>
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={(value) => {
            setFilterStatus(value)
            setCurrentPage(1)
          }}>
            <SelectTrigger className="border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-900">
              <SelectValue placeholder="Filter by Status" />
            </SelectTrigger>
            <SelectContent className="max-h-80 border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="upcoming">Upcoming</SelectItem>
              <SelectItem value="ongoing">Ongoing</SelectItem>
              <SelectItem value="past">Past</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {(searchTerm || filterStaff !== 'all' || filterStatus !== 'all') && (
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <span className="text-gray-500 dark:text-gray-400">Filters active:</span>
            {searchTerm && (
              <span className="rounded-full px-2 py-0.5 [background-color:#dbeafe] [color:#1e40af]">
                Search: {searchTerm}
              </span>
            )}
            {filterStaff !== 'all' && (
              <span className={`rounded-full px-2 py-0.5 ${staffStatusMap.get(filterStaff) ? '[background-color:#f3e8ff] [color:#6b21a8]' : '[background-color:#fee2e2] [color:#991b1b]'}`}>
                Staff: {filterStaff} {!staffStatusMap.get(filterStaff) && '(inactive)'}
              </span>
            )}
            {filterStatus !== 'all' && (
              <span className="rounded-full px-2 py-0.5 [background-color:#fef9c3] [color:#854d0e]">
                Status: {filterStatus}
              </span>
            )}
            <Button 
              variant="ghost" 
              size="sm"
              className="text-xs"
              onClick={() => {
                setSearchTerm('')
                setFilterStaff('all')
                setFilterStatus('all')
              }}
            >
              Clear all
            </Button>
          </div>
        )}

        <div className="overflow-hidden rounded-lg border border-black bg-white shadow-sm ring-1 ring-black/10 dark:bg-gray-900">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] border-collapse text-sm">
            <thead className="bg-gray-100 dark:bg-gray-800">
              <tr className="border-b border-black">
                <th className={`${tableHeaderCellClass} w-12`}>No</th>
                <th className={sortableHeaderCellClass} onClick={() => handleSort('title')}>
                  <div className="flex items-center space-x-1">Event Title <ArrowUpDown className="h-3 w-3" /></div>
                </th>
                <th className={sortableHeaderCellClass} onClick={() => handleSort('date_start')}>
                  <div className="flex items-center space-x-1">Start Date <ArrowUpDown className="h-3 w-3" /></div>
                </th>
                <th className={sortableHeaderCellClass} onClick={() => handleSort('date_stop')}>
                  <div className="flex items-center space-x-1">End Date <ArrowUpDown className="h-3 w-3" /></div>
                </th>
                <th className={tableHeaderCellClass}>Location</th>
                <th className={tableHeaderCellClass}>PIC</th>
                <th className={tableHeaderCellClass}>Support Staff</th>
                <th className={tableHeaderCellClass}>Status</th>
                {isAdmin && (
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase text-gray-700 dark:text-gray-200">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-black">
              {loading ? (
                <tr>
                  <td colSpan={isAdmin ? 9 : 8} className="border-t border-black px-4 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-2"></div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Loading events...</p>
                    </div>
                  </td>
                </tr>
              ) : paginatedEvents.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 9 : 8} className="border-t border-black px-4 py-12 text-center">
                    <div className="text-gray-400 text-4xl mb-2">📅</div>
                    <p className="text-gray-500 dark:text-gray-300">No events found</p>
                    <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                      {searchTerm || filterStaff !== 'all' || filterStatus !== 'all' 
                        ? 'Try clearing your filters' 
                        : 'Click "Add Event" to create your first event'}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedEvents.map((event, index) => {
                  const status = getEventStatus(event.date_start, event.date_stop)

                  return (
                    <tr key={event.id} className={`group border-b border-black transition-colors ${getEventRowClass(status.label)}`}>
                      <td className={`${tableCellClass} text-black`}>
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </td>
                      <td className={tableCellClass}>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleViewInCalendar(event.date_start)}
                            className="max-w-xs truncate text-left font-medium text-blue-700 hover:text-blue-900 hover:underline"
                          >
                            {event.title}
                          </button>
                          <button
                            onClick={() => handleViewInCalendar(event.date_start)}
                            className="text-blue-500 opacity-0 transition-opacity hover:text-blue-700 group-hover:opacity-100"
                            title="View in Calendar"
                          >
                            <CalendarIcon className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                      <td className={`${tableCellClass} text-black`}>
                        <div className="flex items-center">
                          {formatDate(event.date_start)}
                        </div>
                      </td>
                      <td className={`${tableCellClass} text-black`}>
                        {formatDate(event.date_stop)}
                      </td>
                      <td className={tableCellClass}>
                        {event.location ? (
                          <div className="flex items-center text-black">
                            <MapPin className="h-3 w-3 mr-1 text-black-400" />
                            <span className="truncate max-w-[150px]" title={event.location}>
                              {event.location}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-black">-</span>
                        )}
                      </td>
                      <td className={tableCellClass}>
                        {event.event_pic_name ? (
                          <div className="flex items-center">
                            <span className={`w-3 h-3 rounded-full mr-2 flex-shrink-0 ${getDotClass(event.event_pic_color)}`}></span>
                            <span className="text-sm font-medium">
                              {event.event_pic_name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-black">Not assigned</span>
                        )}
                      </td>
                      <td className={tableCellClass}>
                        {event.event_support_names && event.event_support_names.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {event.event_support_names.map((name, idx) => (
                              <div key={idx} className="flex items-center">
                                <span className={`w-3 h-3 rounded-full mr-2 flex-shrink-0 ${getDotClass(event.event_support_colors?.[idx])}`}></span>
                                <span className="text-sm">
                                  {name}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-black">No support staff</span>
                        )}
                      </td>
                      <td className={tableCellClass}>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm ${status.color}`}>
                          {status.label}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDeleteClick(event)}
                              title="Delete Event"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
          </div>
        </div>

        {filteredAndSortedEvents.length > 0 && !loading && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-500">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredAndSortedEvents.length)} of {filteredAndSortedEvents.length} entries
            </p>
            <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
              <Button
                variant="outline"
                size="icon"
                className={paginationButtonClass}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-1">
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
                      className={`h-8 w-8 ${currentPage === pageNum ? activePaginationButtonClass : paginationButtonClass}`}
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
                className={paginationButtonClass}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900 md:grid-cols-3">
          <div>
            <h4 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">Event Status:</h4>
            <div className="space-y-1 text-xs">
              <div className="flex items-center">
                <span className="w-3 h-3 rounded-full bg-blue-500 mr-2"></span>
                <span className="text-gray-600 dark:text-gray-400">Upcoming - Future events</span>
              </div>
              <div className="flex items-center">
                <span className="w-3 h-3 rounded-full bg-green-500 mr-2"></span>
                <span className="text-gray-600 dark:text-gray-400">Ongoing - Currently happening</span>
              </div>
              <div className="flex items-center">
                <span className="mr-2 h-3 w-3 rounded-full border border-gray-300 [background-color:white]"></span>
                <span className="text-gray-600 dark:text-gray-400">Past - Completed events</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">Staff Roles:</h4>
            <div className="space-y-1 text-xs">
              <div>
                <span className="text-gray-600 dark:text-gray-400"><strong>PIC</strong> (Person In Charge) - Single person responsible</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400"><strong>Support Staff</strong> - Multiple people can be assigned</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">Available Actions:</h4>
            <div className="space-y-1 text-xs">
              {isAdmin && (
                <div className="flex items-center">
                  <Trash2 className="h-3 w-3 mr-2 text-red-600" />
                  <span className="text-gray-600 dark:text-gray-400">Delete Event - Permanently remove (Admin only)</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
