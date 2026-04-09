'use client'

import { useState, useEffect } from 'react'
import { CalendarViews } from './components/CalendarViews'
import { useCalendarData } from './hooks/useCalendarData'
import AddCalendarItemModal from './AddCalendarItemModal'
import TaskInbox from './TaskInbox'
import CalendarFilter from './components/CalendarFilter'
import type { Task, Event, ViewType } from '@/types/calendar'
import type { UnscheduledTask } from './TaskInbox'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import NotificationsPanel from './NotificationsPanel'
import { createClient } from '@/lib/supabase/client'
import { 
  Inbox, 
  ChevronRight, 
  ChevronLeft,
  CalendarDays,
  ChevronDown,
  Bell,
  Filter,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import { useUsers } from '../settings/hooks/useUsers'
import { useHolidays } from '../settings/hooks/useHolidays'

// Constants for localStorage keys
const STORAGE_KEYS = {
  STAFF_FILTERS: 'calendar_staff_filters',
  SHOW_HOLIDAYS: 'calendar_show_holidays'
}

// Helper function to create stable date
const createStableDate = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0)
}

// Type untuk staff filters (tasks & events per staff)
interface StaffFilters {
  [staffCode: string]: {
    tasks: boolean
    events: boolean
  }
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(createStableDate(new Date()))
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [showItemModal, setShowItemModal] = useState(false)
  const [selectedItemType, setSelectedItemType] = useState<'event' | 'task' | null>(null)
  const [view, setView] = useState<ViewType>('month')
  const [draggedTask, setDraggedTask] = useState<UnscheduledTask | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [draggedOverDate, setDraggedOverDate] = useState<string | null>(null)
  const [showTaskInbox, setShowTaskInbox] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showFilter, setShowFilter] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [staffFilters, setStaffFilters] = useState<StaffFilters>({})
  const [showHolidays, setShowHolidays] = useState(false)
  const [prefilledTaskData, setPrefilledTaskData] = useState<any>(null) // NEW
  const [isTestingNotif, setIsTestingNotif] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()
  
  // ===== HOOKS =====
  const { 
    tasks, 
    events, 
    holidays,
    loading, 
    user,
    saveTask, 
    saveEvent, 
    deleteTask, 
    deleteEvent,
    refresh,
    staffColors
  } = useCalendarData(currentDate, view)

  const { users: allUsers, loading: loadingUsers } = useUsers()
  const { holidays: allHolidays, loading: loadingHolidays } = useHolidays()

  
  useEffect(() => {
    try {
      const savedStaffFilters = localStorage.getItem(STORAGE_KEYS.STAFF_FILTERS)
      if (savedStaffFilters) {
        const parsed = JSON.parse(savedStaffFilters)
        setStaffFilters(parsed)
        console.log('📦 Loaded staff filters from storage:', parsed)
      }

      // Load show holidays setting
      const savedHolidays = localStorage.getItem(STORAGE_KEYS.SHOW_HOLIDAYS)
      if (savedHolidays !== null) {
        setShowHolidays(JSON.parse(savedHolidays))
        console.log('📦 Loaded holidays from storage:', JSON.parse(savedHolidays))
      }
    } catch (error) {
      console.error('Error loading filter state from localStorage:', error)
    } finally {
      setIsInitialized(true)
    }
  }, [])

  // Save staff filters to localStorage
  useEffect(() => {
    if (!isInitialized) return
    try {
      localStorage.setItem(STORAGE_KEYS.STAFF_FILTERS, JSON.stringify(staffFilters))
      console.log('💾 Saved staff filters to storage:', staffFilters)
    } catch (error) {
      console.error('Error saving staff filters:', error)
    }
  }, [staffFilters, isInitialized])

  // Save holidays setting to localStorage
  useEffect(() => {
    if (!isInitialized) return
    try {
      localStorage.setItem(STORAGE_KEYS.SHOW_HOLIDAYS, JSON.stringify(showHolidays))
      console.log('💾 Saved holidays to storage:', showHolidays)
    } catch (error) {
      console.error('Error saving holidays:', error)
    }
  }, [showHolidays, isInitialized])

  const testNotification = async () => {
    setIsTestingNotif(true)
    
    try {
      const supabase = createClient()
      
      // Get user from localStorage instead of auth
      const userData = localStorage.getItem('user')
      
      if (!userData) {
        toast({
          title: "No User Found",
          description: "Please log in first",
          variant: "destructive",
        })
        setIsTestingNotif(false)
        return
      }
      
      const parsedUser = JSON.parse(userData)
      console.log('User from localStorage:', parsedUser)
      
      // Find user in database by email or name
      let dbUser = null
      
      // Try by email first
      if (parsedUser.email) {
        const { data } = await supabase
          .from('users')
          .select('id, name, email')
          .eq('email', parsedUser.email)
          .maybeSingle()
        dbUser = data
      }
      
      // If not found by email, try by name
      if (!dbUser && parsedUser.name) {
        const { data } = await supabase
          .from('users')
          .select('id, name, email')
          .eq('name', parsedUser.name)
          .maybeSingle()
        dbUser = data
      }
      
      // If still not found, try by user_id
      if (!dbUser && parsedUser.user_id) {
        const { data } = await supabase
          .from('users')
          .select('id, name, email')
          .eq('user_id', parsedUser.user_id)
          .maybeSingle()
        dbUser = data
      }
      
      if (!dbUser) {
        // Get first available user as fallback
        const { data: firstUser } = await supabase
          .from('users')
          .select('id, name')
          .limit(1)
          .single()
        dbUser = firstUser
      }
      
      if (!dbUser) {
        toast({
          title: "No User Found",
          description: "No users exist in database",
          variant: "destructive",
        })
        return
      }
      
      console.log('Sending notification to user:', dbUser)
      
      // Insert notification
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: dbUser.id,
          title: "🔔 TEST NOTIFICATION",
          message: `Test sent at ${new Date().toLocaleTimeString()} to ${dbUser.name}`,
          type: "task_assignment",
          read: false,
          created_at: new Date().toISOString()
        })
      
      if (notifError) {
        console.error('Error:', notifError)
        toast({
          title: "Error",
          description: notifError.message,
          variant: "destructive",
        })
      } else {
        toast({
          title: "✅ Success",
          description: `Test notification sent to ${dbUser.name}!`,
        })
      }
      
    } catch (error) {
      console.error('Error:', error)
      toast({
        title: "Error",
        description: "Something went wrong",
        variant: "destructive",
      })
    } finally {
      setIsTestingNotif(false)
    }
  }

  // ===== FILTER LOGIC =====
  
  // Filter TASKS berdasarkan staffFilters
  const filteredTasks = tasks.filter(task => {
    // Jika tiada staff filters, jangan tunjuk apa-apa
    if (Object.keys(staffFilters).length === 0) return false
    
    // Dapatkan staff code untuk task ini
    const taskStaffCode = task.taskPicStaff || task.task_pic_staff
    
    // Jika task tiada PIC, jangan tunjuk
    if (!taskStaffCode) return false
    
    // Dapatkan filter untuk staff ini
    const staffFilter = staffFilters[taskStaffCode]
    
    // Jika staff tidak dalam filter, jangan tunjuk
    if (!staffFilter) return false
    
    // Tunjuk task hanya jika checkbox tasks untuk staff ini adalah true
    return staffFilter.tasks === true
  })
  
  // Filter EVENTS berdasarkan staffFilters
  const filteredEvents = events.filter(event => {
    // Jika tiada staff filters, jangan tunjuk apa-apa
    if (Object.keys(staffFilters).length === 0) return false
    
    // Dapatkan staff code untuk event ini
    const eventStaffCode = event.eventPicStaff || event.event_pic_staff
    
    // Jika event tiada PIC, jangan tunjuk
    if (!eventStaffCode) return false
    
    // Dapatkan filter untuk staff ini
    const staffFilter = staffFilters[eventStaffCode]
    
    // Jika staff tidak dalam filter, jangan tunjuk
    if (!staffFilter) return false
    
    // Tunjuk event hanya jika checkbox events untuk staff ini adalah true
    return staffFilter.events === true
  })

  // Filter HOLIDAYS
  const filteredHolidays = showHolidays ? holidays : []

  // Count active filters
  const activeFilterCount = Object.values(staffFilters).filter(
    f => f.tasks || f.events
  ).length + (showHolidays ? 1 : 0)

  // Check if anything is selected
  const hasSelection = Object.keys(staffFilters).length > 0 || showHolidays

  // ===== DEBUG LOG =====
  useEffect(() => {
    console.log('🎯 Calendar State:', {
      staffFilters,
      staffFiltersCount: Object.keys(staffFilters).length,
      showHolidays,
      totalTasks: tasks.length,
      filteredTasksCount: filteredTasks.length,
      totalEvents: events.length,
      filteredEventsCount: filteredEvents.length,
      totalHolidays: holidays.length,
      filteredHolidaysCount: filteredHolidays.length,
      activeFilterCount,
      hasSelection,
      isInitialized
    })
  }, [tasks, events, holidays, staffFilters, showHolidays, filteredTasks.length, filteredEvents.length, filteredHolidays.length, activeFilterCount, hasSelection, isInitialized])

  // View options for dropdown
  const viewOptions = [
    { value: 'day', label: 'Day' },
    { value: 'week', label: 'Week' },
    { value: 'month', label: 'Month' },
    { value: 'year', label: 'Year' },
    { value: 'schedule', label: 'Schedule' },
  ]

  // ===== NAVIGATION HANDLERS =====
  const handlePrev = () => {
    const newDate = new Date(currentDate)
    switch (view) {
      case 'day': newDate.setDate(currentDate.getDate() - 1); break
      case 'week': newDate.setDate(currentDate.getDate() - 7); break
      case 'month': newDate.setMonth(currentDate.getMonth() - 1); break
      case 'year': newDate.setFullYear(currentDate.getFullYear() - 1); break
      case 'schedule': newDate.setMonth(currentDate.getMonth() - 1); break
    }
    newDate.setHours(12, 0, 0, 0)
    setCurrentDate(newDate)
  }

  const handleNext = () => {
    const newDate = new Date(currentDate)
    switch (view) {
      case 'day': newDate.setDate(currentDate.getDate() + 1); break
      case 'week': newDate.setDate(currentDate.getDate() + 7); break
      case 'month': newDate.setMonth(currentDate.getMonth() + 1); break
      case 'year': newDate.setFullYear(currentDate.getFullYear() + 1); break
      case 'schedule': newDate.setMonth(currentDate.getMonth() + 1); break
    }
    newDate.setHours(12, 0, 0, 0)
    setCurrentDate(newDate)
  }

  const getTitle = () => {
    switch (view) {
      case 'day':
        return currentDate.toLocaleDateString('default', { 
          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' 
        })
      case 'week': {
        const weekStart = new Date(currentDate)
        weekStart.setDate(currentDate.getDate() - currentDate.getDay())
        weekStart.setHours(12, 0, 0, 0)
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 6)
        weekEnd.setHours(12, 0, 0, 0)
        return `${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}`
      }
      case 'month':
        return currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })
      case 'year':
        return currentDate.getFullYear().toString()
      case 'schedule':
        return 'Upcoming Schedule'
      default:
        return ''
    }
  }

  // ===== CALENDAR INTERACTION HANDLERS =====
  const handleDateClick = (date: Date) => {
    const fixedDate = createStableDate(date)
    setCurrentDate(fixedDate)
    setSelectedDate(fixedDate)
    setSelectedTask(null)
    setSelectedEvent(null)
    setSelectedItemType(null)
    setPrefilledTaskData(null) // Clear prefilled data
    setShowItemModal(true)
  }

  const handleAddClick = (date: Date) => {
    const fixedDate = createStableDate(date)
    setSelectedDate(fixedDate)
    setSelectedTask(null)
    setSelectedEvent(null)
    setSelectedItemType(null)
    setPrefilledTaskData(null) // Clear prefilled data
    setShowItemModal(true)
  }

  const handleEditTask = (task: Task) => {
    console.log('✏️ Editing task:', task)
    setSelectedTask(task)
    setSelectedEvent(null)
    setSelectedDate(createStableDate(new Date(task.dateStart)))
    setSelectedItemType('task')
    setPrefilledTaskData(null) // Clear prefilled data for edit
    setShowItemModal(true)
  }

  const handleEditEvent = (event: Event) => {
    console.log('✏️ Editing event:', event)
    setSelectedEvent(event)
    setSelectedTask(null)
    setSelectedDate(createStableDate(new Date(event.dateStart)))
    setSelectedItemType('event')
    setPrefilledTaskData(null) // Clear prefilled data for edit
    setShowItemModal(true)
  }

  // ===== DRAG AND DROP HANDLERS =====
  const handleDragStart = (task: UnscheduledTask) => {
    console.log('🎯 Drag started:', task)
    setDraggedTask(task)
    setIsDragging(true)
  }

  const handleDragOver = (e: React.DragEvent, date: Date) => {
    e.preventDefault()
    const dateKey = date.toISOString().split('T')[0]
    setDraggedOverDate(dateKey)
  }

  // MODIFIED: handleDrop with prefilled data
  const handleDrop = (e: React.DragEvent, date: Date) => {
    e.preventDefault()
    
    if (draggedTask) {
      const dateKey = date.toISOString().split('T')[0]
      
      console.log('📅 Dropped task:', draggedTask)
      console.log('📅 On date:', dateKey)
      
      // Set prefilled data untuk modal
      setPrefilledTaskData({
        clientName: draggedTask.clientName,
        jobTask: draggedTask.jobTask,
        jobTaskCode: draggedTask.jobTaskCode,
        taskPicStaff: draggedTask.taskPicStaff,
        taskPicName: draggedTask.taskPicName,
        taskPicColor: draggedTask.taskPicColor,
        pdfJobOrder: draggedTask.pdfJobOrder,
        pdfJobOrderName: draggedTask.pdfJobOrderName,
        runningNumber: draggedTask.runningNumber,
        additionalRemark: draggedTask.notes || draggedTask.additionalRemark || '',
      })
      
      // Set date untuk modal
      setSelectedDate(createStableDate(date))
      
      // Clear selected task/event untuk new task
      setSelectedTask(null)
      setSelectedEvent(null)
      
      // Set type ke task
      setSelectedItemType('task')
      
      // Buka modal
      setShowItemModal(true)
      
      // Clear dragged task
      setDraggedTask(null)
      setIsDragging(false)
      setDraggedOverDate(null)
    }
  }

  const handleDragLeave = () => {
    setDraggedOverDate(null)
  }

  // ===== CRUD HANDLERS =====
  // MODIFIED: handleSaveItem with prefilled data
  const handleSaveItem = async (data: any, type: 'event' | 'task') => {
    try {
      // Gabungkan prefilled data dengan data dari form jika ada
      let finalData = data
      
      if (prefilledTaskData && type === 'task') {
        finalData = {
          ...data, // Data dari form (date, time, remark, etc)
          // Data dari prefilled task (client, job, pic, etc)
          client_name: prefilledTaskData.clientName,
          job_task: prefilledTaskData.jobTask,
          task_pic_staff: prefilledTaskData.taskPicStaff,
          running_number: prefilledTaskData.runningNumber,
          pdf_job_order: prefilledTaskData.pdfJobOrder,
          additional_remark: data.additional_remark || prefilledTaskData.additionalRemark,
          // Pastikan data dari form override jika ada
          ...data
        }
        console.log('📦 Combined data with prefilled:', finalData)
      }
      
      if (type === 'event') {
        await saveEvent(finalData, selectedEvent)
      } else {
        await saveTask(finalData, selectedTask)
      }
      
      setShowItemModal(false)
      setSelectedTask(null)
      setSelectedEvent(null)
      setSelectedDate(null)
      setPrefilledTaskData(null) // Clear prefilled data
      await refresh()
      
    } catch (error: any) {
      // Error already handled in hooks
      console.error('Error in handleSaveItem:', error)
    }
  }

  const handleDeleteItem = async (id: string, type: 'event' | 'task') => {
    try {
      console.log('🗑️ handleDeleteItem called with:', { id, type });
      
      if (type === 'event') {
        await deleteEvent(id)
      } else {
        await deleteTask(id)
      }
      
      setShowItemModal(false)
      setPrefilledTaskData(null) // Clear prefilled data
      await refresh()
      setCurrentDate(new Date(currentDate.getTime() + 1))
      
    } catch (error: any) {
      console.error('❌ Error in handleDeleteItem:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete",
        variant: "destructive",
      })
    }
  }

  // ===== FILTER HANDLERS UNTUK CALENDAR FILTER COMPONENT =====
  const handleStaffTaskToggle = (staffCode: string, value: boolean) => {
    setStaffFilters(prev => ({
      ...prev,
      [staffCode]: {
        tasks: value,
        events: prev[staffCode]?.events || false
      }
    }))
  }

  const handleStaffEventToggle = (staffCode: string, value: boolean) => {
    setStaffFilters(prev => ({
      ...prev,
      [staffCode]: {
        tasks: prev[staffCode]?.tasks || false,
        events: value
      }
    }))
  }

  const handleHolidaysToggle = () => {
    setShowHolidays(prev => !prev)
  }

  // Prepare users for filter component
  const filterUsers = allUsers.map(user => ({
    id: user.id,
    name: user.name,
    user_id: user.user_id,
    role: user.role,
    color: user.color || 'blue'
  }))

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-2">
        <div className="flex items-center justify-between">
          {/* Left side - Title and Navigation */}
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-gray-900">Calendar</h1>
            
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="icon" onClick={handlePrev} className="bg-white">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={handleNext} className="bg-white">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <span className="text-lg font-medium text-gray-700">{getTitle()}</span>
          </div>

          {/* Right side - ALL BUTTONS INCLUDING TEST BUTTON */}
          <div className="flex items-center space-x-2">

            <Button
              variant={showFilter ? "default" : "outline"}
              onClick={() => setShowFilter(!showFilter)}
              className="flex items-center space-x-2 relative"
            >
              <Filter className="h-4 w-4" />
              <span>Filter</span>
              {activeFilterCount > 0 && !showFilter && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 text-white text-[10px] rounded-full flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center space-x-2 bg-white">
                  <CalendarDays className="h-4 w-4" />
                  <span>{viewOptions.find(v => v.value === view)?.label}</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="bg-white border border-gray-200 shadow-lg">
                {viewOptions.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => setView(option.value as ViewType)}
                    className={`cursor-pointer ${
                      view === option.value ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                    } hover:bg-gray-100`}
                  >
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant={showNotifications ? "default" : "outline"}
              onClick={() => setShowNotifications(!showNotifications)}
              className="flex items-center space-x-2"
            >
              <Bell className="h-4 w-4" />
              <span>Notifications</span>
            </Button>

            <Button
              variant={showTaskInbox ? "default" : "outline"}
              onClick={() => setShowTaskInbox(!showTaskInbox)}
              className="flex items-center space-x-2"
            >
              <Inbox className="h-4 w-4" />
              <span>Inbox</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Filter Sidebar */}
        {showFilter && (
          <CalendarFilter
            users={filterUsers}
            holidays={allHolidays}
            showHolidays={showHolidays}
            onHolidaysToggle={handleHolidaysToggle}
            staffTaskEventFilters={staffFilters}
            onStaffTaskToggle={handleStaffTaskToggle}
            onStaffEventToggle={handleStaffEventToggle}
          />
        )}

        {/* Calendar and Right Panels */}
        <div className="flex-1 flex min-h-0 px-4 py-3 gap-4">
          {/* Calendar Section */}
          <div className={`flex flex-col min-h-0 transition-all duration-300 ${
            showTaskInbox && showNotifications ? 'flex-[2]' : 
            showTaskInbox || showNotifications ? 'flex-[2.5]' : 'flex-1'
          }`}>
            <div className="flex-1 min-h-0 bg-white border rounded-lg shadow-lg overflow-hidden">
              {!isInitialized ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-sm text-gray-500 mt-2">Loading your preferences...</p>
                  </div>
                </div>
              ) : (
                <CalendarViews
                  view={view}
                  currentDate={currentDate}
                  tasks={filteredTasks}
                  events={filteredEvents}
                  holidays={filteredHolidays}
                  loading={loading}
                  onAddClick={handleAddClick}
                  onEditTask={handleEditTask}
                  onEditEvent={handleEditEvent}
                  onDateClick={handleDateClick}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onDragLeave={handleDragLeave}
                  draggedOverDate={draggedOverDate}
                  isDragging={isDragging}
                />
              )}
            </div>

            {/* Status Messages */}
            {!loading && isInitialized && (
              <div className="mt-3 space-y-1">
                {!hasSelection && (
                  <div className="text-sm text-center text-gray-500 bg-gray-50 py-2 rounded-lg border border-gray-200">
                    <span className="flex items-center justify-center">
                      <Filter className="h-4 w-4 mr-2 text-gray-400" />
                      No filters selected - calendar is empty
                    </span>
                    <Button
                      variant="link"
                      onClick={() => setShowFilter(true)}
                      className="text-xs text-blue-600 ml-2"
                    >
                      Open Filter Panel
                    </Button>
                  </div>
                )}
                
                {hasSelection && filteredTasks.length === 0 && filteredEvents.length === 0 && filteredHolidays.length === 0 && (
                  <div className="text-sm text-center text-gray-500 bg-gray-50 py-2 rounded-lg border border-gray-200">
                    No tasks, events or holidays found for selected filters in this {view}
                  </div>
                )}
                
                {showHolidays && holidays.length > 0 && filteredHolidays.length === 0 && (
                  <div className="text-sm text-right text-gray-500">
                    No holidays in this {view}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Section */}
          <div className="flex gap-4">
            {showNotifications && (
              <div className="w-80 flex flex-col min-h-0">
                <NotificationsPanel />
              </div>
            )}
            
            {showTaskInbox && (
              <div className="w-80 flex flex-col min-h-0">
                <TaskInbox 
                  onDragStart={handleDragStart}
                  onDragEnd={() => {
                    setIsDragging(false)
                    setDraggedTask(null)
                  }}
                  onTaskClick={(task) => {
                    setSelectedDate(null)
                    setSelectedTask({
                      id: task.id,
                      clientName: task.clientName,
                      runningNumber: task.runningNumber || '',
                      jobTask: task.jobTask,
                      dateStart: '',
                      dateStop: '',
                      timeStart: '',
                      timeStop: '',
                      additionalRemark: task.notes || '',
                      staff: task.taskPicStaff || '',
                      staff2: '',
                      pdfJobOrder: task.pdfJobOrder || '',
                      pdfFinalReport: '',
                      finalReportStaff: '',
                      jobStatus: 'in-progress',
                    })
                    setSelectedItemType('task')
                    setPrefilledTaskData(null)
                    setShowItemModal(true)
                  }}
                  onTaskSaved={refresh}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <AddCalendarItemModal 
        isOpen={showItemModal}
        onClose={() => {
          setShowItemModal(false)
          setSelectedTask(null)
          setSelectedEvent(null)
          setSelectedItemType(null)
          setPrefilledTaskData(null) // Clear prefilled data on close
        }}
        selectedDate={selectedDate}
        selectedItem={selectedTask || selectedEvent}
        selectedType={selectedItemType}
        prefilledData={prefilledTaskData} // Pass prefilled data to modal
        onSave={handleSaveItem}
        onDelete={handleDeleteItem}
      />
    </div>
  )
}