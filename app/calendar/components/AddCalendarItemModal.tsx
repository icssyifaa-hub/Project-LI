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
// PDF upload/delete removed - using job order number/final report number instead
import { Combobox } from '@/components/ui/combobox'
import { getDotClass } from '@/lib/colors'
import { createJobGroupId, isSameJobOrderFollowUp } from '@/lib/job-groups'
import {
  Client,
  fetchClients,
  findClient,
  getLocationsForClient,
  getUniqueClientNames,
} from '@/lib/settings/clients'
import { fetchJobTaskNames } from '@/lib/settings/job-tasks'
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
import {
  getFinalReportNumberExample,
  JOB_ORDER_NUMBER_EXAMPLE,
  normalizeFinalReportNumber,
  normalizeJobOrderNumber,
  validateFinalReportNumberForJobTask,
  validateJobOrderNumberFormat,
} from '@/lib/reports/number-formats'
import { getSupabaseSchemaErrorMessage } from '@/lib/supabase/schema-errors'

interface AddCalendarItemModalProps {
  isOpen: boolean
  onClose: () => void
  selectedDate: Date | null
  selectedEndDate?: Date | null 
  selectedItem?: any | null
  selectedType?: 'event' | 'task' | null
  prefilledData?: {
    clientName?: string
    clientId?: string
    location?: string
    address?: string
    jobTask?: string
    task_pic_id?: string
    task_pic_name?: string
    task_pic_color?: string
    jobOrderNumber?: string
    jobGroupId?: string
    followUpOfTaskId?: string
    sourceDateStart?: string | null
    sourceDateStop?: string | null
    sourcePicName?: string | null
    returnToJobOrders?: boolean
  } | null
  onSuccess?: () => void
  onSave?: (data: any, type: 'event' | 'task') => Promise<any>
  onDelete?: (id: string, type: 'event' | 'task') => Promise<void>
}

type TaskPrefillData = NonNullable<AddCalendarItemModalProps['prefilledData']>

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
  const hasJobOrder = !!data.jobOrderNumber
  const hasFinalReport = !!data.finalReportNumber
  
  if (hasJobOrder && hasFinalReport) return 'completed'
  if (!data.dateStart) return 'onhold'

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const startDate = new Date(data.dateStart)
  startDate.setHours(0, 0, 0, 0)
  const dueDate = data.dateStop ? new Date(data.dateStop) : new Date(data.dateStart)
  dueDate.setHours(0, 0, 0, 0)

  const isDueDatePassed = dueDate < today
  if (isDueDatePassed && (!hasJobOrder || !hasFinalReport)) return 'incomplete'
  if (startDate > today) return 'upcoming'
  if (startDate <= today && dueDate >= today) return 'ongoing'
  return 'in-progress'
}

const getStatusColor = (status: string) => {
  switch(status) {
    case 'completed': return 'bg-green-100 text-green-800'
    case 'ongoing': return 'bg-green-100 text-green-800'
    case 'upcoming': return 'bg-blue-100 text-blue-800'
    case 'in-progress': return 'bg-yellow-200 text-yellow-900'
    case 'incomplete': return 'bg-red-200 text-red-900'
    case 'onhold': return 'bg-gray-100 text-gray-600'
    default: return 'bg-gray-100 text-gray-800'
  }
}

