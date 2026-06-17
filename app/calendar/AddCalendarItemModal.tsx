'use client'

import { Button } from '@/components/ui/button'
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import {
    Checkbox
} from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { createClient } from '@/lib/supabase/client'
import {
    AlertCircle,
    Bell,
    Briefcase,
    CalendarCheck,
    Calendar as CalendarIcon,
    Clock,
    FileText,
    Loader2,
    Save,
    Trash2,
    UserPlus,
    Users,
    X,
    ExternalLink,
    Eye
} from 'lucide-react'
import { useCallback, useEffect, useState, useRef } from 'react'
// PDF upload/delete removed — using job order number/final report number instead
import { Combobox } from '@/components/ui/combobox'

interface AddCalendarItemModalProps {
  isOpen: boolean
  onClose: () => void
  selectedDate: Date | null
  selectedEndDate?: Date | null 
  selectedItem?: any | null
  selectedType?: 'event' | 'task' | null
  prefilledData?: {
    clientName?: string
    jobTask?: string
    task_pic_id?: string
    task_pic_name?: string
    task_pic_color?: string
    jobOrderNumber?: string
    runningNumber?: string
  } | null
  onSuccess?: () => void
  onSave?: (data: any, type: 'event' | 'task') => Promise<any>
  onDelete?: (id: string, type: 'event' | 'task') => Promise<void>
}

const formatDateToString = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

interface Staff {
  id: string
  name: string
  color?: string
}

const computeTaskStatus = (data: {
  dateStart: string | null
  dateStop: string | null
  jobOrderNumber: string | null
  finalReportNumber: string | null
}) => {
  if (!data.dateStart) return 'onhold'
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const dueDate = data.dateStop ? new Date(data.dateStop) : new Date(data.dateStart)
  dueDate.setHours(0, 0, 0, 0)
  
  const isDueDatePassed = dueDate < today
  const hasJobOrder = !!data.jobOrderNumber
  const hasFinalReport = !!data.finalReportNumber
  
  if (hasJobOrder && hasFinalReport) return 'completed'
  if (isDueDatePassed && (!hasJobOrder || !hasFinalReport)) return 'incomplete'
  return 'in-progress'
}

const getStatusColor = (status: string) => {
  switch(status) {
    case 'completed': return 'bg-green-100 text-green-800'
    case 'in-progress': return 'bg-yellow-100 text-yellow-800'
    case 'incomplete': return 'bg-red-100 text-red-800'
    case 'onhold': return 'bg-gray-100 text-gray-600'
    default: return 'bg-gray-100 text-gray-800'
  }
}

const getStatusText = (status: string) => {
  switch(status) {
    case 'completed': return 'Completed'
    case 'in-progress': return 'In Progress'
    case 'incomplete': return 'Incomplete'
    case 'onhold': return 'On Hold'
    default: return status
  }
}

interface JobTask {
  id: string
  name: string
}

const initialEventData = {
  title: '',
  description: '',
  dateStart: '',
  dateStop: '',
  timeStart: '',
  timeStop: '',
  location: '',
  event_pic_id: '',           
  event_support_ids: [] as string[],  
  event_pic_name: '',          
  event_pic_color: '',         
  event_support_names: [] as string[],  
  event_support_colors: [] as string[],
}

const initialTaskData = {
  clientName: '',
  runningNumber: '',
  jobTask: '',
  dateStart: '',
  dateStop: '',
  timeStart: '',
  timeStop: '',
  additionalRemark: '',
  jobOrderNumber: '',
  task_pic_id: '',            
  task_support_ids: [] as string[],  
  finalReportNumber: '',
  task_pic_name: '',           
  task_pic_color: '',          
  task_support_names: [] as string[],  
  task_support_colors: [] as string[],
}

