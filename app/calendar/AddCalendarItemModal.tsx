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
import { uploadPDF, deletePDF } from '@/lib/pdf-service'

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
    taskPicId?: string
    taskPicName?: string
    taskPicColor?: string
    pdfJobOrderPath?: string
    pdfJobOrderUrl?: string
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

// ========== AUTO-COMPUTE TASK STATUS ==========
const computeTaskStatus = (data: {
  dateStart: string | null
  dateStop: string | null
  pdfJobOrderPath: string | null
  pdfFinalReportPath: string | null
}) => {
  // ONHOLD: No date assigned (task in inbox)
  if (!data.dateStart) return 'onhold'
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const dueDate = data.dateStop ? new Date(data.dateStop) : new Date(data.dateStart)
  dueDate.setHours(0, 0, 0, 0)
  
  const isDueDatePassed = dueDate < today
  const hasJobOrder = !!data.pdfJobOrderPath
  const hasFinalReport = !!data.pdfFinalReportPath
  
  // COMPLETED: Both Job Order AND Final Report uploaded
  if (hasJobOrder && hasFinalReport) return 'completed'
  
  // INCOMPLETE: Due date passed AND files not complete
  if (isDueDatePassed && (!hasJobOrder || !hasFinalReport)) return 'incomplete'
  
  // IN-PROGRESS: Has date, not overdue, files may be partial
  return 'in-progress'
}