const getStatusText = (status: string) => {
  switch(status) {
    case 'completed': return 'Completed'
    case 'ongoing': return 'Ongoing'
    case 'upcoming': return 'Upcoming'
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
  event_pic_id: '',           
  event_support_ids: [] as string[],  
  event_pic_name: '',          
  event_pic_color: '',         
  event_support_names: [] as string[],  
  event_support_colors: [] as string[],
}

const initialTaskData = {
  clientName: '',
  clientId: '',
  location: '',
  address: '',
  jobTask: '',
  dateStart: '',
  dateStop: '',
  timeStart: '',
  timeStop: '',
  additionalRemark: '',
  jobGroupId: '',
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
  selectedEndDate,
  selectedItem,
  selectedType,
  prefilledData,
  onSuccess,
  onSave,
  onDelete
}: AddCalendarItemModalProps) {
  const [activeTab, setActiveTab] = useState<'event' | 'task'>(() => {
    return selectedType || 'task'
  })
  
  const [showTime, setShowTime] = useState(false)
  const [showDescription, setShowDescription] = useState(false)
  const [showSupport, setShowSupport] = useState(false)
  const [showFinalReport, setShowFinalReport] = useState(false)
  const [showEventPic, setShowEventPic] = useState(false)
  const [showEventSupport, setShowEventSupport] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [errors, setErrors] = useState<{[key: string]: string}>({})
  const [touched, setTouched] = useState<{[key: string]: boolean}>({})
  const [jobTasks, setJobTasks] = useState<JobTask[]>([])
  const [loadingTasks, setLoadingTasks] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [loadingClients, setLoadingClients] = useState(false)
  const [staffList, setStaffList] = useState<Staff[]>([])
  const [loadingStaff, setLoadingStaff] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false)
  const [pendingSubmit, setPendingSubmit] = useState<(() => Promise<void>) | null>(null)
  const { toast } = useToast()
  const supabase = createClient()
  const [eventData, setEventData] = useState(initialEventData)
  const [taskData, setTaskData] = useState(initialTaskData)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [modalFollowUpData, setModalFollowUpData] = useState<TaskPrefillData | null>(null)
  const effectivePrefilledData = modalFollowUpData || prefilledData
  const isFollowUpMode = activeTab === 'task' && !selectedItem && !!effectivePrefilledData?.followUpOfTaskId
  const isInheritedJobOrderLocked = isFollowUpMode && !!effectivePrefilledData?.jobOrderNumber
  
  const initialLoadDone = useRef(false)
  
  const getCurrentTaskStatus = useCallback(() => {
    return computeTaskStatus({
      dateStart: taskData.dateStart || null,
      dateStop: taskData.dateStop || null,
      jobOrderNumber: taskData.jobOrderNumber || null,
      finalReportNumber: taskData.finalReportNumber || null,
    })
  }, [taskData.dateStart, taskData.dateStop, taskData.jobOrderNumber, taskData.finalReportNumber])

  const checkTaskNumberExists = useCallback(async (
    column: 'job_order_number' | 'final_report_number',
    value: string,
    currentTaskId?: string
  ): Promise<boolean> => {
    if (!value || value.trim() === '') return false
    
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('id, job_group_id')
        .eq(column, value.trim())
        .limit(10)
      
      if (error) throw error

      const matchingTasks = data || []
      
      if (column === 'job_order_number') {
        const allowedGroupId = taskData.jobGroupId || selectedItem?.jobGroupId
        return matchingTasks.some((task) => {
          if (currentTaskId && task.id === currentTaskId) return false
          if (allowedGroupId && task.job_group_id === allowedGroupId) return false
          return true
        })
      }
      
      return matchingTasks.some((task) => !currentTaskId || task.id !== currentTaskId)
    } catch (error) {
      console.error(`Error checking ${column}:`, error)
      return false
    }
  }, [selectedItem?.jobGroupId, supabase, taskData.jobGroupId])

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
          ? `${assignedByName} has assigned ${user.name} as ${role} for task: ${data.clientName || data.client_name || 'New Task'} (Due: ${formattedDate})`
          : `${assignedByName} has updated ${user.name}'s assignment for "${data.clientName || data.client_name || 'Task'}" (Role: ${role})`
        
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
          ? `${assignedByName} has assigned ${user.name} as ${role} for event: ${data.title || 'New Event'} (Date: ${formattedDate})`
          : `${assignedByName} has updated ${user.name}'s assignment for "${data.title || 'Event'}" (Role: ${role})`
        
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
    setActiveTab('task')
    setEventData(initialEventData)
    setTaskData(initialTaskData)
    setShowTime(false)
    setShowDescription(false)
    setShowSupport(false)
    setShowFinalReport(false)
    setShowEventPic(false)
    setShowEventSupport(false)
    setModalFollowUpData(null)
    setErrors({})
    setTouched({})
    
  }, [])

  const fetchJobTasks = useCallback(async () => {
    setLoadingTasks(true)
    try {
      const names = await fetchJobTaskNames(supabase)
      setJobTasks(names.map((name) => ({ id: name, name })))
    } catch (error) {
      console.error('Error fetching job tasks:', error)
    } finally {
      setLoadingTasks(false)
    }
  }, [supabase])

  const fetchTaskClients = useCallback(async () => {
    setLoadingClients(true)
    try {
      const data = await fetchClients(supabase)
      setClients(data)
    } catch (error) {
      setClients([])
    } finally {
      setLoadingClients(false)
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
    
    const taskPicId = item.task_pic_id || ''
    const normalizedTaskSupportIds = taskSupportIdsArray.filter(id => id && id !== taskPicId)
    const normalizedTaskSupportNames = normalizedTaskSupportIds.map((id) => {
      const originalIndex = taskSupportIdsArray.indexOf(id)
      return taskSupportNamesArray[originalIndex] || ''
    })
    const normalizedTaskSupportColors = normalizedTaskSupportIds.map((id) => {
      const originalIndex = taskSupportIdsArray.indexOf(id)
      return taskSupportColorsArray[originalIndex] || 'blue'
    })

    setTaskData({
      clientName: item.client_name || item.clientName || '',
      clientId: item.client_id || item.clientId || '',
      location: item.location || '',
      address: item.address || '',
      jobTask: item.job_task || item.jobTask || '',
      dateStart: item.date_start || item.dateStart || '',
      dateStop: item.date_stop || item.dateStop || '',
      timeStart: item.time_start || item.timeStart || '',
      timeStop: item.time_stop || item.timeStop || '',
      additionalRemark: item.additional_remark || item.additionalRemark || '',
      jobGroupId: item.job_group_id || item.jobGroupId || '',
      jobOrderNumber: item.job_order_number || item.jobOrderNumber || '',
      task_pic_id: taskPicId,
      task_support_ids: normalizedTaskSupportIds,
      finalReportNumber: item.final_report_number || item.finalReportNumber || '',
      task_pic_name: item.task_pic_name || '',
      task_pic_color: item.task_pic_color || '',
      task_support_names: normalizedTaskSupportNames,
      task_support_colors: normalizedTaskSupportColors,
    })
    
    const timeStart = item.time_start || item.timeStart || ''
    const timeStop = item.time_stop || item.timeStop || ''
    setShowTime(!!(timeStart || timeStop))
    setShowDescription(!!(item.additional_remark || item.additionalRemark))
    setShowSupport(normalizedTaskSupportIds.length > 0 || normalizedTaskSupportNames.length > 0)
    setShowFinalReport(!!(item.final_report_number))
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
    
    const eventPicId = item.event_pic_id || ''
    const normalizedEventSupportIds = eventSupportIdsArray.filter(id => id && id !== eventPicId)
    const normalizedEventSupportNames = normalizedEventSupportIds.map((id) => {
      const originalIndex = eventSupportIdsArray.indexOf(id)
      return eventSupportNamesArray[originalIndex] || ''
    })
    const normalizedEventSupportColors = normalizedEventSupportIds.map((id) => {
      const originalIndex = eventSupportIdsArray.indexOf(id)
      return eventSupportColorsArray[originalIndex] || 'purple'
    })

    setEventData({
      title: item.title || '',
      description: item.description || '',
      dateStart: item.date_start || item.dateStart || '',
      dateStop: item.date_stop || item.dateStop || '',
      timeStart: item.time_start || item.timeStart || '',
      timeStop: item.time_stop || item.timeStop || '',
      event_pic_id: eventPicId,
      event_support_ids: normalizedEventSupportIds,
      event_pic_name: item.event_pic_name || '',
      event_pic_color: item.event_pic_color || '',
      event_support_names: normalizedEventSupportNames,
      event_support_colors: normalizedEventSupportColors,
    })
    
    const timeStart = item.time_start || item.timeStart || ''
    const timeStop = item.time_stop || item.timeStop || ''
    setShowTime(!!(timeStart || timeStop))
    setShowDescription(!!item.description)
    setShowEventPic(!!(item.event_pic_name || item.event_pic_id))
    setShowEventSupport(normalizedEventSupportIds.length > 0 || normalizedEventSupportNames.length > 0)
  }, [])

  useEffect(() => {
    if (!isOpen) {
      initialLoadDone.current = false
      return
    }
    
    if (initialLoadDone.current) return
    
    const loadData = async () => {
      await fetchJobTasks()
      await fetchTaskClients()
      await fetchStaff()
      
      if (selectedItem) {
        if (selectedType === 'event') {
          populateEventForm(selectedItem)
        } else if (selectedType === 'task') {
          populateTaskForm(selectedItem)
        }
        setActiveTab(selectedType || 'task')
      } else {
        setActiveTab('task')
      }

      if (!selectedItem && (selectedDate || prefilledData)) {
        const dateStr = selectedDate ? formatDateToString(selectedDate) : ''
        const endDateStr = selectedEndDate ? formatDateToString(selectedEndDate) : ''

        if (selectedDate) {
          setEventData(prev => ({ ...prev, dateStart: dateStr, dateStop: endDateStr }))
        }
        setTaskData(prev => ({
          ...prev,
          clientName: prefilledData?.clientName || prev.clientName,
          clientId: prefilledData?.clientId || prev.clientId,
          location: prefilledData?.location || prev.location,
          address: prefilledData?.address || prev.address,
          jobTask: prefilledData?.jobTask || prev.jobTask,
          jobGroupId: prefilledData?.jobGroupId || prev.jobGroupId || createJobGroupId(),
          task_pic_id: prefilledData?.task_pic_id || prev.task_pic_id,
          task_pic_name: prefilledData?.task_pic_name || prev.task_pic_name,
          task_pic_color: prefilledData?.task_pic_color || prev.task_pic_color,
          jobOrderNumber: prefilledData?.jobOrderNumber || prev.jobOrderNumber,
          dateStart: dateStr,
          dateStop: endDateStr,
        }))
      }
      
      initialLoadDone.current = true
    }
    
    loadData()
    
    return () => {
      resetForm()
      initialLoadDone.current = false
    }
  }, [isOpen, selectedItem, selectedDate, selectedEndDate, selectedType, prefilledData, populateEventForm, populateTaskForm, resetForm, fetchJobTasks, fetchTaskClients, fetchStaff])

  useEffect(() => {
    if (!isOpen || activeTab !== 'task') return

    const jobOrderNumber = normalizeJobOrderNumber(taskData.jobOrderNumber)
    const finalReportNumber = normalizeFinalReportNumber(taskData.finalReportNumber)
    if (!jobOrderNumber && !finalReportNumber) return

    const timer = setTimeout(async () => {
      const currentTaskId = selectedItem?.id
      const duplicateErrors: {[key: string]: string} = {}

      if (
        jobOrderNumber &&
        validateJobOrderNumberFormat(jobOrderNumber) &&
        !isSameJobOrderFollowUp(jobOrderNumber, effectivePrefilledData?.jobOrderNumber)
      ) {
        const exists = await checkTaskNumberExists('job_order_number', jobOrderNumber, currentTaskId)
        if (exists) {
          duplicateErrors.jobOrderNumber = `Job Order Number "${jobOrderNumber}" already exists. Please use a different number.`
        }
      }

      setTouched(prev => ({
        ...prev,
        ...(jobOrderNumber ? { jobOrderNumber: true } : {}),
        ...(finalReportNumber ? { finalReportNumber: true } : {}),
      }))
      setErrors(prev => {
        const next = { ...prev }
        if (next.jobOrderNumber?.includes('already exists')) delete next.jobOrderNumber
        return { ...next, ...duplicateErrors }
      })
    }, 800)

    return () => clearTimeout(timer)
  }, [
    isOpen,
    activeTab,
    selectedItem,
    effectivePrefilledData?.jobOrderNumber,
    taskData.jobOrderNumber,
    taskData.finalReportNumber,
    taskData.jobTask,
    checkTaskNumberExists
  ])

  useEffect(() => {
    if (!isOpen || activeTab !== 'task') return
    if (!taskData.clientName || taskData.clientId || taskData.location) return

    const locations = getLocationsForClient(clients, taskData.clientName)
    if (locations.length !== 1) return

    const [location] = locations
    setTaskData((prev) => {
      if (prev.clientId || prev.location || prev.clientName !== taskData.clientName) return prev

      return {
        ...prev,
        clientId: location.id,
        location: location.location,
        address: location.address || '',
      }
    })

    if (touched.location) {
      setErrors((prev) => ({ ...prev, location: '' }))
    }
  }, [
    isOpen,
    activeTab,
    clients,
    taskData.clientName,
    taskData.clientId,
    taskData.location,
    touched.location,
  ])

  useEffect(() => {
    if (!isOpen || activeTab !== 'task' || clients.length === 0) return

    const selectedLocation = findClient(clients, {
      id: taskData.clientId,
      clientName: taskData.clientName,
      location: taskData.location,
    })
    if (!selectedLocation) return

    setTaskData((prev) => {
      const nextAddress = selectedLocation.address || ''
      if (
        prev.clientId === selectedLocation.id &&
        prev.clientName === selectedLocation.client_name &&
        prev.location === selectedLocation.location &&
        (prev.address || '') === nextAddress
      ) {
        return prev
      }

      return {
        ...prev,
        clientId: selectedLocation.id || prev.clientId,
        clientName: selectedLocation.client_name || prev.clientName,
        location: selectedLocation.location || prev.location,
        address: nextAddress,
      }
    })
  }, [
    isOpen,
    activeTab,
    clients,
    taskData.clientId,
    taskData.clientName,
    taskData.location,
  ])

  // ========== CONDITIONAL RETURN AFTER ALL HOOKS ==========
  if (!isOpen) return null

  const clientNameOptions = getUniqueClientNames(clients).map((name) => ({ value: name, label: name }))
  if (taskData.clientName && !clientNameOptions.some((option) => option.value === taskData.clientName)) {
    clientNameOptions.push({ value: taskData.clientName, label: `${taskData.clientName} (current)` })
  }

  const selectedClient = findClient(clients, {
    id: taskData.clientId,
    clientName: taskData.clientName,
    location: taskData.location,
  })
  const resolvedClientName = selectedClient?.client_name || taskData.clientName
  const clientOptions = getLocationsForClient(clients, resolvedClientName)
  const hasLegacyLocation =
    taskData.location &&
    !clientOptions.some((item) => item.id === (selectedClient?.id || taskData.clientId) || item.location === taskData.location)
  const legacyClientValue = hasLegacyLocation ? `legacy-${taskData.location}` : ''
  const selectedClientValue = selectedClient?.id || taskData.clientId || legacyClientValue

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
    
    return !taskData.clientName || !taskData.task_pic_id
  }

  const getSaveButtonTitle = (): string => {
    if (activeTab === 'task' && !selectedItem) {
      if (!taskData.clientName) {
        return 'Please enter client name'
      }
      if (!taskData.task_pic_id) {
        return 'Please select a PIC'
      }
    }
    return ''
  }

  const normalizeSupportSelection = (
    ids: string[],
    excludedPicId: string,
    fallbackNames: string[] = [],
    fallbackColors: string[] = [],
    defaultColor = 'blue'
  ) => {
    const uniqueIds = Array.from(new Set(ids.filter(id => id && id !== excludedPicId)))

    return uniqueIds.reduce(
      (acc, id) => {
        const fallbackIndex = ids.indexOf(id)
        const staff = staffList.find(s => s.id === id)
        acc.ids.push(id)
        acc.names.push(staff?.name || fallbackNames[fallbackIndex] || '')
        acc.colors.push(staff?.color || fallbackColors[fallbackIndex] || defaultColor)
        return acc
      },
      { ids: [] as string[], names: [] as string[], colors: [] as string[] }
    )
  }

  // Rest of component functions (handlers, validators, etc.)
  const handleTaskSupportToggle = (staffId: string) => {
    const selectedStaff = staffList.find(s => s.id === staffId)
    
    setTaskData(prev => {
      if (staffId === prev.task_pic_id) return prev

      const currentIds = [...prev.task_support_ids]
      
      if (currentIds.includes(staffId)) {
        currentIds.splice(currentIds.indexOf(staffId), 1)
      } else if (selectedStaff) {
        currentIds.push(staffId)
      }

      const normalized = normalizeSupportSelection(currentIds, prev.task_pic_id, prev.task_support_names, prev.task_support_colors, 'blue')
      return { ...prev, task_support_ids: normalized.ids, task_support_names: normalized.names, task_support_colors: normalized.colors }
    })
  }

  const handleEventSupportToggle = (staffId: string) => {
    const selectedStaff = staffList.find(s => s.id === staffId)
    
    setEventData(prev => {
      if (staffId === prev.event_pic_id) return prev

      const currentIds = [...prev.event_support_ids]
      
      if (currentIds.includes(staffId)) {
        currentIds.splice(currentIds.indexOf(staffId), 1)
      } else if (selectedStaff) {
        currentIds.push(staffId)
      }

      const normalized = normalizeSupportSelection(currentIds, prev.event_pic_id, prev.event_support_names, prev.event_support_colors, 'purple')
      return { ...prev, event_support_ids: normalized.ids, event_support_names: normalized.names, event_support_colors: normalized.colors }
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

  const getAvailableLocationsForTaskClient = (clientName = taskData.clientName) =>
    getLocationsForClient(clients, clientName)

  const handleClientNameSelect = (clientName: string) => {
    const locations = getLocationsForClient(clients, clientName)
    const currentLocationStillValid = locations.some((item) => item.location === taskData.location)
    const nextLocation = locations.length === 1
      ? locations[0]
      : currentLocationStillValid
        ? findClient(locations, { clientName, location: taskData.location })
        : undefined

    setTaskData((prev) => ({
      ...prev,
      clientName,
      clientId: nextLocation?.id || '',
      location: nextLocation?.location || '',
      address: nextLocation?.address || '',
    }))

    if (touched.clientName) {
      setErrors((prev) => ({ ...prev, clientName: validateTaskField('clientName', clientName) }))
    }
    if (touched.location) {
      setErrors((prev) => ({
        ...prev,
        location: nextLocation ? '' : validateTaskField('location', ''),
      }))
    }
  }

  const handleClientSelect = (clientId: string) => {
    if (clientId.startsWith('legacy-')) {
      setTaskData((prev) => ({
        ...prev,
        clientId: '',
        location: clientId.replace(/^legacy-/, ''),
        address: '',
      }))
      return
    }

    const selectedLocation = clients.find((item) => item.id === clientId)
    setTaskData((prev) => ({
      ...prev,
      clientId,
      clientName: selectedLocation?.client_name || prev.clientName,
      location: selectedLocation?.location || '',
      address: selectedLocation?.address || '',
    }))

    if (touched.location) {
      setErrors((prev) => ({
        ...prev,
        location: validateTaskField('location', selectedLocation?.location || ''),
      }))
    }
  }

  const validateTaskField = (field: string, value: any): string => {
    switch (field) {
      case 'clientName':
        if (!value?.trim()) return 'Client Name is required'
        if (value.length < 2) return 'Client name must be at least 2 characters'
        if (value.length > 100) return 'Client name cannot exceed 100 characters'
        break
      case 'location':
        if (getAvailableLocationsForTaskClient().length > 0 && !value?.trim()) return 'Location is required'
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
        if (!value?.trim()) return 'Job Task is required'
        if (value && value.length > 200) return 'Job task cannot exceed 200 characters'
        break
      case 'jobOrderNumber':
        if (value && !validateJobOrderNumberFormat(value)) {
          return `Job Order Number must use format ${JOB_ORDER_NUMBER_EXAMPLE}`
        }
        break
      case 'finalReportNumber':
        if (value && !validateFinalReportNumberForJobTask(value, taskData.jobTask)) {
          return `Final Report Number must use format ${getFinalReportNumberExample(taskData.jobTask)}`
        }
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
    const locationError = validateTaskField('location', taskData.location)
    if (locationError) newErrors.location = locationError
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
    const jobTaskError = validateTaskField('jobTask', taskData.jobTask)
    if (jobTaskError) newErrors.jobTask = jobTaskError
    const jobOrderNumberError = validateTaskField('jobOrderNumber', taskData.jobOrderNumber)
    if (jobOrderNumberError) newErrors.jobOrderNumber = jobOrderNumberError
    const finalReportNumberError = validateTaskField('finalReportNumber', taskData.finalReportNumber)
    if (finalReportNumberError) newErrors.finalReportNumber = finalReportNumberError
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
    }
  }

  // File upload/preview handlers removed. Using job order number/final report number fields instead.

  const handleRemoveDate = () => {
    setTaskData(prev => ({ 
      ...prev, 
      dateStart: '', 
      dateStop: ''
    }))
    toast({ 
      title: "Date Removed", 
      description: "Task will move to Task Inbox. Other details are kept."
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

    if (activeTab === 'task') {
      const currentTaskId = selectedItem?.id
      const jobOrderNumber = normalizeJobOrderNumber(taskData.jobOrderNumber)
      const duplicateErrors: {[key: string]: string} = {}

      const jobOrderExists = jobOrderNumber && !isSameJobOrderFollowUp(jobOrderNumber, effectivePrefilledData?.jobOrderNumber)
        ? await checkTaskNumberExists('job_order_number', jobOrderNumber, currentTaskId)
        : false

      if (jobOrderExists) {
        duplicateErrors.jobOrderNumber = `Job Order Number "${jobOrderNumber}" already exists. Please use a different number.`
      }

      if (Object.keys(duplicateErrors).length > 0) {
        setErrors(prev => ({ ...prev, ...duplicateErrors }))
        toast({
          title: "Validation Error",
          description: Object.values(duplicateErrors)[0],
          variant: "destructive"
        })
        return
      }
    }

    const saveFunction = async () => {
      setIsSaving(true)
      
      try {
        if (activeTab === 'event') {
          const normalizedEventSupport = normalizeSupportSelection(
            eventData.event_support_ids,
            eventData.event_pic_id,
            eventData.event_support_names,
            eventData.event_support_colors,
            'purple'
          )

          const dataToSave = {
            title: eventData.title,
            description: eventData.description || '',
            date_start: eventData.dateStart,
            date_stop: eventData.dateStop || null,
            time_start: eventData.timeStart || '',
            time_stop: eventData.timeStop || '',
            event_pic_id: eventData.event_pic_id || null,
            event_pic_name: eventData.event_pic_name || '',
            event_pic_color: eventData.event_pic_color || '',
            event_support_ids: normalizedEventSupport.ids.length > 0 ? normalizedEventSupport.ids.join(',') : null,
            event_support_names: normalizedEventSupport.names.length > 0 ? normalizedEventSupport.names.join(',') : null,
            event_support_colors: normalizedEventSupport.colors.length > 0 ? normalizedEventSupport.colors.join(',') : null,
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
            if (eventData.event_pic_id || normalizedEventSupport.ids.length > 0) {
              await sendEventNotifications({
                ...eventData,
                event_support_ids: normalizedEventSupport.ids,
                event_support_names: normalizedEventSupport.names,
                event_support_colors: normalizedEventSupport.colors,
              }, result.id, action)
            }
          }

          toast({
            title: "Success",
            description: selectedItem ? "Event updated successfully" : "Event created successfully",
          })

        } else {
          const normalizedTaskSupport = normalizeSupportSelection(
            taskData.task_support_ids,
            taskData.task_pic_id,
            taskData.task_support_names,
            taskData.task_support_colors,
            'blue'
          )
          
          const computedStatus = computeTaskStatus({
            dateStart: taskData.dateStart || null,
            dateStop: taskData.dateStop || null,
            jobOrderNumber: normalizeJobOrderNumber(taskData.jobOrderNumber) || null,
            finalReportNumber: normalizeFinalReportNumber(taskData.finalReportNumber) || null,
          })
          const jobOrderNumber = normalizeJobOrderNumber(taskData.jobOrderNumber)
          const finalReportNumber = normalizeFinalReportNumber(taskData.finalReportNumber)
          const selectedTaskClient = findClient(clients, {
            id: taskData.clientId,
            clientName: taskData.clientName,
            location: taskData.location,
          })

          const dataToSave = {
            client_name: selectedTaskClient?.client_name || taskData.clientName,
            client_id: selectedTaskClient?.id || taskData.clientId || null,
            location: selectedTaskClient?.location || taskData.location || null,
            address: selectedTaskClient?.address || taskData.address || null,
            job_task: taskData.jobTask,
            date_start: taskData.dateStart || null,
            date_stop: taskData.dateStop || null,
            time_start: taskData.timeStart || '',
            time_stop: taskData.timeStop || '',
            additional_remark: taskData.additionalRemark || '',
            job_group_id: taskData.jobGroupId || effectivePrefilledData?.jobGroupId || createJobGroupId(),
            job_order_number: jobOrderNumber || null,
            task_pic_id: taskData.task_pic_id || null,
            task_pic_name: taskData.task_pic_name || '',
            task_pic_color: taskData.task_pic_color || '',
            task_support_ids: normalizedTaskSupport.ids.length > 0 ? normalizedTaskSupport.ids.join(',') : null,
            task_support_names: normalizedTaskSupport.names.length > 0 ? normalizedTaskSupport.names.join(',') : null,
            task_support_colors: normalizedTaskSupport.colors.length > 0 ? normalizedTaskSupport.colors.join(',') : null,
            final_report_number: finalReportNumber || null,
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
            if (taskData.task_pic_id || normalizedTaskSupport.ids.length > 0) {
              await sendTaskNotifications({
                ...taskData,
                task_support_ids: normalizedTaskSupport.ids,
                task_support_names: normalizedTaskSupport.names,
                task_support_colors: normalizedTaskSupport.colors,
              }, result.id, action)
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
        toast({
          title: "Error",
          description: getSupabaseSchemaErrorMessage(error) || error.message || "Failed to save",
          variant: "destructive",
        })
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
    setShowDeleteConfirmDialog(true)
  }

  const confirmDelete = async () => {
    if (!selectedItem) return

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
      setShowDeleteConfirmDialog(false)
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
      <p className="mt-1 flex items-center text-xs text-red-600">
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
  const followUpSourceDate = effectivePrefilledData?.sourceDateStart
    ? `${effectivePrefilledData.sourceDateStart}${effectivePrefilledData.sourceDateStop ? ` - ${effectivePrefilledData.sourceDateStop}` : ''}`
    : 'Unscheduled source task'
  const lockedEditType = selectedItem ? (selectedType || activeTab) : null
  const eventTabDisabled = isSaving || lockedEditType === 'task'
  const taskTabDisabled = isSaving || lockedEditType === 'event'
  const lockedTypeTooltip = lockedEditType ? 'Type is locked while editing. Create a new item to use another type.' : undefined
  const labelClass = 'text-sm font-medium text-gray-900'
  const requiredClass = 'ml-1 text-red-600'
  const inputClass = 'border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 focus-visible:ring-gray-400'
  const invalidInputClass = 'border-red-500 focus-visible:ring-red-500'
  const actionButtonClass = 'flex items-center text-sm font-medium text-gray-900 transition-colors hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50'
  const fieldPanelClass = 'space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4'
  const tabBaseClass = 'relative flex items-center space-x-2 px-1 pb-1 text-sm font-medium transition-colors'
  const inactiveTabClass = 'text-gray-500 hover:text-gray-900'

  // ========== RENDER COMPONENT ==========
  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
        <div className="flex h-[calc(100dvh-0.75rem)] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:h-auto sm:max-h-[90vh] sm:rounded-lg">
          <Card className="flex h-full min-h-0 flex-col border-0">
            <CardHeader className="shrink-0 border-b border-gray-200 bg-gray-50 px-4 py-3 sm:px-6 sm:py-4">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="min-w-0 truncate text-lg">
                  {isFollowUpMode
                    ? 'Add Follow-up Job Task'
                    : `${selectedItem ? 'Edit' : 'Add New'} ${activeTab === 'event' ? 'Event' : 'Job Task'}`}
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={() => { resetForm(); onClose() }} type="button" disabled={isSaving}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="mt-2 flex items-center gap-3 overflow-x-auto border-b border-gray-200 pb-2">
                <button
                  type="button"
                  onClick={() => {
                    if (taskTabDisabled) return
                    setActiveTab('task')
                    setErrors({})
                    setTouched({})
                  }}
                  disabled={taskTabDisabled}
                  title={taskTabDisabled && lockedEditType === 'event' ? lockedTypeTooltip : undefined}
                  aria-disabled={taskTabDisabled}
                  className={`${tabBaseClass} ${
                    activeTab === 'task' ? 'border-b-2 border-blue-600 text-blue-600' : inactiveTabClass
                  } ${taskTabDisabled ? 'cursor-not-allowed opacity-40 hover:text-gray-500' : 'cursor-pointer'}`}>
                  <Briefcase className="h-4 w-4" />
                  <span>Task</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (eventTabDisabled) return
                    setActiveTab('event')
                    setErrors({})
                    setTouched({})
                  }}
                  disabled={eventTabDisabled}
                  title={eventTabDisabled && lockedEditType === 'task' ? lockedTypeTooltip : undefined}
                  aria-disabled={eventTabDisabled}
                  className={`${tabBaseClass} ${
                    activeTab === 'event' ? 'border-b-2 border-purple-600 text-purple-600' : inactiveTabClass
                  } ${eventTabDisabled ? 'cursor-not-allowed opacity-40 hover:text-gray-500' : 'cursor-pointer'}`}>
                  <CalendarCheck className="h-4 w-4" />
                  <span>Event</span>
                </button>
              </div>
            </CardHeader>

            <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
              <CardContent className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pt-4 pb-6 sm:px-6">
                {selectedDate && !selectedItem && (
                  <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
                    <CalendarIcon className="h-4 w-4 mr-2 text-gray-500" />
                    <span>{formatDateDisplay(selectedDate)}</span>
                  </div>
                )}

                {activeTab === 'task' && (
                  <>
                    {isFollowUpMode && (
                      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-950 dark:border-blue-500/70 dark:bg-blue-950/60 dark:text-blue-50">
                        <div className="mb-2 flex items-center gap-2 font-semibold text-blue-950 dark:text-blue-50">
                          <Briefcase className="h-4 w-4 text-blue-700 dark:text-blue-300" />
                          Follow-up task
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <div>
                            <span className="block text-xs font-semibold uppercase text-blue-700 dark:text-blue-200">Client</span>
                            <span className="block truncate text-blue-950 dark:text-blue-50">{effectivePrefilledData?.clientName || '-'}</span>
                          </div>
                          <div>
                            <span className="block text-xs font-semibold uppercase text-blue-700 dark:text-blue-200">Previous date</span>
                            <span className="block truncate text-blue-950 dark:text-blue-50">{followUpSourceDate}</span>
                          </div>
                          <div>
                            <span className="block text-xs font-semibold uppercase text-blue-700 dark:text-blue-200">Job order</span>
                            <span className="block truncate text-blue-950 dark:text-blue-50">{effectivePrefilledData?.jobOrderNumber || 'No job order number'}</span>
                          </div>
                          <div>
                            <span className="block text-xs font-semibold uppercase text-blue-700 dark:text-blue-200">Previous PIC</span>
                            <span className="block truncate text-blue-950 dark:text-blue-50">{effectivePrefilledData?.sourcePicName || effectivePrefilledData?.task_pic_name || '-'}</span>
                          </div>
                        </div>

                      </div>
                    )}

                    <div className="mb-2 flex flex-col gap-2 rounded-lg bg-gray-50 p-3 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-sm font-medium text-gray-600">Current Status:</span>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(currentTaskStatus || 'in-progress')}`}>
                        {getStatusText(currentTaskStatus || 'in-progress')}
                      </span>
                    </div>

                    {/* Job Order Number */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <Label className="font-medium text-gray-900">Job Order Number</Label>
                        {isInheritedJobOrderLocked && (
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                            Linked
                          </span>
                        )}
                      </div>
                      <Input
                        value={taskData.jobOrderNumber}
                        onChange={(e) => {
                          const value = normalizeJobOrderNumber(e.target.value)
                          setTaskData(prev => ({ ...prev, jobOrderNumber: value }))
                          if (touched.jobOrderNumber) {
                            setErrors(prev => ({ ...prev, jobOrderNumber: validateTaskField('jobOrderNumber', value) }))
                          }
                        }}
                        onBlur={() => handleBlur('jobOrderNumber')}
                        placeholder={JOB_ORDER_NUMBER_EXAMPLE}
                        className={`${inputClass} ${touched.jobOrderNumber && errors.jobOrderNumber ? invalidInputClass : ''}`}
                        disabled={isSaving || isInheritedJobOrderLocked}
                      />
                      {isInheritedJobOrderLocked && (
                        <p className="text-xs text-gray-500">
                          This follow-up uses the same job order number with previous tasks.
                        </p>
                      )}
                      <ErrorMessage field="jobOrderNumber" />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <Label className={labelClass}>Client Name <span className={requiredClass}>*</span></Label>
                        {isFollowUpMode && (
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                            Linked
                          </span>
                        )}
                      </div>
                      {loadingClients ? (
                        <div className="flex items-center space-x-2 rounded-md border border-gray-300 bg-gray-50 p-2">
                          <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                          <span className="text-sm text-gray-500">Loading clients...</span>
                        </div>
                      ) : (
                        <Combobox
                          options={clientNameOptions}
                          value={taskData.clientName || ''}
                          onValueChange={handleClientNameSelect}
                          onBlur={() => handleBlur('clientName')}
                          placeholder="Select client"
                          emptyMessage="No clients found."
                          disabled={isSaving || isFollowUpMode}
                          className={touched.clientName && errors.clientName ? invalidInputClass : ''}
                        />
                      )}
                      {isFollowUpMode && (
                        <p className="text-xs text-gray-500">
                          This follow-up uses the same client name with previous tasks..
                        </p>
                      )}
                      <ErrorMessage field="clientName" />
                    </div>

                    <div className="space-y-2">
                      <Label className={labelClass}>Location <span className={clientOptions.length > 0 ? requiredClass : 'text-gray-400'}>{clientOptions.length > 0 ? '*' : '(Optional)'}</span></Label>
                      <Select
                        value={selectedClientValue}
                        onValueChange={handleClientSelect}
                        onOpenChange={() => handleBlur('location')}
                        disabled={isSaving || !taskData.clientName || isFollowUpMode}
                      >
                        <SelectTrigger className={`${inputClass} ${touched.location && errors.location ? invalidInputClass : ''}`}>
                          {selectedClient?.location || taskData.location ? (
                            <span className="truncate">{selectedClient?.location || taskData.location}</span>
                          ) : (
                            <SelectValue placeholder={taskData.clientName ? 'Select location' : 'Select client first'} />
                          )}
                        </SelectTrigger>
                        <SelectContent
                          className="z-[80] max-h-[45vh] overflow-hidden border border-gray-200 bg-white text-gray-900 shadow-lg dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                          viewportClassName="h-auto max-h-52 overflow-y-auto overscroll-contain"
                        >
                          {hasLegacyLocation && (
                            <SelectItem value={legacyClientValue} className="text-gray-900 dark:text-gray-100">
                              {taskData.location} (current)
                            </SelectItem>
                          )}
                          {clientOptions.length === 0 && (
                            <div className="px-2 py-2 text-sm text-gray-500 dark:text-gray-400">
                              No locations found for this client.
                            </div>
                          )}
                          {clientOptions.map((location) => (
                            <SelectItem key={location.id} value={location.id} className="text-gray-900 dark:text-gray-100">
                              {location.location}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {isFollowUpMode && (
                        <p className="text-xs text-gray-500">
                          Location is linked from the previous task.
                        </p>
                      )}
                      <ErrorMessage field="location" />
                    </div>

                    <div className="space-y-2">
                      <Label className={labelClass}>Job Task <span className={requiredClass}>*</span></Label>
                      {loadingTasks ? (
                        <div className="flex items-center space-x-2 border border-gray-300 rounded-md p-2 bg-gray-50">
                          <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
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
                          disabled={isSaving || isFollowUpMode}
                          className={touched.jobTask && errors.jobTask ? invalidInputClass : ''}
                        />
                      )}
                      {isFollowUpMode && (
                        <p className="text-xs text-gray-500">
                          Job task is linked from the previous task.
                        </p>
                      )}
                      <ErrorMessage field="jobTask" />
                    </div>

                    <div className="space-y-2">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <Label className={labelClass}>Start Date (Optional)</Label>
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
                        className={inputClass}
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
                        <Label className={labelClass}>End Date (Optional)</Label>
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
                          className={`${inputClass} ${touched.dateStop && errors.dateStop ? invalidInputClass : ''}`}
                          disabled={isSaving} 
                        />
                        <ErrorMessage field="dateStop" />
                      </div>
                    )}

                    {!showTime ? (
                      <button type="button" onClick={() => setShowTime(true)} className={actionButtonClass} disabled={isSaving}>
                        <Clock className="h-4 w-4 mr-2" /> Add time
                      </button>
                    ) : (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label className={labelClass}>Time Start</Label>
                          <Input type="time" value={taskData.timeStart} onChange={(e) => setTaskData(prev => ({...prev, timeStart: e.target.value}))} className={inputClass} disabled={isSaving} />
                        </div>
                        <div className="space-y-2">
                          <Label className={labelClass}>Time Stop</Label>
                          <Input 
                            type="time" 
                            value={taskData.timeStop} 
                            onChange={(e) => { 
                              setTaskData(prev => ({...prev, timeStop: e.target.value}))
                              if (touched.timeStop) { setErrors(prev => ({ ...prev, timeStop: validateTaskField('timeStop', e.target.value) })) }
                            }} 
                            onBlur={() => handleBlur('timeStop')} 
                            className={`${inputClass} ${touched.timeStop && errors.timeStop ? invalidInputClass : ''}`}
                            disabled={isSaving} 
                          />
                          <ErrorMessage field="timeStop" />
                        </div>
                      </div>
                    )}

                    {!showDescription ? (
                      <button type="button" onClick={() => setShowDescription(true)} className={actionButtonClass} disabled={isSaving}>
                        <FileText className="h-4 w-4 mr-2" /> Add additional remark
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <Label className={labelClass}>Additional Remark</Label>
                        <Textarea value={taskData.additionalRemark} onChange={(e) => setTaskData(prev => ({...prev, additionalRemark: e.target.value}))} placeholder="Enter any additional remarks..." className={`${inputClass} min-h-[80px]`} disabled={isSaving} />
                      </div>
                    )}

                    {/* PIC */}
                    <div className="space-y-2">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <Label className="flex items-center font-medium text-gray-700">
                          <Users className="mr-2 h-4 w-4 text-gray-500" />Task PIC <span className={requiredClass}>*</span>
                        </Label>
                      </div>
                      {loadingStaff ? (
                        <div className="flex items-center space-x-2 border border-gray-300 rounded-md p-2">
                          <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                          <span className="text-sm text-gray-500">Loading staff...</span>
                        </div>
                      ) : (
                        <Select 
                          value={taskData.task_pic_id} 
                          onValueChange={(value) => { 
                            const selectedStaff = staffList.find(s => s.id === value)
                            setTaskData(prev => {
                              const normalized = normalizeSupportSelection(prev.task_support_ids, value, prev.task_support_names, prev.task_support_colors, 'blue')
                              return {
                                ...prev,
                                task_pic_id: value,
                                task_pic_name: selectedStaff?.name || '',
                                task_pic_color: selectedStaff?.color || 'blue',
                                task_support_ids: normalized.ids,
                                task_support_names: normalized.names,
                                task_support_colors: normalized.colors,
                              }
                            })
                            if (touched.task_pic_id) { setErrors(prev => ({ ...prev, task_pic_id: validateTaskField('task_pic_id', value) })) }
                          }} 
                          onOpenChange={() => handleBlur('task_pic_id')} 
                          disabled={isSaving}
                        >
                          <SelectTrigger className={`${inputClass} ${touched.task_pic_id && errors.task_pic_id ? invalidInputClass : ''}`}>
                            <SelectValue placeholder="Select main PIC" />
                          </SelectTrigger>
                          <SelectContent
                            className="max-h-[45vh] overflow-hidden border border-gray-200 bg-white shadow-lg"
                            viewportClassName="h-auto max-h-52 overflow-y-auto overscroll-contain"
                          >
                            {staffList.map((staff) => (
                              <SelectItem key={staff.id} value={staff.id} className="hover:bg-gray-100 text-gray-900">
                                <div className="flex items-center gap-2">
                                  <div className={`w-3 h-3 rounded-full ${getDotClass(staff.color || 'blue')}`} />
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
                        <div className="mt-2 flex items-center gap-2 text-sm text-gray-700">
                          <div className={`w-3 h-3 rounded-full ${getDotClass(taskData.task_pic_color || 'blue')}`} />
                          <span>Selected: {taskData.task_pic_name}</span>
                        </div>
                      )}
                    </div>

                    {/* Support Staff */}
                    {!showSupport ? (
                      <button type="button" onClick={() => setShowSupport(true)} className={actionButtonClass} disabled={isSaving}>
                        <UserPlus className="h-4 w-4 mr-2" /> Add Support Staff (Optional)
                      </button>
                    ) : (
                      <div className={fieldPanelClass}>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <Label className="flex items-center font-medium text-gray-700">
                            <Users className="mr-2 h-4 w-4 text-gray-500" />Task Support Staff
                          </Label>
                          <Button type="button" variant="ghost" size="sm" onClick={() => setShowSupport(false)} className="h-6 w-6 p-0" disabled={isSaving}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        {loadingStaff ? (
                          <div className="flex items-center justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-gray-500" /></div>
                        ) : (
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {staffList.filter(staff => staff.id !== taskData.task_pic_id).map((staff) => (
                              <div key={staff.id} className="flex min-w-0 items-center space-x-2">
                                <Checkbox className="staff-support-checkbox" id={`task-support-${staff.id}`} checked={taskData.task_support_ids.includes(staff.id)} onCheckedChange={() => handleTaskSupportToggle(staff.id)} disabled={isSaving} />
                                <label htmlFor={`task-support-${staff.id}`} className="flex min-w-0 cursor-pointer items-center gap-1 text-sm text-gray-700">
                                  <div className={`h-2 w-2 flex-shrink-0 rounded-full ${getDotClass(staff.color || 'blue')}`} />
                                  <span className="truncate">{staff.name}</span>
                                </label>
                              </div>
                            ))}
                          </div>
                        )}
                        {taskData.task_support_names && taskData.task_support_names.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-700">
                            {taskData.task_support_names.map((name, index) => (
                              <span key={index} className="inline-flex items-center gap-1">
                                <div className={`w-2 h-2 rounded-full ${getDotClass(taskData.task_support_colors?.[index] || 'blue')}`} />
                                {name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Final Report Number */}
                    {!showFinalReport ? (
                      <button type="button" onClick={() => setShowFinalReport(true)} className={`${actionButtonClass} mt-2`} disabled={isSaving}>
                        <FileText className="h-4 w-4 mr-2" /> Add Final Report Number
                      </button>
                    ) : (
                      <div className="space-y-4 border-t border-gray-200 pt-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <h4 className="text-sm font-semibold text-gray-800 flex items-center">
                            <FileText className="mr-2 h-4 w-4 text-gray-500" />Final Report Number
                          </h4>
                          <div className="flex gap-2">
                            <Button type="button" variant="ghost" size="sm" onClick={() => setShowFinalReport(false)} className="h-6 w-6 p-0 text-gray-500" disabled={isSaving}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        
                        <Input
                          value={taskData.finalReportNumber}
                          onChange={(e) => {
                            const value = normalizeFinalReportNumber(e.target.value)
                            setTaskData(prev => ({ ...prev, finalReportNumber: value }))
                            if (touched.finalReportNumber) {
                              setErrors(prev => ({ ...prev, finalReportNumber: validateTaskField('finalReportNumber', value) }))
                            }
                          }}
                          onBlur={() => handleBlur('finalReportNumber')}
                          placeholder={getFinalReportNumberExample(taskData.jobTask)}
                          className={`${inputClass} ${touched.finalReportNumber && errors.finalReportNumber ? invalidInputClass : ''}`}
                          disabled={isSaving}
                        />
                        <ErrorMessage field="finalReportNumber" />
                      </div>
                    )}
                  </>
                )}

                {activeTab === 'event' && (
                  <>
                    <div className="space-y-2">
                      <Label className={labelClass}>Title <span className={requiredClass}>*</span></Label>
                      <Input 
                        value={eventData.title} 
                        onChange={(e) => { 
                          setEventData(prev => ({...prev, title: e.target.value}))
                          if (touched.title) { setErrors(prev => ({ ...prev, title: validateEventField('title', e.target.value) })) }
                        }} 
                        onBlur={() => handleBlur('title')} 
                        placeholder="Enter event title" 
                        className={`${inputClass} ${touched.title && errors.title ? invalidInputClass : ''}`}
                        disabled={isSaving} 
                        autoFocus 
                      />
                      <ErrorMessage field="title" />
                    </div>
                    
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label className={labelClass}>Date Start <span className={requiredClass}>*</span></Label>
                        <Input 
                          type="date" 
                          value={eventData.dateStart} 
                          onChange={(e) => { 
                            setEventData(prev => ({...prev, dateStart: e.target.value}))
                            if (touched.dateStart) { setErrors(prev => ({ ...prev, dateStart: validateEventField('dateStart', e.target.value) })) }
                          }} 
                          onBlur={() => handleBlur('dateStart')} 
                          className={`${inputClass} ${touched.dateStart && errors.dateStart ? invalidInputClass : ''}`}
                          disabled={isSaving} 
                        />
                        <ErrorMessage field="dateStart" />
                      </div>
                      <div className="space-y-2">
                        <Label className={labelClass}>Date Stop (Optional)</Label>
                        <Input 
                          type="date" 
                          value={eventData.dateStop} 
                          onChange={(e) => { 
                            setEventData(prev => ({...prev, dateStop: e.target.value}))
                            if (touched.dateStop) { setErrors(prev => ({ ...prev, dateStop: validateEventField('dateStop', e.target.value) })) }
                          }} 
                          onBlur={() => handleBlur('dateStop')} 
                          className={`${inputClass} ${touched.dateStop && errors.dateStop ? invalidInputClass : ''}`}
                          disabled={isSaving} 
                        />
                        <ErrorMessage field="dateStop" />
                      </div>
                    </div>

                    {!showTime ? (
                      <button type="button" onClick={() => setShowTime(true)} className={actionButtonClass} disabled={isSaving}>
                        <Clock className="h-4 w-4 mr-2" /> Add time
                      </button>
                    ) : (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label className={labelClass}>Time Start</Label>
                          <Input type="time" value={eventData.timeStart} onChange={(e) => setEventData(prev => ({...prev, timeStart: e.target.value}))} className={inputClass} disabled={isSaving} />
                        </div>
                        <div className="space-y-2">
                          <Label className={labelClass}>Time Stop</Label>
                          <Input 
                            type="time" 
                            value={eventData.timeStop} 
                            onChange={(e) => { 
                              setEventData(prev => ({...prev, timeStop: e.target.value}))
                              if (touched.timeStop) { setErrors(prev => ({ ...prev, timeStop: validateEventField('timeStop', e.target.value) })) }
                            }} 
                            onBlur={() => handleBlur('timeStop')} 
                            className={`${inputClass} ${touched.timeStop && errors.timeStop ? invalidInputClass : ''}`}
                            disabled={isSaving} 
                          />
                          <ErrorMessage field="timeStop" />
                        </div>
                      </div>
                    )}

                    {!showDescription ? (
                      <button type="button" onClick={() => setShowDescription(true)} className={actionButtonClass} disabled={isSaving}>
                        <FileText className="h-4 w-4 mr-2" /> Add description
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <Label className={labelClass}>Description</Label>
                        <Textarea value={eventData.description} onChange={(e) => setEventData(prev => ({...prev, description: e.target.value}))} placeholder="Enter description" className={`${inputClass} min-h-[80px]`} disabled={isSaving} />
                      </div>
                    )}
                    
                    {/* Event PIC */}
                    <div className="space-y-2">
                      <Label className="flex items-center font-medium text-gray-900">
                        <Users className="mr-2 h-4 w-4 text-gray-500" />Event PIC <span className={requiredClass}>*</span>
                      </Label>
                      {loadingStaff ? (
                        <div className="flex items-center space-x-2 rounded-md border border-gray-300 p-2">
                          <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                          <span className="text-sm text-gray-500">Loading staff...</span>
                        </div>
                      ) : (
                        <>
                          <Select
                            value={eventData.event_pic_id}
                            onValueChange={(value) => {
                              const selectedStaff = staffList.find(s => s.id === value)
                              setEventData(prev => {
                                const normalized = normalizeSupportSelection(prev.event_support_ids, value, prev.event_support_names, prev.event_support_colors, 'purple')
                                return {
                                  ...prev,
                                  event_pic_id: value,
                                  event_pic_name: selectedStaff?.name || '',
                                  event_pic_color: selectedStaff?.color || 'purple',
                                  event_support_ids: normalized.ids,
                                  event_support_names: normalized.names,
                                  event_support_colors: normalized.colors,
                                }
                              })
                              if (touched.event_pic_id && errors.event_pic_id) {
                                setErrors(prev => ({ ...prev, event_pic_id: '' }))
                              }
                            }}
                            onOpenChange={() => handleBlur('event_pic_id')}
                            disabled={isSaving}
                          >
                            <SelectTrigger className={`${inputClass} ${touched.event_pic_id && errors.event_pic_id ? invalidInputClass : ''}`}>
                              <SelectValue placeholder="Select main PIC" />
                            </SelectTrigger>
                            <SelectContent
                              className="max-h-[45vh] overflow-hidden border border-gray-200 bg-white shadow-lg"
                              viewportClassName="h-auto max-h-52 overflow-y-auto overscroll-contain"
                            >
                              {staffList.map((staff) => (
                                <SelectItem key={staff.id} value={staff.id} className="text-gray-900 hover:bg-gray-100">
                                  <div className="flex items-center gap-2">
                                    <div className={`h-3 w-3 rounded-full ${getDotClass(staff.color || 'purple')}`} />
                                    <span>{staff.name}</span>
                                  </div>
                                </SelectItem>
                              ))}
                              {staffList.length === 0 && <div className="px-2 py-3 text-center text-sm text-gray-500">No staff found.</div>}
                            </SelectContent>
                          </Select>
                          <ErrorMessage field="event_pic_id" />
                        </>
                      )}
                      {eventData.event_pic_name && (
                        <div className="mt-2 flex items-center gap-2 text-sm text-gray-700">
                          <div className={`h-3 w-3 rounded-full ${getDotClass(eventData.event_pic_color || 'purple')}`} />
                          <span>Selected: {eventData.event_pic_name}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Event Support Staff */}
                    {!showEventSupport ? (
                      <button type="button" onClick={() => setShowEventSupport(true)} className={actionButtonClass} disabled={isSaving}>
                        <UserPlus className="h-4 w-4 mr-2" /> Add Support Staff (Optional)
                      </button>
                    ) : (
                      <div className={fieldPanelClass}>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <Label className="flex items-center font-medium text-gray-700">
                            <Users className="mr-2 h-4 w-4 text-gray-500" />Event Support Staff
                          </Label>
                          <Button type="button" variant="ghost" size="sm" onClick={() => setShowEventSupport(false)} className="h-6 w-6 p-0" disabled={isSaving}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        {loadingStaff ? (
                          <div className="flex items-center justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-gray-500" /></div>
                        ) : (
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {staffList.filter(staff => staff.id !== eventData.event_pic_id).map((staff) => (
                              <div key={staff.id} className="flex min-w-0 items-center space-x-2">
                                <Checkbox className="staff-support-checkbox" id={`event-support-${staff.id}`} checked={eventData.event_support_ids.includes(staff.id)} onCheckedChange={() => handleEventSupportToggle(staff.id)} disabled={isSaving} />
                                <label htmlFor={`event-support-${staff.id}`} className="flex min-w-0 cursor-pointer items-center gap-1 text-sm text-gray-700">
                                  <div className={`h-2 w-2 flex-shrink-0 rounded-full ${getDotClass(staff.color || 'purple')}`} />
                                  <span className="truncate">{staff.name}</span>
                                </label>
                              </div>
                            ))}
                          </div>
                        )}
                        {eventData.event_support_names && eventData.event_support_names.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-700">
                            {eventData.event_support_names.map((name, index) => (
                              <span key={index} className="inline-flex items-center gap-1">
                                <div className={`w-2 h-2 rounded-full ${getDotClass(eventData.event_support_colors?.[index] || 'purple')}`} />
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

              <CardFooter className="shrink-0 flex flex-col gap-3 border-t border-gray-200 bg-gray-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                  {selectedItem && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleDelete}
                      disabled={isSaving}
                      className="w-full border border-red-700 bg-red-600 text-white shadow-sm hover:bg-red-700 disabled:border-red-300 disabled:bg-red-300 disabled:text-white disabled:opacity-80 sm:w-auto"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />Delete
                    </Button>
                  )}
                  <Button type="button" variant="outline" size="sm" onClick={() => { resetForm(); onClose() }} disabled={isSaving} className="w-full sm:w-auto">
                    <X className="h-4 w-4 mr-2" />Cancel
                  </Button>
                </div>
                <Button 
                  type="submit" 
                  size="sm" 
                  className={`w-full sm:w-auto ${activeTab === 'event' ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
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

      <AlertDialog open={showDeleteConfirmDialog} onOpenChange={setShowDeleteConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedType === 'event' ? 'Event' : 'Task'}?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this {selectedType === 'event' ? 'event' : 'task'}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                confirmDelete()
              }}
              disabled={isSaving}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {isSaving ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-3 sm:p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
              <Bell className="mr-2 h-5 w-5 text-blue-600" />
              {getConfirmTitle()}
            </h3>
            <p className="text-gray-600 mb-4">{getConfirmMessage()}</p>
            <div className="bg-gray-50 p-4 rounded-lg mb-4 space-y-3">
              <div className="text-sm">
                <span className="font-medium text-gray-700">PIC (Main):</span>{' '}
                <span className="text-gray-900 flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${getDotClass(staffDetails.picColor || (activeTab === 'event' ? 'purple' : 'blue'))}`} />
                  {staffDetails.picName || 'Not selected'}
                </span>
              </div>
              {staffDetails.supportNames && staffDetails.supportNames.length > 0 && (
                <div className="text-sm">
                  <span className="font-medium text-gray-700">Support Staff:</span>
                  <ul className="mt-1 ml-4 list-disc space-y-1">
                    {staffDetails.supportNames.map((name: string, index: number) => (
                      <li key={index} className="text-gray-900 flex items-center gap-1">
                        <div className={`w-2 h-2 rounded-full ${getDotClass(staffDetails.supportColors?.[index] || (activeTab === 'event' ? 'purple' : 'blue'))}`} />
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
            <div className="flex flex-col justify-end gap-2 sm:flex-row">
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