export default function AddCalendarItemModal({ 
  isOpen, 
  onClose, 
  selectedDate, 
  selectedItem,
  selectedType,
  prefilledData,
  onSuccess,
  onSave,
  onDelete
}: AddCalendarItemModalProps) {
  // ========== ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURN ==========
  const [activeTab, setActiveTab] = useState<'event' | 'task'>(() => {
    return selectedType || 'event'
  })
  
  const [showTime, setShowTime] = useState(false)
  const [showDescription, setShowDescription] = useState(false)
  const [showLocation, setShowLocation] = useState(false)
  const [showSupport, setShowSupport] = useState(false)
  const [showFinalReport, setShowFinalReport] = useState(false)
  const [showEventPic, setShowEventPic] = useState(false)
  const [showEventSupport, setShowEventSupport] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [errors, setErrors] = useState<{[key: string]: string}>({})
  const [touched, setTouched] = useState<{[key: string]: boolean}>({})
  const [jobTasks, setJobTasks] = useState<JobTask[]>([])
  const [loadingTasks, setLoadingTasks] = useState(false)
  const [staffList, setStaffList] = useState<Staff[]>([])
  const [loadingStaff, setLoadingStaff] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [pendingSubmit, setPendingSubmit] = useState<(() => Promise<void>) | null>(null)
  const { toast } = useToast()
  const supabase = createClient()
  const [eventData, setEventData] = useState(initialEventData)
  const [taskData, setTaskData] = useState(initialTaskData)
  const [currentUser, setCurrentUser] = useState<any>(null)
  
  const initialLoadDone = useRef(false)
  const [isCheckingRunningNumber, setIsCheckingRunningNumber] = useState(false)
  const [runningNumberValid, setRunningNumberValid] = useState<boolean | null>(null)
  const [runningNumberError, setRunningNumberError] = useState<string>('')
  
  const getCurrentTaskStatus = useCallback(() => {
    return computeTaskStatus({
      dateStart: taskData.dateStart || null,
      dateStop: taskData.dateStop || null,
      jobOrderNumber: taskData.jobOrderNumber || null,
      finalReportNumber: taskData.finalReportNumber || null,
    })
  }, [taskData.dateStart, taskData.dateStop, taskData.jobOrderNumber, taskData.finalReportNumber])

  // ========== FUNCTION TO CHECK IF RUNNING NUMBER EXISTS ==========
  const checkRunningNumberExists = useCallback(async (runningNumber: string): Promise<boolean> => {
    if (!runningNumber || runningNumber.trim() === '') return false
    
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('running_number, id')
        .eq('running_number', runningNumber.trim())
        .maybeSingle()
      
      if (error) throw error
      
      // If editing an existing task, allow the same running number
      if (selectedItem && selectedItem.id && data?.id === selectedItem.id) {
        return false
      }
      
      return !!data
    } catch (error) {
      console.error('Error checking running number:', error)
      return false
    }
  }, [supabase, selectedItem])

  // Function to validate running number in real-time
  const validateRunningNumber = useCallback(async (runningNumber: string) => {
    if (!runningNumber || runningNumber.trim() === '') {
      setRunningNumberValid(null)
      setRunningNumberError('')
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors.runningNumber
        return newErrors
      })
      return false
    }
    
    // Basic format validation
    if (runningNumber.length < 3) {
      setRunningNumberValid(false)
      setRunningNumberError('Running number must be at least 3 characters')
      setErrors(prev => ({ ...prev, runningNumber: 'Running number must be at least 3 characters' }))
      return false
    }
    
    setIsCheckingRunningNumber(true)
    const exists = await checkRunningNumberExists(runningNumber)
    setIsCheckingRunningNumber(false)
    
    const isValid = !exists
    
    setRunningNumberValid(isValid)
    
    if (exists) {
      const errorMsg = `Running number "${runningNumber}" already exists. Please use a different number.`
      setRunningNumberError(errorMsg)
      setErrors(prev => ({ ...prev, runningNumber: errorMsg }))
    } else {
      setRunningNumberError('')
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors.runningNumber
        return newErrors
      })
    }
    
    return isValid
  }, [checkRunningNumberExists])

  // ========== NOTIFICATION FUNCTIONS ==========
  const sendTaskNotifications = useCallback(async (data: any, taskId: string, action: 'created' | 'updated' = 'created') => {
    console.log('🔔 TASK NOTIFICATION CALLED:', { task_pic_id: data.task_pic_id, task_support_ids: data.task_support_ids, taskId, action })
    
    try {
      let staffIdsToNotify: string[] = []
      
      if (data.task_pic_id) {
        staffIdsToNotify.push(data.task_pic_id)
      }
      
      if (data.task_support_ids && data.task_support_ids.length > 0) {
        staffIdsToNotify.push(...data.task_support_ids)
      }
      
      staffIdsToNotify = [...new Set(staffIdsToNotify)]
      
      if (staffIdsToNotify.length === 0) {
        console.log('⚠️ No staff to notify')
        return
      }
      
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, name')
        .in('id', staffIdsToNotify)

      if (usersError) {
        console.error('❌ Error fetching users:', usersError)
        return
      }
      
      const assignedByName = currentUser?.name || currentUser?.email || 'Someone'
      
      const taskDate = data.dateStart
      const formattedDate = taskDate ? new Date(taskDate).toLocaleDateString('en-MY', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }) : 'Date not set'
      
      const notifications = users.map((user: { id: string; name: string }) => {
        const role = user.id === data.task_pic_id ? 'PIC' : 'Support'
        const type = action === 'created' ? 'task_assignment' : 'task_update'
        const title = action === 'created' ? '📋 New Task Assignment' : '✏️ Task Assignment Updated'
        const message = action === 'created' 
          ? `${assignedByName} has assigned you as ${role} for task: ${data.clientName || data.client_name || 'New Task'} (Due: ${formattedDate})`
          : `${assignedByName} has updated your assignment for "${data.clientName || data.client_name || 'Task'}" (Role: ${role})`
        
        return {
          user_id: user.id,
          title,
          message,
          type,
          task_id: taskId,
          read: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by_name: assignedByName
        }
      })
      
      console.log('📨 Task notifications to insert:', notifications)
      
      if (notifications.length > 0) {
        const { error: insertError } = await supabase
          .from('notifications')
          .insert(notifications)
        
        if (insertError) {
          console.error('❌ Task notification insert error:', insertError)
        } else {
          console.log('✅ Task notifications inserted:', notifications.length)
        }
      }
    } catch (error) {
      console.error('❌ Error in sendTaskNotifications:', error)
    }
  }, [currentUser, supabase])

  const sendEventNotifications = useCallback(async (data: any, eventId: string, action: 'created' | 'updated' = 'created') => {
    console.log('🔔 EVENT NOTIFICATION CALLED:', { event_pic_id: data.event_pic_id, event_support_ids: data.event_support_ids, eventId, action })
    
    try {
      let staffIdsToNotify: string[] = []
      
      if (data.event_pic_id) {
        staffIdsToNotify.push(data.event_pic_id)
      }
      
      if (data.event_support_ids && data.event_support_ids.length > 0) {
        staffIdsToNotify.push(...data.event_support_ids)
      }
      
      staffIdsToNotify = [...new Set(staffIdsToNotify)]
      
      if (staffIdsToNotify.length === 0) {
        console.log('⚠️ No event staff to notify')
        return
      }
      
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, name')
        .in('id', staffIdsToNotify)
      
      if (usersError) {
        console.error('❌ Error fetching event users:', usersError)
        return
      }
      
      const assignedByName = currentUser?.name || currentUser?.email || 'Someone'
      
      const eventDate = data.dateStart
      const formattedDate = eventDate ? new Date(eventDate).toLocaleDateString('en-MY', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }) : 'Date not set'
      
      const notifications = users.map((user: { id: string; name: string }) => {
        const role = user.id === data.event_pic_id ? 'PIC' : 'Support'
        const type = action === 'created' ? 'event_assignment' : 'event_update'
        const title = action === 'created' ? '📅 New Event Assignment' : '✏️ Event Assignment Updated'
        const message = action === 'created' 
          ? `${assignedByName} has assigned you as ${role} for event: ${data.title || 'New Event'} (Date: ${formattedDate})`
          : `${assignedByName} has updated your assignment for "${data.title || 'Event'}" (Role: ${role})`
        
        return {
          user_id: user.id,
          title,
          message,
          type,
          event_id: eventId,
          read: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by_name: assignedByName
        }
      })
      
      console.log('📨 Event notifications to insert:', notifications)
      
      if (notifications.length > 0) {
        const { error: insertError } = await supabase
          .from('notifications')
          .insert(notifications)
        
        if (insertError) {
          console.error('❌ Event notification insert error:', insertError)
        } else {
          console.log('✅ Event notifications inserted:', notifications.length)
        }
      }
    } catch (error) {
      console.error('❌ Error in sendEventNotifications:', error)
    }
  }, [currentUser, supabase])

  useEffect(() => {
    try {
      const userData = localStorage.getItem('user')
      if (userData) {
        setCurrentUser(JSON.parse(userData))
      }
    } catch (e) {
      console.error('Error parsing user data:', e)
    }
  }, [])
  
  const resetForm = useCallback(() => {
    setEventData(initialEventData)
    setTaskData(initialTaskData)
    setShowTime(false)
    setShowDescription(false)
    setShowLocation(false)
    setShowSupport(false)
    setShowFinalReport(false)
    setShowEventPic(false)
    setShowEventSupport(false)
    setErrors({})
    setTouched({})
    setRunningNumberValid(null)
    setRunningNumberError('')
    setIsCheckingRunningNumber(false)
    
  }, [])

  const fetchJobTasks = useCallback(async () => {
    setLoadingTasks(true)
    try {
      const { data, error } = await supabase
        .from('job_tasks')
        .select('*')
        .order('name', { ascending: true })
      if (error) throw error
      setJobTasks(data || [])
    } catch (error) {
      console.error('Error fetching job tasks:', error)
    } finally {
      setLoadingTasks(false)
    }
  }, [supabase])

  const fetchStaff = useCallback(async () => {
    setLoadingStaff(true)
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, color, is_active')
        .eq('is_active', true)
        .order('name')
      
      if (error) throw error
      
      const staffData = data.map((user : {id: string; name: string; color ?: string}) => ({
        id: user.id,
        name: user.name,
        color: user.color || 'blue'
      }))
      
      setStaffList(staffData)
      return staffData
      
    } catch (error) {
      console.error('Error fetching staff:', error)
      return []
    } finally {
      setLoadingStaff(false)
    }
  }, [supabase])

  const populateTaskForm = useCallback((item: any) => {
    let taskSupportIdsArray: string[] = []
    let taskSupportNamesArray: string[] = []
    let taskSupportColorsArray: string[] = []
    
    if (item.task_support_ids) {
      if (typeof item.task_support_ids === 'string') {
        taskSupportIdsArray = item.task_support_ids.split(',').filter((s: string) => s && s.trim())
      } else if (Array.isArray(item.task_support_ids)) {
        taskSupportIdsArray = item.task_support_ids
      }
    }
    
    if (item.task_support_names) {
      if (typeof item.task_support_names === 'string') {
        taskSupportNamesArray = item.task_support_names.split(',').filter((s: string) => s && s.trim())
      } else if (Array.isArray(item.task_support_names)) {
        taskSupportNamesArray = item.task_support_names
      }
    }
    
    if (item.task_support_colors) {
      if (typeof item.task_support_colors === 'string') {
        taskSupportColorsArray = item.task_support_colors.split(',').filter((s: string) => s && s.trim())
      } else if (Array.isArray(item.task_support_colors)) {
        taskSupportColorsArray = item.task_support_colors
      }
    }
    
    setTaskData({
      clientName: item.client_name || item.clientName || '',
      runningNumber: item.running_number || item.runningNumber || '',
      jobTask: item.job_task || item.jobTask || '',
      dateStart: item.date_start || item.dateStart || '',
      dateStop: item.date_stop || item.dateStop || '',
      timeStart: item.time_start || item.timeStart || '',
      timeStop: item.time_stop || item.timeStop || '',
      additionalRemark: item.additional_remark || item.additionalRemark || '',
      jobOrderNumber: item.job_order_number || item.jobOrderNumber || '',
      task_pic_id: item.task_pic_id || '',
      task_support_ids: taskSupportIdsArray,
      finalReportNumber: item.final_report_number || item.finalReportNumber || '',
      task_pic_name: item.task_pic_name || '',
      task_pic_color: item.task_pic_color || '',
      task_support_names: taskSupportNamesArray,
      task_support_colors: taskSupportColorsArray,
    })
    
    const timeStart = item.time_start || item.timeStart || ''
    const timeStop = item.time_stop || item.timeStop || ''
    setShowTime(!!(timeStart || timeStop))
    setShowDescription(!!(item.additional_remark || item.additionalRemark))
    setShowSupport(taskSupportIdsArray.length > 0 || taskSupportNamesArray.length > 0)
    setShowFinalReport(!!(item.final_report_number))
    setRunningNumberValid(true)
    setRunningNumberError('')
  }, [])

  const populateEventForm = useCallback((item: any) => {
    let eventSupportIdsArray: string[] = []
    let eventSupportNamesArray: string[] = []
    let eventSupportColorsArray: string[] = []
    
    if (item.event_support_ids) {
      if (typeof item.event_support_ids === 'string') {
        eventSupportIdsArray = item.event_support_ids.split(',').filter((s: string) => s && s.trim())
      } else if (Array.isArray(item.event_support_ids)) {
        eventSupportIdsArray = item.event_support_ids
      }
    }
    
    if (item.event_support_names) {
      if (typeof item.event_support_names === 'string') {
        eventSupportNamesArray = item.event_support_names.split(',').filter((s: string) => s && s.trim())
      } else if (Array.isArray(item.event_support_names)) {
        eventSupportNamesArray = item.event_support_names
      }
    }
    
    if (item.event_support_colors) {
      if (typeof item.event_support_colors === 'string') {
        eventSupportColorsArray = item.event_support_colors.split(',').filter((s: string) => s && s.trim())
      } else if (Array.isArray(item.event_support_colors)) {
        eventSupportColorsArray = item.event_support_colors
      }
    }
    
    setEventData({
      title: item.title || '',
      description: item.description || '',
      dateStart: item.date_start || item.dateStart || '',
      dateStop: item.date_stop || item.dateStop || '',
      timeStart: item.time_start || item.timeStart || '',
      timeStop: item.time_stop || item.timeStop || '',
      location: item.location || '',
      event_pic_id: item.event_pic_id || '',
      event_support_ids: eventSupportIdsArray,
      event_pic_name: item.event_pic_name || '',
      event_pic_color: item.event_pic_color || '',
      event_support_names: eventSupportNamesArray,
      event_support_colors: eventSupportColorsArray,
    })
    
    const timeStart = item.time_start || item.timeStart || ''
    const timeStop = item.time_stop || item.timeStop || ''
    setShowTime(!!(timeStart || timeStop))
    setShowDescription(!!item.description)
    setShowLocation(!!item.location)
    setShowEventPic(!!(item.event_pic_name || item.event_pic_id))
    setShowEventSupport(eventSupportIdsArray.length > 0 || eventSupportNamesArray.length > 0)
  }, [])

  // Auto-validate running number when user types (for new tasks only)
  useEffect(() => {
    if (activeTab === 'task' && !selectedItem && taskData.runningNumber && !isCheckingRunningNumber) {
      const timer = setTimeout(() => {
        if (taskData.runningNumber) {
          validateRunningNumber(taskData.runningNumber)
        }
      }, 500)
      
      return () => clearTimeout(timer)
    }
  }, [taskData.runningNumber, activeTab, selectedItem, validateRunningNumber, isCheckingRunningNumber])

  useEffect(() => {
    if (!isOpen) {
      initialLoadDone.current = false
      return
    }
    
    if (initialLoadDone.current) return
    
    const loadData = async () => {
      await fetchJobTasks()
      await fetchStaff()
      
      if (selectedItem) {
        if (selectedType === 'event') {
          populateEventForm(selectedItem)
        } else if (selectedType === 'task') {
          populateTaskForm(selectedItem)
        }
        setActiveTab(selectedType || 'event')
      } else if (selectedDate) {
        const dateStr = formatDateToString(selectedDate)
        
        setEventData(prev => ({ ...prev, dateStart: dateStr, dateStop: '' }))
        setTaskData(prev => ({
          ...prev,
          clientName: prefilledData?.clientName || prev.clientName,
          runningNumber: prefilledData?.runningNumber || prev.runningNumber,
          jobTask: prefilledData?.jobTask || prev.jobTask,
          task_pic_id: prefilledData?.task_pic_id || prev.task_pic_id,
          task_pic_name: prefilledData?.task_pic_name || prev.task_pic_name,
          task_pic_color: prefilledData?.task_pic_color || prev.task_pic_color,
          jobOrderNumber: prefilledData?.jobOrderNumber || prev.jobOrderNumber,
          dateStart: dateStr,
          dateStop: '',
        }))
      }
      
      initialLoadDone.current = true
    }
    
    loadData()
    
    return () => {
      resetForm()
      initialLoadDone.current = false
    }
  }, [isOpen, selectedItem, selectedDate, selectedType, activeTab, prefilledData, populateEventForm, populateTaskForm, resetForm, fetchJobTasks, fetchStaff])

  // ========== CONDITIONAL RETURN AFTER ALL HOOKS ==========
  if (!isOpen) return null

  // ========== CHECK IF SAVE BUTTON SHOULD BE DISABLED ==========
  const isSaveDisabled = (): boolean => {
    if (isSaving) return true
    
    if (activeTab === 'event') {
      // For event: check required fields
      return !eventData.title || !eventData.dateStart || !eventData.event_pic_id
    }
    
    // For task
    if (selectedItem) {
      // Edit mode - allow save as long as required fields are filled
      return !taskData.clientName || !taskData.task_pic_id
    }
    
    // New task mode - MUST have valid running number
    const hasRequiredFields = !!taskData.clientName && !!taskData.task_pic_id
    const hasValidRunningNumber = !!taskData.runningNumber && runningNumberValid === true
    
    // Button disabled if:
    // 1. Missing required fields OR
    // 2. No running number OR
    // 3. Running number is not valid (duplicate or checking)
    return !hasRequiredFields || !hasValidRunningNumber
  }

  const getSaveButtonTitle = (): string => {
    if (activeTab === 'task' && !selectedItem) {
      if (!taskData.runningNumber) {
        return 'Please enter a running number'
      }
      if (runningNumberValid === false) {
        return 'This running number already exists. Please use a different number.'
      }
      if (isCheckingRunningNumber) {
        return 'Checking running number availability...'
      }
      if (!taskData.clientName) {
        return 'Please enter client name'
      }
      if (!taskData.task_pic_id) {
        return 'Please select a PIC'
      }
    }
    return ''
  }

  // Rest of component functions (handlers, validators, etc.)
  const handleTaskSupportToggle = (staffId: string) => {
    const selectedStaff = staffList.find(s => s.id === staffId)
    
    setTaskData(prev => {
      const currentIds = [...prev.task_support_ids]
      const currentNames = [...(prev.task_support_names || [])]
      const currentColors = [...(prev.task_support_colors || [])]
      
      if (currentIds.includes(staffId)) {
        const index = currentIds.indexOf(staffId)
        currentIds.splice(index, 1)
        currentNames.splice(index, 1)
        currentColors.splice(index, 1)
        return { ...prev, task_support_ids: currentIds, task_support_names: currentNames, task_support_colors: currentColors }
      } else {
        return {
          ...prev,
          task_support_ids: [...currentIds, staffId],
          task_support_names: [...currentNames, selectedStaff?.name || ''],
          task_support_colors: [...currentColors, selectedStaff?.color || 'blue']
        }
      }
    })
  }

  const handleEventSupportToggle = (staffId: string) => {
    const selectedStaff = staffList.find(s => s.id === staffId)
    
    setEventData(prev => {
      const currentIds = [...prev.event_support_ids]
      const currentNames = [...(prev.event_support_names || [])]
      const currentColors = [...(prev.event_support_colors || [])]
      
      if (currentIds.includes(staffId)) {
        const index = currentIds.indexOf(staffId)
        currentIds.splice(index, 1)
        currentNames.splice(index, 1)
        currentColors.splice(index, 1)
        return { ...prev, event_support_ids: currentIds, event_support_names: currentNames, event_support_colors: currentColors }
      } else {
        return {
          ...prev,
          event_support_ids: [...currentIds, staffId],
          event_support_names: [...currentNames, selectedStaff?.name || ''],
          event_support_colors: [...currentColors, selectedStaff?.color || 'purple']
        }
      }
    })
  }

  const validateEventField = (field: string, value: string): string => {
    switch (field) {
      case 'title':
        if (!value.trim()) return 'Title is required'
        break
      case 'dateStart':
        if (!value) return 'Start date is required'
        break
      case 'event_pic_id':
        if (!value) return 'Event PIC is required'
        break
      case 'dateStop':
        if (eventData.dateStart && value) {
          const start = new Date(eventData.dateStart)
          const stop = new Date(value)
          start.setHours(0,0,0,0)
          stop.setHours(0,0,0,0)
          if (stop < start) return 'Stop date cannot be before start date'
        }
        break
      case 'timeStop':
        if (eventData.timeStart && value && eventData.dateStart === eventData.dateStop) {
          if (eventData.timeStart >= value) return 'Stop time must be after start time'
        }
        break
    }
    return ''
  }

  const validateTaskField = (field: string, value: any): string => {
    switch (field) {
      case 'clientName':
        if (!value?.trim()) return 'Client Name is required'
        if (value.length < 2) return 'Client name must be at least 2 characters'
        if (value.length > 100) return 'Client name cannot exceed 100 characters'
        break
      case 'runningNumber':
        if (!value?.trim()) return 'Running Number is required'
        if (value.length < 3) return 'Running number must be at least 3 characters'
        break
      case 'task_pic_id':
        if (!value) return 'PIC Staff is required'
        break
      case 'dateStop':
        if (taskData.dateStart && value) {
          const start = new Date(taskData.dateStart)
          const stop = new Date(value)
          start.setHours(0,0,0,0)
          stop.setHours(0,0,0,0)
          if (stop < start) return 'Stop date cannot be before start date'
        }
        break
      case 'timeStop':
        if (taskData.timeStart && value && taskData.dateStart === taskData.dateStop && taskData.dateStart) {
          if (taskData.timeStart >= value) return 'Stop time must be after start time'
        }
        break
      case 'jobTask':
        if (value && value.length > 200) return 'Job task cannot exceed 200 characters'
        break
    }
    return ''
  }

  const validateEventForm = (): boolean => {
    const newErrors: {[key: string]: string} = {}
    const titleError = validateEventField('title', eventData.title)
    if (titleError) newErrors.title = titleError
    const dateStartError = validateEventField('dateStart', eventData.dateStart)
    if (dateStartError) newErrors.dateStart = dateStartError
    const picError = validateEventField('event_pic_id', eventData.event_pic_id)
    if (picError) newErrors.event_pic_id = picError
    if (eventData.dateStop) {
      const dateStopError = validateEventField('dateStop', eventData.dateStop)
      if (dateStopError) newErrors.dateStop = dateStopError
    }
    if (eventData.timeStart && eventData.timeStop) {
      const timeStopError = validateEventField('timeStop', eventData.timeStop)
      if (timeStopError) newErrors.timeStop = timeStopError
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateTaskForm = (): boolean => {
    const newErrors: {[key: string]: string} = {}
    const clientNameError = validateTaskField('clientName', taskData.clientName)
    if (clientNameError) newErrors.clientName = clientNameError
    const runningNumberError = validateTaskField('runningNumber', taskData.runningNumber)
    if (runningNumberError) newErrors.runningNumber = runningNumberError
    const picStaffError = validateTaskField('task_pic_id', taskData.task_pic_id)
    if (picStaffError) newErrors.task_pic_id = picStaffError
    if (taskData.dateStop) {
      const dateStopError = validateTaskField('dateStop', taskData.dateStop)
      if (dateStopError) newErrors.dateStop = dateStopError
    }
    if (taskData.timeStart && taskData.timeStop && taskData.dateStart) {
      const timeStopError = validateTaskField('timeStop', taskData.timeStop)
      if (timeStopError) newErrors.timeStop = timeStopError
    }
    if (taskData.jobTask) {
      const jobTaskError = validateTaskField('jobTask', taskData.jobTask)
      if (jobTaskError) newErrors.jobTask = jobTaskError
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }))
    if (activeTab === 'event') {
      const error = validateEventField(field, eventData[field as keyof typeof eventData] as string)
      setErrors(prev => ({ ...prev, [field]: error }))
    } else {
      const error = validateTaskField(field, taskData[field as keyof typeof taskData])
      setErrors(prev => ({ ...prev, [field]: error }))
      
      if (field === 'runningNumber' && !selectedItem && taskData.runningNumber) {
        validateRunningNumber(taskData.runningNumber)
      }
    }
  }

  // File upload/preview handlers removed. Using job order number/final report number fields instead.

  const handleRemoveDate = () => {
    setTaskData(prev => ({ 
      ...prev, 
      dateStart: '', 
      dateStop: '',
      timeStart: '',
      timeStop: ''
    }))
    setShowTime(false)
    toast({ 
      title: "Date Removed", 
      description: "Task will be moved to Task Inbox (On Hold)" 
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Double check - if save is disabled, don't proceed
    if (isSaveDisabled()) {
      toast({ 
        title: "Validation Error", 
        description: getSaveButtonTitle() || "Please complete all required fields correctly.", 
        variant: "destructive" 
      })
      return
    }
    
    if (isSaving) return
    
    setErrors({})
    
    const isValid = activeTab === 'event' ? validateEventForm() : validateTaskForm()
    
    if (!isValid) {
      const firstError = Object.values(errors)[0]
      if (firstError) {
        toast({ title: "Validation Error", description: firstError, variant: "destructive" })
      }
      return
    }

    if (activeTab === 'task' && !selectedItem) {
      const currentRunningNumber = taskData.runningNumber
      if (currentRunningNumber && currentRunningNumber.trim() !== '') {
        setIsCheckingRunningNumber(true)
        const exists = await checkRunningNumberExists(currentRunningNumber)
        setIsCheckingRunningNumber(false)
        
        if (exists) {
          toast({ 
            title: "Validation Error", 
            description: `Running number "${currentRunningNumber}" already exists. Please use a different number.`, 
            variant: "destructive" 
          })
          setRunningNumberValid(false)
          setRunningNumberError(`Running number "${currentRunningNumber}" already exists`)
          return
        }
      }
    }

    const saveFunction = async () => {
      setIsSaving(true)
      
      try {
        if (activeTab === 'event') {
          const dataToSave = {
            title: eventData.title,
            description: eventData.description || '',
            date_start: eventData.dateStart,
            date_stop: eventData.dateStop || null,
            time_start: eventData.timeStart || '',
            time_stop: eventData.timeStop || '',
            location: eventData.location || '',
            event_pic_id: eventData.event_pic_id || null,
            event_pic_name: eventData.event_pic_name || '',
            event_pic_color: eventData.event_pic_color || '',
            event_support_ids: eventData.event_support_ids.length > 0 ? eventData.event_support_ids.join(',') : null,
            event_support_names: eventData.event_support_names.length > 0 ? eventData.event_support_names.join(',') : null,
            event_support_colors: eventData.event_support_colors.length > 0 ? eventData.event_support_colors.join(',') : null,
            created_by: currentUser?.id
          }
          
          let result
          if (onSave) {
            result = await onSave(dataToSave, 'event')
          } else {
            throw new Error("Save function not available")
          }

          if (result && result.id) {
            const action = selectedItem ? 'updated' : 'created'
            if (eventData.event_pic_id || eventData.event_support_ids.length > 0) {
              await sendEventNotifications(eventData, result.id, action)
            }
          }

          toast({
            title: "Success",
            description: selectedItem ? "Event updated successfully" : "Event created successfully",
          })

        } else {
          const runningNumber = taskData.runningNumber
          if (!runningNumber) throw new Error("Running number is required")
          
          const computedStatus = computeTaskStatus({
            dateStart: taskData.dateStart || null,
            dateStop: taskData.dateStop || null,
            jobOrderNumber: taskData.jobOrderNumber || null,
            finalReportNumber: taskData.finalReportNumber || null,
          })

          const dataToSave = {
            client_name: taskData.clientName,
            running_number: runningNumber,
            job_task: taskData.jobTask || 'General Task',
            date_start: taskData.dateStart || null,
            date_stop: taskData.dateStop || null,
            time_start: taskData.timeStart || '',
            time_stop: taskData.timeStop || '',
            additional_remark: taskData.additionalRemark || '',
            job_order_number: taskData.jobOrderNumber || null,
            task_pic_id: taskData.task_pic_id || null,
            task_pic_name: taskData.task_pic_name || '',
            task_pic_color: taskData.task_pic_color || '',
            task_support_ids: taskData.task_support_ids.length > 0 ? taskData.task_support_ids.join(',') : null,
            task_support_names: taskData.task_support_names.length > 0 ? taskData.task_support_names.join(',') : null,
            task_support_colors: taskData.task_support_colors.length > 0 ? taskData.task_support_colors.join(',') : null,
            final_report_number: taskData.finalReportNumber || null,
            job_status: computedStatus,
            created_by: currentUser?.id
          }

          let result
          if (onSave) {
            result = await onSave(dataToSave, 'task')
          } else {
            throw new Error("Save function not available")
          }

          if (result && result.id) {
            const action = selectedItem ? 'updated' : 'created'
            if (taskData.task_pic_id || taskData.task_support_ids.length > 0) {
              await sendTaskNotifications(taskData, result.id, action)
            }
          }

          // no preview URLs to clean up

          toast({
            title: "Success",
            description: selectedItem ? "Task updated successfully" : "Task created successfully",
          })
        }
        
        resetForm()
        onClose()
        if (onSuccess) onSuccess()
        
      } catch (error: any) {
        console.error('Error saving:', error)
        toast({ title: "Error", description: error.message || "Failed to save", variant: "destructive" })
      } finally {
        setIsSaving(false)
        setShowConfirmDialog(false)
        setPendingSubmit(null)
      }
    }

    if (activeTab === 'task' && (taskData.task_pic_id || taskData.task_support_ids.length > 0)) {
      setPendingSubmit(() => saveFunction)
      setShowConfirmDialog(true)
    } else if (activeTab === 'event' && (eventData.event_pic_id || eventData.event_support_ids.length > 0)) {
      setPendingSubmit(() => saveFunction)
      setShowConfirmDialog(true)
    } else {
      await saveFunction()
    }
  }

  const handleDelete = async () => {
    if (!selectedItem) return
    
    const confirmDelete = window.confirm(`Are you sure you want to delete this ${selectedType}?`)
    if (!confirmDelete) return
    
    setIsSaving(true)
    
    try {
      // No PDF files to delete — job order number/final report number stored as text
      
      if (onDelete) {
        await onDelete(selectedItem.id, activeTab)
      } else {
        toast({ title: "Error", description: "Delete function not available", variant: "destructive" })
        return
      }
      
      toast({ title: "Success", description: "Deleted successfully" })
      resetForm()
      onClose()
      if (onSuccess) onSuccess()
      
    } catch (error: any) {
      console.error('Error deleting:', error)
      toast({ title: "Error", description: error.message || "Failed to delete", variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  const formatDateDisplay = (date: Date | null) => {
    if (!date) return ''
    return date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  }

  const ErrorMessage = ({ field }: { field: string }) => {
    if (!touched[field] || !errors[field]) return null
    return (
      <p className="text-xs text-red-500 mt-1 flex items-center">
        <AlertCircle className="h-3 w-3 mr-1" />
        {errors[field]}
      </p>
    )
  }

  const getConfirmTitle = () => {
    return activeTab === 'event' ? 'Confirm Event Assignment' : 'Confirm Task Assignment'
  }

  const getConfirmMessage = () => {
    if (activeTab === 'event') {
      return 'Are you sure you want to assign this event with the following staff?'
    }
    return 'Are you sure you want to assign this task with the following staff?'
  }

  const getStaffDetails = () => {
    if (activeTab === 'event') {
      return {
        picName: eventData.event_pic_name,
        picColor: eventData.event_pic_color || 'purple',
        supportNames: eventData.event_support_names,
        supportColors: eventData.event_support_colors,
        typeLabel: 'event'
      }
    }
    return {
      picName: taskData.task_pic_name,
      picColor: taskData.task_pic_color || 'blue',
      supportNames: taskData.task_support_names,
      supportColors: taskData.task_support_colors,
      typeLabel: 'task'
    }
  }

  const staffDetails = getStaffDetails()
  const currentTaskStatus = activeTab === 'task' ? getCurrentTaskStatus() : null
  const hasDate = activeTab === 'task' && taskData.dateStart

  // ========== RENDER COMPONENT ==========
  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <Card className="border-0">
            <CardHeader className="border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  {selectedItem ? 'Edit' : 'Add New'} {activeTab === 'event' ? 'Event' : 'Job Task'}
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={() => { resetForm(); onClose() }} type="button" disabled={isSaving}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center space-x-4 mt-2 border-b border-gray-200 pb-2">
                <button type="button" onClick={() => { setActiveTab('event'); setErrors({}); setTouched({}); setRunningNumberValid(null); setRunningNumberError(''); }} disabled={isSaving}
                  className={`pb-1 px-1 text-sm font-medium transition-colors relative flex items-center space-x-2 ${
                    activeTab === 'event' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500 hover:text-gray-700'
                  } ${isSaving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                  <CalendarCheck className="h-4 w-4" />
                  <span>Event</span>
                </button>
                <button type="button" onClick={() => { setActiveTab('task'); setErrors({}); setTouched({}); }} disabled={isSaving}
                  className={`pb-1 px-1 text-sm font-medium transition-colors relative flex items-center space-x-2 ${
                    activeTab === 'task' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'
                  } ${isSaving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                  <Briefcase className="h-4 w-4" />
                  <span>Task</span>
                </button>
              </div>
            </CardHeader>

            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4 pt-4">
                {selectedDate && !selectedItem && (
                  <div className="flex items-center text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                    <CalendarIcon className="h-4 w-4 mr-2 text-gray-500" />
                    <span>{formatDateDisplay(selectedDate)}</span>
                  </div>
                )}

                {activeTab === 'task' && (
                  <>
                    <div className="flex justify-between items-center mb-2 p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium text-gray-600">Current Status:</span>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(currentTaskStatus || 'in-progress')}`}>
                        {getStatusText(currentTaskStatus || 'in-progress')}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-gray-700 font-medium">Client Name <span className="text-red-500">*</span></Label>
                      <Input 
                        value={taskData.clientName} 
                        onChange={(e) => { 
                          setTaskData(prev => ({...prev, clientName: e.target.value}))
                          if (touched.clientName) { 
                            const error = validateTaskField('clientName', e.target.value)
                            setErrors(prev => ({ ...prev, clientName: error }))
                          } 
                        }} 
                        onBlur={() => handleBlur('clientName')} 
                        placeholder="Enter client name" 
                        className={`border-gray-300 bg-white ${touched.clientName && errors.clientName ? 'border-red-500' : ''}`} 
                        disabled={isSaving} 
                        autoFocus 
                      />
                      <ErrorMessage field="clientName" />
                    </div>

                    {/* RUNNING NUMBER - USER INPUT WITH REAL-TIME VALIDATION */}
                    <div className="space-y-2">
                      <Label className="text-gray-700 font-medium">
                        Running Number <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Input 
                          value={taskData.runningNumber} 
                          onChange={(e) => { 
                            const value = e.target.value.toUpperCase()
                            setTaskData(prev => ({...prev, runningNumber: value}))
                            setTouched(prev => ({ ...prev, runningNumber: true }))
                            if (runningNumberValid === false) {
                              setRunningNumberValid(null)
                              setRunningNumberError('')
                            }
                          }} 
                          onBlur={() => {
                            if (!selectedItem && taskData.runningNumber) {
                              validateRunningNumber(taskData.runningNumber)
                            }
                          }}
                          placeholder="e.g., JOB2401001, INV-001, etc." 
                          className={`border-gray-300 bg-white font-mono text-sm pr-10 ${
                            !selectedItem && taskData.runningNumber && runningNumberValid === true 
                              ? 'border-green-500 border-2 bg-green-50' 
                              : !selectedItem && runningNumberValid === false
                              ? 'border-red-500 border-2 bg-red-50'
                              : touched.runningNumber && errors.runningNumber
                              ? 'border-red-500'
                              : ''
                          }`}
                          disabled={isSaving} 
                        />
                        {!selectedItem && isCheckingRunningNumber && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                          </div>
                        )}
                        {!selectedItem && runningNumberValid === true && !isCheckingRunningNumber && taskData.runningNumber && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                              <span className="text-white text-[10px]">✓</span>
                            </div>
                          </div>
                        )}
                        {!selectedItem && runningNumberValid === false && !isCheckingRunningNumber && taskData.runningNumber && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
                              <span className="text-white text-[10px]">✗</span>
                            </div>
                          </div>
                        )}
                      </div>
                      {!selectedItem && runningNumberValid === true && taskData.runningNumber && (
                        <p className="text-xs text-green-600 flex items-center">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          ✓ Running number is available
                        </p>
                      )}
                      {!selectedItem && (runningNumberValid === false || runningNumberError) && (
                        <p className="text-xs text-red-600 flex items-center">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          {runningNumberError || 'This running number already exists! Please use a different number.'}
                        </p>
                      )}
                      <ErrorMessage field="runningNumber" />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-gray-700 font-medium">Job Task</Label>
                      {loadingTasks ? (
                        <div className="flex items-center space-x-2 border border-gray-300 rounded-md p-2 bg-gray-50">
                          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                          <span className="text-sm text-gray-500">Loading job tasks...</span>
                        </div>
                      ) : (
                        <Combobox
                          options={jobTasks.map(task => ({ value: task.name, label: task.name }))}
                          value={taskData.jobTask || ""}
                          onValueChange={(value) => {
                            setTaskData(prev => ({ ...prev, jobTask: value }))
                            if (touched.jobTask) {
                              const error = validateTaskField('jobTask', value)
                              setErrors(prev => ({ ...prev, jobTask: error }))
                            }
                          }}
                          placeholder="Select job task"
                          emptyMessage="No job tasks found."
                          disabled={isSaving}
                          className={touched.jobTask && errors.jobTask ? 'border-red-500' : ''}
                        />
                      )}
                      <ErrorMessage field="jobTask" />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-gray-700 font-medium">Start Date (Optional)</Label>
                        {hasDate && (
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm"
                            onClick={handleRemoveDate}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            disabled={isSaving}
                          >
                            <X className="h-3 w-3 mr-1" /> Remove Date
                          </Button>
                        )}
                      </div>
                      <Input 
                        type="date" 
                        value={taskData.dateStart} 
                        onChange={(e) => { 
                          setTaskData(prev => ({...prev, dateStart: e.target.value}))
                        }} 
                        className="border-gray-300 bg-white" 
                        disabled={isSaving} 
                      />
                      <p className="text-xs text-gray-500">
                        {hasDate 
                          ? "📅 Task will appear in calendar. Remove date to move back to inbox."
                          : "📋 No date = Task stays in Task Inbox (On Hold)"}
                      </p>
                    </div>

                    {hasDate && (
                      <div className="space-y-2">
                        <Label className="text-gray-700 font-medium">End Date (Optional)</Label>
                        <Input 
                          type="date" 
                          value={taskData.dateStop} 
                          onChange={(e) => { 
                            setTaskData(prev => ({...prev, dateStop: e.target.value}))
                            if (touched.dateStop) { 
                              setErrors(prev => ({ ...prev, dateStop: validateTaskField('dateStop', e.target.value) }))
                            } 
                          }} 
                          onBlur={() => handleBlur('dateStop')} 
                          className={`border-gray-300 bg-white ${touched.dateStop && errors.dateStop ? 'border-red-500' : ''}`} 
                          disabled={isSaving} 
                        />
                        <ErrorMessage field="dateStop" />
                      </div>
                    )}

                    {hasDate && !showTime ? (
                      <button type="button" onClick={() => setShowTime(true)} className="flex items-center text-sm text-blue-600 hover:text-blue-700" disabled={isSaving}>
                        <Clock className="h-4 w-4 mr-2" /> Add time
                      </button>
                    ) : hasDate && showTime ? (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="text-gray-700 font-medium">Time Start</Label>
                          <Input type="time" value={taskData.timeStart} onChange={(e) => setTaskData(prev => ({...prev, timeStart: e.target.value}))} className="border-gray-300 bg-white" disabled={isSaving} />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-gray-700 font-medium">Time Stop</Label>
                          <Input 
                            type="time" 
                            value={taskData.timeStop} 
                            onChange={(e) => { 
                              setTaskData(prev => ({...prev, timeStop: e.target.value}))
                              if (touched.timeStop) { setErrors(prev => ({ ...prev, timeStop: validateTaskField('timeStop', e.target.value) })) }
                            }} 
                            onBlur={() => handleBlur('timeStop')} 
                            className={`border-gray-300 bg-white ${touched.timeStop && errors.timeStop ? 'border-red-500' : ''}`} 
                            disabled={isSaving} 
                          />
                          <ErrorMessage field="timeStop" />
                        </div>
                      </div>
                    ) : null}

                    {!showDescription ? (
                      <button type="button" onClick={() => setShowDescription(true)} className="flex items-center text-sm text-gray-600 hover:text-gray-900" disabled={isSaving}>
                        <FileText className="h-4 w-4 mr-2" /> Add additional remark
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <Label className="text-gray-700 font-medium">Additional Remark</Label>
                        <Textarea value={taskData.additionalRemark} onChange={(e) => setTaskData(prev => ({...prev, additionalRemark: e.target.value}))} placeholder="Enter any additional remarks..." className="border-gray-300 bg-white min-h-[80px]" disabled={isSaving} />
                      </div>
                    )}

                    {/* PDF Job Order */}
                    <div className="border-t border-gray-200 pt-4">
                      <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center justify-between">
                        <div className="flex items-center">
                          <FileText className="h-4 w-4 mr-2 text-blue-600" />
                          Job Order Number
                        </div>
                        {taskData.jobOrderNumber && (
                          <div className="text-sm text-gray-700">Current: {taskData.jobOrderNumber}</div>
                        )}
                      </h4>
                      
                      <Input
                        value={taskData.jobOrderNumber}
                        onChange={(e) => setTaskData(prev => ({ ...prev, jobOrderNumber: e.target.value }))}
                        placeholder="Enter job order number"
                        className="border-gray-300 bg-white"
                        disabled={isSaving}
                      />
                      <p className="text-xs text-gray-500 mt-1">Enter job order number (optional)</p>
                    </div>

                    {/* PIC */}
                    <div className="space-y-2">
                      <Label className="text-gray-700 font-medium">PIC (Person In Charge) <span className="text-red-500">*</span></Label>
                      {loadingStaff ? (
                        <div className="flex items-center space-x-2 border border-gray-300 rounded-md p-2">
                          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                          <span className="text-sm text-gray-500">Loading staff...</span>
                        </div>
                      ) : (
                        <Select 
                          value={taskData.task_pic_id} 
                          onValueChange={(value) => { 
                            const selectedStaff = staffList.find(s => s.id === value)
                            setTaskData(prev => ({ ...prev, task_pic_id: value, task_pic_name: selectedStaff?.name || '', task_pic_color: selectedStaff?.color || 'blue' }))
                            if (touched.task_pic_id) { setErrors(prev => ({ ...prev, task_pic_id: validateTaskField('task_pic_id', value) })) }
                          }} 
                          onOpenChange={() => handleBlur('task_pic_id')} 
                          disabled={isSaving}
                        >
                          <SelectTrigger className={`bg-white border-gray-300 ${touched.task_pic_id && errors.task_pic_id ? 'border-red-500' : ''}`}>
                            <SelectValue placeholder="Select main PIC" />
                          </SelectTrigger>
                          <SelectContent className="bg-white border border-gray-200 shadow-lg">
                            {staffList.map((staff) => (
                              <SelectItem key={staff.id} value={staff.id} className="hover:bg-gray-100 text-gray-900">
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: staff.color || '#3b82f6' }} />
                                  <span>{staff.name}</span>
                                </div>
                              </SelectItem>
                            ))}
                            {staffList.length === 0 && <div className="px-2 py-3 text-sm text-gray-500 text-center">No staff found.</div>}
                          </SelectContent>
                        </Select>
                      )}
                      <ErrorMessage field="task_pic_id" />
                      {taskData.task_pic_name && (
                        <div className="mt-1 flex items-center gap-2 text-xs text-green-600">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: taskData.task_pic_color || '#3b82f6' }} />
                          <span>Selected: {taskData.task_pic_name}</span>
                        </div>
                      )}
                    </div>

                    {/* Support Staff */}
                    {!showSupport ? (
                      <button type="button" onClick={() => setShowSupport(true)} className="flex items-center text-sm text-gray-600 hover:text-gray-900" disabled={isSaving}>
                        <UserPlus className="h-4 w-4 mr-2" /> Add Support Staff (Optional)
                      </button>
                    ) : (
                      <div className="space-y-3 border rounded-lg p-4 bg-gray-50">
                        <div className="flex items-center justify-between">
                          <Label className="text-gray-700 font-medium flex items-center">
                            <Users className="h-4 w-4 mr-2" />Task Support Staff
                          </Label>
                          <Button type="button" variant="ghost" size="sm" onClick={() => setShowSupport(false)} className="h-6 w-6 p-0" disabled={isSaving}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        {loadingStaff ? (
                          <div className="flex items-center justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-blue-600" /></div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2">
                            {staffList.filter(staff => staff.id !== taskData.task_pic_id).map((staff) => (
                              <div key={staff.id} className="flex items-center space-x-2">
                                <Checkbox id={`task-support-${staff.id}`} checked={taskData.task_support_ids.includes(staff.id)} onCheckedChange={() => handleTaskSupportToggle(staff.id)} disabled={isSaving} />
                                <label htmlFor={`task-support-${staff.id}`} className="text-sm cursor-pointer text-gray-700 flex items-center gap-1">
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: staff.color || '#3b82f6' }} />
                                  {staff.name}
                                </label>
                              </div>
                            ))}
                          </div>
                        )}
                        {taskData.task_support_names && taskData.task_support_names.length > 0 && (
                          <div className="mt-2 text-xs text-green-600 flex flex-wrap gap-2">
                            {taskData.task_support_names.map((name, index) => (
                              <span key={index} className="inline-flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: taskData.task_support_colors?.[index] || '#3b82f6' }} />
                                {name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* PDF Final Report */}
                    {!showFinalReport ? (
                      <button type="button" onClick={() => setShowFinalReport(true)} className="flex items-center text-sm text-gray-600 hover:text-gray-900 mt-2" disabled={isSaving}>
                        <FileText className="h-4 w-4 mr-2" /> Add PDF Final Report
                      </button>
                    ) : (
                      <div className="space-y-4 border-t border-gray-200 pt-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-gray-800 flex items-center">
                            <FileText className="h-4 w-4 mr-2 text-green-600" />Final Report Number
                          </h4>
                          <div className="flex gap-2">
                            <Button type="button" variant="ghost" size="sm" onClick={() => setShowFinalReport(false)} className="h-6 w-6 p-0 text-gray-500" disabled={isSaving}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        
                        <Input
                          value={taskData.finalReportNumber}
                          onChange={(e) => setTaskData(prev => ({ ...prev, finalReportNumber: e.target.value }))}
                          placeholder="Enter final report number"
                          className="border-gray-300 bg-white"
                          disabled={isSaving}
                        />
                        <p className="text-xs text-gray-500">Enter final report number (optional)</p>
                      </div>
                    )}
                  </>
                )}

                {activeTab === 'event' && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-gray-700 font-medium">Title <span className="text-red-500">*</span></Label>
                      <Input 
                        value={eventData.title} 
                        onChange={(e) => { 
                          setEventData(prev => ({...prev, title: e.target.value}))
                          if (touched.title) { setErrors(prev => ({ ...prev, title: validateEventField('title', e.target.value) })) }
                        }} 
                        onBlur={() => handleBlur('title')} 
                        placeholder="Enter event title" 
                        className={`border-gray-300 bg-white ${touched.title && errors.title ? 'border-red-500' : ''}`} 
                        disabled={isSaving} 
                        autoFocus 
                      />
                      <ErrorMessage field="title" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-gray-700 font-medium">Date Start <span className="text-red-500">*</span></Label>
                        <Input 
                          type="date" 
                          value={eventData.dateStart} 
                          onChange={(e) => { 
                            setEventData(prev => ({...prev, dateStart: e.target.value}))
                            if (touched.dateStart) { setErrors(prev => ({ ...prev, dateStart: validateEventField('dateStart', e.target.value) })) }
                          }} 
                          onBlur={() => handleBlur('dateStart')} 
                          className={`border-gray-300 bg-white ${touched.dateStart && errors.dateStart ? 'border-red-500' : ''}`} 
                          disabled={isSaving} 
                        />
                        <ErrorMessage field="dateStart" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-gray-700 font-medium">Date Stop (Optional)</Label>
                        <Input 
                          type="date" 
                          value={eventData.dateStop} 
                          onChange={(e) => { 
                            setEventData(prev => ({...prev, dateStop: e.target.value}))
                            if (touched.dateStop) { setErrors(prev => ({ ...prev, dateStop: validateEventField('dateStop', e.target.value) })) }
                          }} 
                          onBlur={() => handleBlur('dateStop')} 
                          className={`border-gray-300 bg-white ${touched.dateStop && errors.dateStop ? 'border-red-500' : ''}`} 
                          disabled={isSaving} 
                        />
                        <ErrorMessage field="dateStop" />
                      </div>
                    </div>

                    {!showTime ? (
                      <button type="button" onClick={() => setShowTime(true)} className="flex items-center text-sm text-blue-600 hover:text-blue-700" disabled={isSaving}>
                        <Clock className="h-4 w-4 mr-2" /> Add time
                      </button>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="text-gray-700 font-medium">Time Start</Label>
                          <Input type="time" value={eventData.timeStart} onChange={(e) => setEventData(prev => ({...prev, timeStart: e.target.value}))} className="border-gray-300 bg-white" disabled={isSaving} />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-gray-700 font-medium">Time Stop</Label>
                          <Input 
                            type="time" 
                            value={eventData.timeStop} 
                            onChange={(e) => { 
                              setEventData(prev => ({...prev, timeStop: e.target.value}))
                              if (touched.timeStop) { setErrors(prev => ({ ...prev, timeStop: validateEventField('timeStop', e.target.value) })) }
                            }} 
                            onBlur={() => handleBlur('timeStop')} 
                            className={`border-gray-300 bg-white ${touched.timeStop && errors.timeStop ? 'border-red-500' : ''}`} 
                            disabled={isSaving} 
                          />
                          <ErrorMessage field="timeStop" />
                        </div>
                      </div>
                    )}

                    {!showLocation ? (
                      <button type="button" onClick={() => setShowLocation(true)} className="flex items-center text-sm text-gray-600 hover:text-gray-900" disabled={isSaving}>
                        <Users className="h-4 w-4 mr-2" /> Add location
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <Label className="text-gray-700 font-medium">Location</Label>
                        <Input value={eventData.location} onChange={(e) => setEventData(prev => ({...prev, location: e.target.value}))} placeholder="Enter location" className="border-gray-300 bg-white" disabled={isSaving} />
                      </div>
                    )}

                    {!showDescription ? (
                      <button type="button" onClick={() => setShowDescription(true)} className="flex items-center text-sm text-gray-600 hover:text-gray-900" disabled={isSaving}>
                        <FileText className="h-4 w-4 mr-2" /> Add description
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <Label className="text-gray-700 font-medium">Description</Label>
                        <Textarea value={eventData.description} onChange={(e) => setEventData(prev => ({...prev, description: e.target.value}))} placeholder="Enter description" className="border-gray-300 bg-white min-h-[80px]" disabled={isSaving} />
                      </div>
                    )}
                    
                    {/* Event PIC */}
                    {!showEventPic ? (
                      <button type="button" onClick={() => setShowEventPic(true)} className="flex items-center text-sm text-blue-600 hover:text-blue-700" disabled={isSaving}>
                        <UserPlus className="h-4 w-4 mr-2" /> Add PIC (Person In Charge) <span className="text-red-500 ml-1">*</span>
                      </button>
                    ) : (
                      <div className="space-y-2 border rounded-lg p-4 bg-gray-50">
                        <div className="flex items-center justify-between">
                          <Label className="text-gray-700 font-medium flex items-center">
                            <Users className="h-4 w-4 mr-2" />Event PIC <span className="text-red-500 ml-1">*</span>
                          </Label>
                          <Button type="button" variant="ghost" size="sm" onClick={() => setShowEventPic(false)} className="h-6 w-6 p-0" disabled={isSaving}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        {loadingStaff ? (
                          <div className="flex items-center space-x-2 border border-gray-300 rounded-md p-2">
                            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                            <span className="text-sm text-gray-500">Loading staff...</span>
                          </div>
                        ) : (
                          <>
                            <Select 
                              value={eventData.event_pic_id} 
                              onValueChange={(value) => { 
                                const selectedStaff = staffList.find(s => s.id === value)
                                setEventData(prev => ({ ...prev, event_pic_id: value, event_pic_name: selectedStaff?.name || '', event_pic_color: selectedStaff?.color || 'purple' }))
                                if (touched.event_pic_id && errors.event_pic_id) {
                                  setErrors(prev => ({ ...prev, event_pic_id: '' }))
                                }
                              }} 
                              onOpenChange={() => handleBlur('event_pic_id')}
                              disabled={isSaving}
                            >
                              <SelectTrigger className={`bg-white border-gray-300 ${touched.event_pic_id && errors.event_pic_id ? 'border-red-500' : ''}`}>
                                <SelectValue placeholder="Select PIC for this event" />
                              </SelectTrigger>
                              <SelectContent className="bg-white border border-gray-200 shadow-lg">
                                {staffList.map((staff) => (
                                  <SelectItem key={staff.id} value={staff.id} className="hover:bg-gray-100 text-gray-900">
                                    <div className="flex items-center gap-2">
                                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: staff.color || '#8b5cf6' }} />
                                      <span>{staff.name}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                                {staffList.length === 0 && <div className="px-2 py-3 text-sm text-gray-500 text-center">No staff found.</div>}
                              </SelectContent>
                            </Select>
                            <ErrorMessage field="event_pic_id" />
                          </>
                        )}
                        {eventData.event_pic_name && (
                          <div className="mt-2 flex items-center gap-2 p-2 rounded bg-white border">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: eventData.event_pic_color || '#8b5cf6' }} />
                            <span className="text-sm text-gray-700">Selected: {eventData.event_pic_name}</span>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Event Support Staff */}
                    {!showEventSupport ? (
                      <button type="button" onClick={() => setShowEventSupport(true)} className="flex items-center text-sm text-gray-600 hover:text-gray-900" disabled={isSaving}>
                        <UserPlus className="h-4 w-4 mr-2" /> Add Support Staff (Optional)
                      </button>
                    ) : (
                      <div className="space-y-3 border rounded-lg p-4 bg-gray-50">
                        <div className="flex items-center justify-between">
                          <Label className="text-gray-700 font-medium flex items-center">
                            <Users className="h-4 w-4 mr-2" />Event Support Staff
                          </Label>
                          <Button type="button" variant="ghost" size="sm" onClick={() => setShowEventSupport(false)} className="h-6 w-6 p-0" disabled={isSaving}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        {loadingStaff ? (
                          <div className="flex items-center justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-blue-600" /></div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2">
                            {staffList.filter(staff => staff.id !== eventData.event_pic_id).map((staff) => (
                              <div key={staff.id} className="flex items-center space-x-2">
                                <Checkbox id={`event-support-${staff.id}`} checked={eventData.event_support_ids.includes(staff.id)} onCheckedChange={() => handleEventSupportToggle(staff.id)} disabled={isSaving} />
                                <label htmlFor={`event-support-${staff.id}`} className="text-sm cursor-pointer text-gray-700 flex items-center gap-1">
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: staff.color || '#8b5cf6' }} />
                                  {staff.name}
                                </label>
                              </div>
                            ))}
                          </div>
                        )}
                        {eventData.event_support_names && eventData.event_support_names.length > 0 && (
                          <div className="mt-2 text-xs text-green-600 flex flex-wrap gap-2">
                            {eventData.event_support_names.map((name, index) => (
                              <span key={index} className="inline-flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: eventData.event_support_colors?.[index] || '#8b5cf6' }} />
                                {name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </CardContent>

              <CardFooter className="border-t border-gray-200 bg-gray-50 flex justify-between sticky bottom-0">
                <div className="flex space-x-2">
                  {selectedItem && (
                    <Button type="button" variant="destructive" size="sm" onClick={handleDelete} disabled={isSaving}>
                      <Trash2 className="h-4 w-4 mr-2" />Delete
                    </Button>
                  )}
                  <Button type="button" variant="outline" size="sm" onClick={() => { resetForm(); onClose() }} disabled={isSaving}>
                    <X className="h-4 w-4 mr-2" />Cancel
                  </Button>
                </div>
                <Button 
                  type="submit" 
                  size="sm" 
                  className={activeTab === 'event' ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'} 
                  disabled={isSaveDisabled()}
                  title={getSaveButtonTitle()}
                >
                  {isSaving ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>) : (<><Save className="h-4 w-4 mr-2" />Save</>)}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>

      {/* PDF preview removed — using numbers instead */}

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
              <Bell className="h-5 w-5 mr-2 text-blue-600" />
              {getConfirmTitle()}
            </h3>
            <p className="text-gray-600 mb-4">{getConfirmMessage()}</p>
            <div className="bg-gray-50 p-4 rounded-lg mb-4 space-y-3">
              <div className="text-sm">
                <span className="font-medium text-gray-700">PIC (Main):</span>{' '}
                <span className="text-gray-900 flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: staffDetails.picColor || (activeTab === 'event' ? '#8b5cf6' : '#3b82f6') }} />
                  {staffDetails.picName || 'Not selected'}
                </span>
              </div>
              {staffDetails.supportNames && staffDetails.supportNames.length > 0 && (
                <div className="text-sm">
                  <span className="font-medium text-gray-700">Support Staff:</span>
                  <ul className="mt-1 ml-4 list-disc space-y-1">
                    {staffDetails.supportNames.map((name: string, index: number) => (
                      <li key={index} className="text-gray-900 flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: staffDetails.supportColors?.[index] || (activeTab === 'event' ? '#8b5cf6' : '#3b82f6') }} />
                        {name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="text-sm bg-yellow-50 p-2 rounded border border-yellow-200 mt-2">
                <p className="text-yellow-800 flex items-start">
                  <Bell className="h-4 w-4 mr-1 mt-0.5 flex-shrink-0" />
                  <span>These staff members will receive notifications about this {activeTab === 'event' ? 'event' : 'task'} assignment.</span>
                </p>
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <Button type="button" variant="outline" onClick={() => { setShowConfirmDialog(false); setPendingSubmit(null) }} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="button" onClick={async () => { if (pendingSubmit) await pendingSubmit() }} disabled={isSaving} className={activeTab === 'event' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'}>
                {isSaving ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>) : (<><Save className="h-4 w-4 mr-2" />Confirm & Save</>)}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