// Status badge colors for display
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
  pdfJobOrder: null as File | null,
  pdfJobOrderPath: '',
  pdfJobOrderUrl: '', 
  task_pic_id: '',            
  task_support_ids: [] as string[],  
  pdfFinalReport: null as File | null,
  pdfFinalReportPath: '',
  pdfFinalReportUrl: '',
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
  onSuccess,
  onSave,
  onDelete
}: AddCalendarItemModalProps) {
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

  const [jobOrderPreviewUrl, setJobOrderPreviewUrl] = useState<string | null>(null)
  const [finalReportPreviewUrl, setFinalReportPreviewUrl] = useState<string | null>(null)
  const [showJobOrderPreview, setShowJobOrderPreview] = useState(false)
  const [showFinalReportPreview, setShowFinalReportPreview] = useState(false)
  
  const [tempJobOrderFile, setTempJobOrderFile] = useState<File | null>(null)
  const [tempFinalReportFile, setTempFinalReportFile] = useState<File | null>(null)

  const initialLoadDone = useRef(false)

  // Get current computed status for display
  const getCurrentTaskStatus = useCallback(() => {
    return computeTaskStatus({
      dateStart: taskData.dateStart || null,
      dateStop: taskData.dateStop || null,
      pdfJobOrderPath: taskData.pdfJobOrderPath || null,
      pdfFinalReportPath: taskData.pdfFinalReportPath || null,
    })
  }, [taskData.dateStart, taskData.dateStop, taskData.pdfJobOrderPath, taskData.pdfFinalReportPath])

  const getNextRunningNumber = useCallback(async (date: Date) => {
    const year = date.getFullYear().toString().slice(-2)
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const prefix = `JOB${year}${month}`
    
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('running_number')
        .like('running_number', `${prefix}%`)
        .order('running_number', { ascending: false })
        .limit(1)
      
      if (error) throw error
      
      let nextNumber = 1
      if (data && data.length > 0) {
        const lastNumber = data[0].running_number
        const lastSeq = parseInt(lastNumber.slice(-3))
        if (!isNaN(lastSeq)) {
          nextNumber = lastSeq + 1
        }
      }
      
      const seq = nextNumber.toString().padStart(3, '0')
      return `${prefix}${seq}`
      
    } catch (error) {
      console.error('Error getting next running number:', error)
      return `${prefix}001`
    }
  }, [supabase])

  const sendTaskNotifications = async (data: any, taskId: string, action: 'created' | 'updated' = 'created') => {
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
      
      const notifications = users.map ((user: { id: string; name: string }) => {
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
  }

  const sendEventNotifications = async (data: any, eventId: string, action: 'created' | 'updated' = 'created') => {
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
      
      const notifications = users.map ((user: { id:string; name: string })=> {
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
  }

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
    
    if (jobOrderPreviewUrl) {
      URL.revokeObjectURL(jobOrderPreviewUrl)
      setJobOrderPreviewUrl(null)
    }
    if (finalReportPreviewUrl) {
      URL.revokeObjectURL(finalReportPreviewUrl)
      setFinalReportPreviewUrl(null)
    }
    setShowJobOrderPreview(false)
    setShowFinalReportPreview(false)
    setTempJobOrderFile(null)
    setTempFinalReportFile(null)
  }, [jobOrderPreviewUrl, finalReportPreviewUrl])

  const fetchJobTasks = async () => {
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
  }

  const fetchStaff = async () => {
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
  }

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
      pdfJobOrder: null,
      pdfJobOrderPath: item.pdf_job_order_path || '',
      pdfJobOrderUrl: item.pdf_job_order_url || '',
      task_pic_id: item.task_pic_id || '',
      task_support_ids: taskSupportIdsArray,
      pdfFinalReport: null,
      pdfFinalReportPath: item.pdf_final_report_path || '',
      pdfFinalReportUrl: item.pdf_final_report_url || '',
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
    setShowFinalReport(!!(item.pdf_final_report_path))
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
        setTaskData(prev => ({ ...prev, dateStart: dateStr, dateStop: '' }))
        
        if (activeTab === 'task') {
          const runningNum = await getNextRunningNumber(selectedDate)
          setTaskData(prev => ({ ...prev, runningNumber: runningNum }))
        }
      }
      
      initialLoadDone.current = true
    }
    
    loadData()
    
    return () => {
      resetForm()
      initialLoadDone.current = false
    }
  }, [isOpen, selectedItem, selectedDate, selectedType, activeTab, getNextRunningNumber, populateEventForm, populateTaskForm, resetForm])

  if (!isOpen) return null

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
      case 'task_pic_id':
        if (!value) return 'PIC Staff is required'
        break
      // REMOVED: dateStart validation - now OPTIONAL
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
    const picStaffError = validateTaskField('task_pic_id', taskData.task_pic_id)
    if (picStaffError) newErrors.task_pic_id = picStaffError
    // REMOVED: dateStart validation
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
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'JobOrder' | 'FinalReport') => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      
      if (file.type !== 'application/pdf') {
        toast({ title: "Invalid File", description: "Only PDF files are allowed", variant: "destructive" })
        return
      }
      
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: "File Too Large", description: "File size cannot exceed 10MB", variant: "destructive" })
        return
      }
      
      if (field === 'JobOrder' && jobOrderPreviewUrl) URL.revokeObjectURL(jobOrderPreviewUrl)
      if (field === 'FinalReport' && finalReportPreviewUrl) URL.revokeObjectURL(finalReportPreviewUrl)
      
      const previewUrl = URL.createObjectURL(file)
      
      if (field === 'JobOrder') {
        setJobOrderPreviewUrl(previewUrl)
        setTempJobOrderFile(file)
        setShowJobOrderPreview(true)
      } else {
        setFinalReportPreviewUrl(previewUrl)
        setTempFinalReportFile(file)
        setShowFinalReportPreview(true)
      }
    }
  }

  const handleRemoveTempFile = (field: 'JobOrder' | 'FinalReport') => {
    if (field === 'JobOrder') {
      if (jobOrderPreviewUrl) { URL.revokeObjectURL(jobOrderPreviewUrl); setJobOrderPreviewUrl(null) }
      setTempJobOrderFile(null)
      setShowJobOrderPreview(false)
    } else {
      if (finalReportPreviewUrl) { URL.revokeObjectURL(finalReportPreviewUrl); setFinalReportPreviewUrl(null) }
      setTempFinalReportFile(null)
      setShowFinalReportPreview(false)
    }
  }

  const handleRemoveExistingFile = async (field: 'JobOrder' | 'FinalReport') => {
    if (!confirm(`Remove this ${field === 'JobOrder' ? 'Job Order' : 'Final Report'} PDF?`)) return
    
    if (field === 'JobOrder') {
      if (taskData.pdfJobOrderPath) {
        try { await deletePDF(taskData.pdfJobOrderPath) } catch (error) { console.error('Failed to delete PDF:', error) }
      }
      setTaskData(prev => ({ ...prev, pdfJobOrderPath: '', pdfJobOrderUrl: '', pdfJobOrder: null }))
    } else {
      if (taskData.pdfFinalReportPath) {
        try { await deletePDF(taskData.pdfFinalReportPath) } catch (error) { console.error('Failed to delete PDF:', error) }
      }
      setTaskData(prev => ({ ...prev, pdfFinalReportPath: '', pdfFinalReportUrl: '', pdfFinalReport: null }))
    }
    
    toast({ title: "File Removed", description: "PDF file has been removed" })
  }

  // ========== HANDLE REMOVE DATE - move task to inbox ==========
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
          // ============ TASK SAVE ============
          const runningNumber = taskData.runningNumber
          if (!runningNumber) throw new Error("Running number not generated")

          let pdfJobOrderPath = taskData.pdfJobOrderPath
          let pdfJobOrderUrl = taskData.pdfJobOrderUrl
          let pdfFinalReportPath = taskData.pdfFinalReportPath
          let pdfFinalReportUrl = taskData.pdfFinalReportUrl

          const jobOrderFileToUpload = tempJobOrderFile || taskData.pdfJobOrder
          const finalReportFileToUpload = tempFinalReportFile || taskData.pdfFinalReport

          if (jobOrderFileToUpload) {
            if (selectedItem && taskData.pdfJobOrderPath) {
              try { await deletePDF(taskData.pdfJobOrderPath) } catch (error) { console.error('Failed to delete old job order PDF:', error) }
            }
            
            const uploadResult = await uploadPDF(jobOrderFileToUpload, 'task-job-orders', `task_${selectedItem?.id || 'new'}_${Date.now()}`)
            if (uploadResult) {
              pdfJobOrderPath = uploadResult.path
              pdfJobOrderUrl = uploadResult.publicUrl
            } else {
              throw new Error("Failed to upload Job Order PDF")
            }
          }

          if (finalReportFileToUpload) {
            if (selectedItem && taskData.pdfFinalReportPath) {
              try { await deletePDF(taskData.pdfFinalReportPath) } catch (error) { console.error('Failed to delete old final report PDF:', error) }
            }
            
            const uploadResult = await uploadPDF(finalReportFileToUpload, 'task-final-reports', `task_${selectedItem?.id || 'new'}_${Date.now()}`)
            if (uploadResult) {
              pdfFinalReportPath = uploadResult.path
              pdfFinalReportUrl = uploadResult.publicUrl
            } else {
              throw new Error("Failed to upload Final Report PDF")
            }
          }

          // ========== AUTO-COMPUTE STATUS (handles empty date = onhold) ==========
          const computedStatus = computeTaskStatus({
            dateStart: taskData.dateStart || null,
            dateStop: taskData.dateStop || null,
            pdfJobOrderPath: pdfJobOrderPath || null,
            pdfFinalReportPath: pdfFinalReportPath || null,
          })

          const dataToSave = {
            client_name: taskData.clientName,
            running_number: runningNumber,
            job_task: taskData.jobTask || 'General Task',
            date_start: taskData.dateStart || null,  // ← Can be NULL
            date_stop: taskData.dateStop || null,
            time_start: taskData.timeStart || '',
            time_stop: taskData.timeStop || '',
            additional_remark: taskData.additionalRemark || '',
            pdf_job_order_path: pdfJobOrderPath || null,
            pdf_job_order_url: pdfJobOrderUrl || null,
            task_pic_id: taskData.task_pic_id || null,
            task_pic_name: taskData.task_pic_name || '',
            task_pic_color: taskData.task_pic_color || '',
            task_support_ids: taskData.task_support_ids.length > 0 ? taskData.task_support_ids.join(',') : null,
            task_support_names: taskData.task_support_names.length > 0 ? taskData.task_support_names.join(',') : null,
            task_support_colors: taskData.task_support_colors.length > 0 ? taskData.task_support_colors.join(',') : null,
            pdf_final_report_path: pdfFinalReportPath || null,
            pdf_final_report_url: pdfFinalReportUrl || null,
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

          if (jobOrderPreviewUrl) { URL.revokeObjectURL(jobOrderPreviewUrl); setJobOrderPreviewUrl(null) }
          if (finalReportPreviewUrl) { URL.revokeObjectURL(finalReportPreviewUrl); setFinalReportPreviewUrl(null) }

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
    
    const confirmDelete = window.confirm(`Are you sure you want to delete this ${selectedType}? This will also delete all associated PDF files.`)
    if (!confirmDelete) return
    
    setIsSaving(true)
    
    try {
      if (selectedType === 'task') {
        if (selectedItem.pdf_job_order_path) {
          try { await deletePDF(selectedItem.pdf_job_order_path) } catch (error) { console.error('Failed to delete job order PDF:', error) }
        }
        if (selectedItem.pdf_final_report_path) {
          try { await deletePDF(selectedItem.pdf_final_report_path) } catch (error) { console.error('Failed to delete final report PDF:', error) }
        }
      }
      
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
                <button type="button" onClick={() => { setActiveTab('event'); setErrors({}); setTouched({}) }} disabled={isSaving}
                  className={`pb-1 px-1 text-sm font-medium transition-colors relative flex items-center space-x-2 ${
                    activeTab === 'event' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500 hover:text-gray-700'
                  } ${isSaving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                  <CalendarCheck className="h-4 w-4" />
                  <span>Event</span>
                </button>
                <button type="button" onClick={() => { setActiveTab('task'); setErrors({}); setTouched({}) }} disabled={isSaving}
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
                    {/* Auto-status display (read-only) */}
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

                    <div className="space-y-2">
                      <Label className="text-gray-700 font-medium">Running Number</Label>
                      <Input value={taskData.runningNumber} placeholder="Loading..." className="border-gray-300 bg-gray-50 font-mono text-sm" disabled={true} readOnly />
                      <p className="text-xs text-gray-500">Format: JOB + Year(2 digits) + Month(2 digits) + Number(001) - Resets every month</p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-gray-700 font-medium">Job Task</Label>
                      {loadingTasks ? (
                        <div className="flex items-center space-x-2 border border-gray-300 rounded-md p-2">
                          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                          <span className="text-sm text-gray-500">Loading job tasks...</span>
                        </div>
                      ) : (
                        <Select 
                          value={taskData.jobTask || "none"} 
                          onValueChange={(value) => { 
                            setTaskData(prev => ({...prev, jobTask: value === "none" ? "" : value}))
                            if (touched.jobTask) { 
                              const error = validateTaskField('jobTask', value)
                              setErrors(prev => ({ ...prev, jobTask: error }))
                            } 
                          }} 
                          onOpenChange={() => handleBlur('jobTask')} 
                          disabled={isSaving}
                        >
                          <SelectTrigger className={`bg-white border-gray-300 ${touched.jobTask && errors.jobTask ? 'border-red-500' : ''}`}>
                            <SelectValue placeholder="Select job task" />
                          </SelectTrigger>
                          <SelectContent className="bg-white border border-gray-200 shadow-lg max-h-80">
                            <SelectItem value="none" className="hover:bg-gray-100 text-gray-900 italic">None</SelectItem>
                            {jobTasks.map((task) => (
                              <SelectItem key={task.id} value={task.name} className="hover:bg-gray-100 text-gray-900">
                                <span>{task.name}</span>
                              </SelectItem>
                            ))}
                            {jobTasks.length === 0 && (
                              <div className="px-2 py-3 text-sm text-gray-500 text-center">No job tasks found.</div>
                            )}
                          </SelectContent>
                        </Select>
                      )}
                      <ErrorMessage field="jobTask" />
                    </div>

                    {/* DATE SECTION - with Remove Date button */}
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
                          PDF File (Job Order)
                        </div>
                        {(taskData.pdfJobOrderUrl || jobOrderPreviewUrl) && (
                          <div className="flex gap-2">
                            <Button type="button" variant="ghost" size="sm" onClick={() => setShowJobOrderPreview(true)} className="text-blue-600">
                              <Eye className="h-4 w-4 mr-1" /> Preview
                            </Button>
                            {taskData.pdfJobOrderUrl && !tempJobOrderFile && (
                              <Button type="button" variant="ghost" size="sm" onClick={() => window.open(taskData.pdfJobOrderUrl, '_blank')} className="text-green-600">
                                <ExternalLink className="h-4 w-4 mr-1" /> Open
                              </Button>
                            )}
                          </div>
                        )}
                      </h4>
                      
                      {taskData.pdfJobOrderPath && taskData.pdfJobOrderUrl && !tempJobOrderFile && (
                        <div className="mb-2 p-3 bg-blue-50 rounded border border-blue-200">
                          <p className="text-blue-700 flex items-center justify-between">
                            <span className="flex items-center"><FileText className="h-4 w-4 mr-2" />Current: PDF attached</span>
                            <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveExistingFile('JobOrder')} className="text-red-600 hover:text-red-700 hover:bg-red-50" disabled={isSaving}>
                              <X className="h-4 w-4 mr-1" /> Remove
                            </Button>
                          </p>
                        </div>
                      )}
                      
                      {tempJobOrderFile && (
                        <div className="mb-2 p-3 bg-yellow-50 rounded border border-yellow-200">
                          <p className="text-yellow-700 flex items-center justify-between">
                            <span className="flex items-center"><FileText className="h-4 w-4 mr-2" />New file ready: {tempJobOrderFile.name}</span>
                            <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveTempFile('JobOrder')} className="text-red-600 hover:text-red-700 hover:bg-red-50" disabled={isSaving}>
                              <X className="h-4 w-4 mr-1" /> Remove
                            </Button>
                          </p>
                        </div>
                      )}
                      
                      <Input type="file" accept=".pdf" onChange={(e) => handleFileChange(e, 'JobOrder')} className="border-gray-300 bg-white" disabled={isSaving} />
                      <p className="text-xs text-gray-500 mt-1">📎 Upload job order PDF (max 10MB, PDF only)</p>
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
                            <FileText className="h-4 w-4 mr-2 text-green-600" />PDF File (Final Report)
                          </h4>
                          <div className="flex gap-2">
                            {(taskData.pdfFinalReportUrl || finalReportPreviewUrl) && (
                              <Button type="button" variant="ghost" size="sm" onClick={() => setShowFinalReportPreview(true)} className="text-blue-600">
                                <Eye className="h-4 w-4 mr-1" /> Preview
                              </Button>
                            )}
                            {taskData.pdfFinalReportUrl && !tempFinalReportFile && (
                              <Button type="button" variant="ghost" size="sm" onClick={() => window.open(taskData.pdfFinalReportUrl, '_blank')} className="text-green-600">
                                <ExternalLink className="h-4 w-4 mr-1" /> Open
                              </Button>
                            )}
                            <Button type="button" variant="ghost" size="sm" onClick={() => setShowFinalReport(false)} className="h-6 w-6 p-0 text-gray-500" disabled={isSaving}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        
                        {taskData.pdfFinalReportPath && taskData.pdfFinalReportUrl && !tempFinalReportFile && (
                          <div className="p-3 bg-green-50 rounded border border-green-200">
                            <p className="text-green-700 flex items-center justify-between">
                              <span className="flex items-center"><FileText className="h-4 w-4 mr-2" />Current: Final Report PDF</span>
                              <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveExistingFile('FinalReport')} className="text-red-600 hover:text-red-700 hover:bg-red-50" disabled={isSaving}>
                                <X className="h-4 w-4 mr-1" /> Remove
                              </Button>
                            </p>
                          </div>
                        )}
                        
                        {tempFinalReportFile && (
                          <div className="p-3 bg-yellow-50 rounded border border-yellow-200">
                            <p className="text-yellow-700 flex items-center justify-between">
                              <span className="flex items-center"><FileText className="h-4 w-4 mr-2" />New file ready: {tempFinalReportFile.name}</span>
                              <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveTempFile('FinalReport')} className="text-red-600 hover:text-red-700 hover:bg-red-50" disabled={isSaving}>
                                <X className="h-4 w-4 mr-1" /> Remove
                              </Button>
                            </p>
                          </div>
                        )}
                        
                        <Input type="file" accept=".pdf" onChange={(e) => handleFileChange(e, 'FinalReport')} className="border-gray-300 bg-white" disabled={isSaving} />
                        <p className="text-xs text-gray-500">📎 Upload final report PDF (max 10MB, PDF only)</p>
                      </div>
                    )}
                  </>
                )}

                {activeTab === 'event' && (
                  // Event form (date is required for events)
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
                <Button type="submit" size="sm" className={activeTab === 'event' ? 'bg-purple-300 hover:bg-purple-300' : 'bg-blue-300 hover:bg-blue-300'} disabled={isSaving}>
                  {isSaving ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>) : (<><Save className="h-4 w-4 mr-2" />Save</>)}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>

      {/* PDF Preview - Job Order */}
      {showJobOrderPreview && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Preview: {tempJobOrderFile?.name || 'Job Order PDF'}</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowJobOrderPreview(false)}><X className="h-4 w-4" /></Button>
            </div>
            <div className="flex-1 p-4 overflow-auto bg-gray-100">
              {(jobOrderPreviewUrl || taskData.pdfJobOrderUrl) ? (
                <div className="w-full h-[70vh]">
                  <embed src={jobOrderPreviewUrl || taskData.pdfJobOrderUrl} type="application/pdf" className="w-full h-full" />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[70vh] text-gray-500">
                  <FileText className="h-16 w-16 mb-4" />
                  <p>No PDF file to preview</p>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <Button variant="outline" onClick={() => setShowJobOrderPreview(false)}>Close</Button>
              {jobOrderPreviewUrl && <Button onClick={() => window.open(jobOrderPreviewUrl, '_blank')}>Open in New Tab</Button>}
            </div>
          </div>
        </div>
      )}

      {/* PDF Preview - Final Report */}
      {showFinalReportPreview && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Preview: {tempFinalReportFile?.name || 'Final Report PDF'}</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowFinalReportPreview(false)}><X className="h-4 w-4" /></Button>
            </div>
            <div className="flex-1 p-4 overflow-auto bg-gray-100">
              {(finalReportPreviewUrl || taskData.pdfFinalReportUrl) ? (
                <div className="w-full h-[70vh]">
                  <embed src={finalReportPreviewUrl || taskData.pdfFinalReportUrl} type="application/pdf" className="w-full h-full" />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[70vh] text-gray-500">
                  <FileText className="h-16 w-16 mb-4" />
                  <p>No PDF file to preview</p>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <Button variant="outline" onClick={() => setShowFinalReportPreview(false)}>Close</Button>
              {finalReportPreviewUrl && <Button onClick={() => window.open(finalReportPreviewUrl, '_blank')}>Open in New Tab</Button>}
            </div>
          </div>
        </div>
      )}

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
              <Button type="button" onClick={async () => { if (pendingSubmit) await pendingSubmit() }} disabled={isSaving} className={activeTab === 'event' ? 'bg-purple-300 hover:bg-purple-300' : 'bg-blue-300 hover:bg-blue-300'}>
                {isSaving ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>) : (<><Save className="h-4 w-4 mr-2" />Confirm & Save</>)}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}