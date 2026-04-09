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
    X
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { uploadPDF, deletePDF } from '@/lib/pdf-service'

interface AddCalendarItemModalProps {
  isOpen: boolean
  onClose: () => void
  selectedDate: Date | null
  selectedEndDate?: Date | null 
  selectedItem?: any | null
  selectedType?: 'event' | 'task' | null
  prefilledData?: {  // NEW PROP
    clientName?: string
    jobTask?: string
    jobTaskCode?: string
    taskPicStaff?: string
    taskPicName?: string
    taskPicColor?: string
    pdfJobOrder?: string
    pdfJobOrderName?: string
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
  code: string
  color?: string
}

const taskStatuses = [
  { value: 'in-progress', label: 'In Progress', color: 'bg-yellow-100 text-yellow-800', dot: 'bg-yellow-500' },
  { value: 'completed', label: 'Completed', color: 'bg-green-100 text-green-800', dot: 'bg-green-500' },
  { value: 'incompleted', label: 'Incompleted', color: 'bg-red-100 text-red-800', dot: 'bg-red-500' },
]

interface JobTask {
  id: string
  code: string
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
  eventPicStaff: '',
  eventSupportStaff: [] as string[],
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
  pdfJobOrderName: '',
  pdfJobOrderPath: '',
  pdfJobOrderUrl: '', 
  taskPicStaff: '',
  taskSupportStaff: [] as string[],
  pdfFinalReport: null as File | null,
  pdfFinalReportName: '',
  pdfFinalReportPath: '',
  pdfFinalReportUrl: '',
  jobStatus: 'in-progress',
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

  const getNextRunningNumber = useCallback(async (date: Date) => {
    const year = date.getFullYear().toString().slice(-2)
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const prefix = `ICS${year}${month}`
    
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

  // ==================== FIXED NOTIFICATION FUNCTIONS ====================
  
const sendTaskNotifications = async (taskData: any, taskId: string) => {
  console.log('1️⃣ Function started');
  console.log('2️⃣ TaskData:', taskData);
  console.log('3️⃣ TaskId:', taskId);
  
  try {
    console.log('4️⃣ Inside try block');
    
    // Hardcode untuk test - guna user pertama dalam database
    const { data: firstUser, error: userError } = await supabase
      .from('users')
      .select('id')
      .limit(1)
      .single();
    
    console.log('5️⃣ First user query result:', firstUser);
    
    if (userError) {
      console.error('Error getting user:', userError);
      return;
    }
    
    if (!firstUser) {
      console.error('No user found');
      return;
    }
    
    // Insert ONE test notification
    const testNotif = {
      user_id: firstUser.id,
      title: 'TEST NOTIFICATION',
      message: `This is a test for task: ${taskData.clientName || 'No client'}`,
      type: 'task_assignment',
      task_id: taskId,
      read: false,
      created_at: new Date().toISOString()
    };
    
    console.log('6️⃣ About to insert:', testNotif);
    
    const { data, error: insertError } = await supabase
      .from('notifications')
      .insert(testNotif)
      .select();
    
    console.log('7️⃣ Insert result:', { data, insertError });
    
    if (insertError) {
      console.error('Insert error:', insertError);
    } else {
      console.log('✅ Success! Notification created:', data);
    }
    
  } catch (error) {
    console.error('❌ Catch error:', error);
  }
  
  console.log('8️⃣ Function ended');
};

  const sendEventNotifications = async (eventData: any, eventId: string) => {
    try {
      console.log('📨 ===== STARTING EVENT NOTIFICATION PROCESS =====')
      console.log('Event Data:', eventData)
      
      const staffToNotify = []
      
      // Add PIC (staff code)
      if (eventData.eventPicStaff) {
        staffToNotify.push(eventData.eventPicStaff)
        console.log('Added Event PIC code:', eventData.eventPicStaff)
      }
      
      // Add Support Staff (staff codes)
      if (eventData.eventSupportStaff && eventData.eventSupportStaff.length > 0) {
        staffToNotify.push(...eventData.eventSupportStaff)
        console.log('Added Event Support Staff codes:', eventData.eventSupportStaff)
      }

      if (staffToNotify.length === 0) {
        console.log('⚠️ No staff to notify for event, exiting...')
        return
      }

      console.log('Event staff codes to lookup:', staffToNotify)

      // Look up users by their 'user_id' column (staff code)
      const { data: staffUsers, error: staffError } = await supabase
        .from('users')
        .select('id, name, user_id')
        .in('user_id', staffToNotify)

      if (staffError) {
        console.error('❌ Error in user lookup:', staffError)
        toast({
          title: "Notification Error",
          description: "Failed to find staff members",
          variant: "destructive",
        })
        return
      }

      console.log('Found event staff users:', staffUsers)

      if (!staffUsers || staffUsers.length === 0) {
        console.error('❌ No staff found for event with codes:', staffToNotify)
        toast({
          title: "Notification Failed",
          description: `Staff codes not found: ${staffToNotify.join(', ')}`,
          variant: "destructive",
        })
        return
      }

      // Create notification for each staff member
      const notifications = staffUsers.map(staff => ({
        user_id: staff.id,  // UUID from users table
        title: '📅 New Event Assignment',
        message: `You have been assigned as ${staff.user_id === eventData.eventPicStaff ? 'PIC' : 'Support'} for event: ${eventData.title || 'New Event'}`,
        type: 'event_assignment',
        event_id: eventId,
        read: false,
        created_at: new Date().toISOString()
      }))

      console.log('Inserting event notifications:', notifications)

      const { error: notifError } = await supabase
        .from('notifications')
        .insert(notifications)

      if (notifError) {
        console.error('❌ Error inserting event notifications:', notifError)
        toast({
          title: "Notification Error",
          description: "Failed to send event notifications",
          variant: "destructive",
        })
        return
      }

      console.log(`✅ SUCCESS! ${notifications.length} event notification(s) sent`)
      
      toast({
        title: "✅ Notifications Sent",
        description: `Event assigned to ${staffUsers.length} staff member(s)`,
      })
      
    } catch (error) {
      console.error('❌ Fatal error in sendEventNotifications:', error)
      toast({
        title: "Notification Error",
        description: "Unexpected error sending notifications",
        variant: "destructive",
      })
    }
  }

  // ==================== END OF NOTIFICATION FUNCTIONS ====================

  useEffect(() => {
    try {
      const userData = localStorage.getItem('user')
      if (userData) {
        setCurrentUser(JSON.parse(userData))
        console.log('👤 Current user loaded:', JSON.parse(userData))
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
  }, [])

  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        resetForm()
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [isOpen, resetForm])

  const fetchJobTasks = async () => {
    setLoadingTasks(true)
    try {
      const { data, error } = await supabase
        .from('job_tasks')
        .select('*')
        .order('code', { ascending: true })
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
        .select('id, name, user_id, color')
        .eq('role', 'staff')
        .order('name')
      
      if (error) throw error
      
      setStaffList(data.map(user => ({
        id: user.id,
        name: user.name,
        code: user.user_id,  // Use user_id as the staff code
        color: user.color || 'blue'
      })))
    } catch (error) {
      console.error('Error fetching staff:', error)
    } finally {
      setLoadingStaff(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      resetForm()
      fetchJobTasks()
      fetchStaff()
      
      if (selectedType) {
        setActiveTab(selectedType)
      }
      
      if (selectedItem) {
        if (selectedType === 'event') {
          let eventSupportArray: string[] = []
          let eventSupportNamesArray: string[] = []
          let eventSupportColorsArray: string[] = []
          
          if (selectedItem.eventSupportStaff) {
            if (Array.isArray(selectedItem.eventSupportStaff)) {
              eventSupportArray = selectedItem.eventSupportStaff
            } else if (typeof selectedItem.eventSupportStaff === 'string') {
              eventSupportArray = selectedItem.eventSupportStaff.split(',').map(s => s.trim()).filter(s => s && s !== 'none')
            }
          } else if (selectedItem.staff2) {
            if (Array.isArray(selectedItem.staff2)) {
              eventSupportArray = selectedItem.staff2
            } else if (typeof selectedItem.staff2 === 'string') {
              eventSupportArray = selectedItem.staff2.split(',').map(s => s.trim()).filter(s => s && s !== 'none')
            }
          }

          if (selectedItem.event_support_names) {
            eventSupportNamesArray = typeof selectedItem.event_support_names === 'string' 
              ? selectedItem.event_support_names.split(',').filter(s => s) 
              : selectedItem.event_support_names
          }
          if (selectedItem.event_support_colors) {
            eventSupportColorsArray = typeof selectedItem.event_support_colors === 'string' 
              ? selectedItem.event_support_colors.split(',').filter(s => s) 
              : selectedItem.event_support_colors
          }
          
          setEventData({
            title: selectedItem.title || '',
            description: selectedItem.description || '',
            dateStart: selectedItem.date_start || selectedItem.dateStart || selectedItem.datestart || '',
            dateStop: selectedItem.date_stop || selectedItem.dateStop || selectedItem.datestop || '',
            timeStart: selectedItem.time_start || selectedItem.timeStart || selectedItem.timestart || '',
            timeStop: selectedItem.time_stop || selectedItem.timeStop || selectedItem.timestop || '',
            location: selectedItem.location || '',
            eventPicStaff: selectedItem.event_pic_staff || selectedItem.eventPicStaff || selectedItem.staff || '',
            eventSupportStaff: eventSupportArray,
            event_pic_name: selectedItem.event_pic_name || '',
            event_pic_color: selectedItem.event_pic_color || '',
            event_support_names: eventSupportNamesArray,
            event_support_colors: eventSupportColorsArray,
          })
          setShowTime(!!selectedItem.time_start || !!selectedItem.timeStart || !!selectedItem.timestart || !!selectedItem.timeStop)
          setShowDescription(!!selectedItem.description)
          setShowLocation(!!selectedItem.location)
          setShowEventPic(!!selectedItem.event_pic_staff || !!selectedItem.eventPicStaff || !!selectedItem.staff)
          setShowEventSupport(eventSupportArray.length > 0)
        } else {
          let taskSupportArray: string[] = []
          let taskSupportNamesArray: string[] = []
          let taskSupportColorsArray: string[] = []
          
          if (selectedItem.taskSupportStaff) {
            if (Array.isArray(selectedItem.taskSupportStaff)) {
              taskSupportArray = selectedItem.taskSupportStaff
            } else if (typeof selectedItem.taskSupportStaff === 'string') {
              taskSupportArray = selectedItem.taskSupportStaff.split(',').map(s => s.trim()).filter(s => s && s !== 'none')
            }
          } else if (selectedItem.staff2) {
            if (Array.isArray(selectedItem.staff2)) {
              taskSupportArray = selectedItem.staff2
            } else if (typeof selectedItem.staff2 === 'string') {
              taskSupportArray = selectedItem.staff2.split(',').map(s => s.trim()).filter(s => s && s !== 'none')
            }
          }

          if (selectedItem.task_support_names) {
            taskSupportNamesArray = typeof selectedItem.task_support_names === 'string' 
              ? selectedItem.task_support_names.split(',').filter(s => s) 
              : selectedItem.task_support_names
          }
          if (selectedItem.task_support_colors) {
            taskSupportColorsArray = typeof selectedItem.task_support_colors === 'string' 
              ? selectedItem.task_support_colors.split(',').filter(s => s) 
              : selectedItem.task_support_colors
          }
          
          let jobStatus = selectedItem.job_status || selectedItem.jobStatus || selectedItem.jobstatus || 'in-progress'
          if (jobStatus === 'pending' || jobStatus === 'cancelled') {
            jobStatus = 'incompleted'
          }
          
          setTaskData({
            clientName: selectedItem.client_name || selectedItem.clientName || selectedItem.clientname || '',
            runningNumber: selectedItem.running_number || selectedItem.runningNumber || selectedItem.runningnumber || '',
            jobTask: selectedItem.job_task || selectedItem.jobTask || selectedItem.jobtask || '',
            dateStart: selectedItem.date_start || selectedItem.dateStart || selectedItem.datestart || '',
            dateStop: selectedItem.date_stop || selectedItem.dateStop || selectedItem.datestop || '',
            timeStart: selectedItem.time_start || selectedItem.timeStart || selectedItem.timestart || '',
            timeStop: selectedItem.time_stop || selectedItem.timeStop || selectedItem.timestop || '',
            additionalRemark: selectedItem.additional_remark || selectedItem.additionalRemark || selectedItem.additionalremark || '',
            pdfJobOrder: null,
            pdfJobOrderName: selectedItem.pdf_job_order || selectedItem.pdfJobOrder || selectedItem.pdfjoborder || '',
            pdfJobOrderPath: selectedItem.pdf_job_order_path || '',
            pdfJobOrderUrl: selectedItem.pdf_job_order_url || '', 
            taskPicStaff: selectedItem.task_pic_staff || selectedItem.taskPicStaff || selectedItem.staff || '',
            taskSupportStaff: taskSupportArray,
            pdfFinalReport: null,
            pdfFinalReportName: selectedItem.pdf_final_report || selectedItem.pdfFinalReport || selectedItem.pdffinalreport || '',
            pdfFinalReportPath: selectedItem.pdf_final_report_path || '',  // ← NEW
            pdfFinalReportUrl: selectedItem.pdf_final_report_url || '', 
            jobStatus: jobStatus,
            task_pic_name: selectedItem.task_pic_name || '',
            task_pic_color: selectedItem.task_pic_color || '',
            task_support_names: taskSupportNamesArray,
            task_support_colors: taskSupportColorsArray,
          })
          setShowTime(!!selectedItem.time_start || !!selectedItem.timeStart || !!selectedItem.timestart || !!selectedItem.timeStop)
          setShowDescription(!!selectedItem.additional_remark || !!selectedItem.additionalRemark)
          setShowSupport(taskSupportArray.length > 0)
          setShowFinalReport(!!selectedItem.pdf_final_report || !!selectedItem.pdfFinalReport)
        }
      } 
      else if (selectedDate) {
        const dateStr = formatDateToString(selectedDate)
        
        setEventData(prev => ({
          ...prev,
          dateStart: dateStr,
          dateStop: ''
        }))
        
        setTaskData(prev => ({
          ...prev,
          dateStart: dateStr,
          dateStop: ''
        }))
        
        if (activeTab === 'task') {
          getNextRunningNumber(selectedDate).then(runningNum => {
            setTaskData(prev => ({
              ...prev,
              runningNumber: runningNum
            }))
          })
        }
      }
    }
  }, [isOpen, selectedItem, selectedDate, selectedType, resetForm, activeTab, getNextRunningNumber])

  if (!isOpen) return null

  const handleTaskSupportToggle = (staffCode: string) => {
    const selectedStaff = staffList.find(s => s.code === staffCode)
    
    setTaskData(prev => {
      const current = [...prev.taskSupportStaff]
      const currentNames = [...(prev.task_support_names || [])]
      const currentColors = [...(prev.task_support_colors || [])]
      
      if (current.includes(staffCode)) {
        const index = current.indexOf(staffCode)
        current.splice(index, 1)
        currentNames.splice(index, 1)
        currentColors.splice(index, 1)
        return {
          ...prev,
          taskSupportStaff: current,
          task_support_names: currentNames,
          task_support_colors: currentColors
        }
      } else {
        return {
          ...prev,
          taskSupportStaff: [...current, staffCode],
          task_support_names: [...currentNames, selectedStaff?.name || ''],
          task_support_colors: [...currentColors, selectedStaff?.color || 'blue']
        }
      }
    })
  }

  const handleEventSupportToggle = (staffCode: string) => {
    const selectedStaff = staffList.find(s => s.code === staffCode)
    
    setEventData(prev => {
      const current = [...prev.eventSupportStaff]
      const currentNames = [...(prev.event_support_names || [])]
      const currentColors = [...(prev.event_support_colors || [])]
      
      if (current.includes(staffCode)) {
        const index = current.indexOf(staffCode)
        current.splice(index, 1)
        currentNames.splice(index, 1)
        currentColors.splice(index, 1)
        return {
          ...prev,
          eventSupportStaff: current,
          event_support_names: currentNames,
          event_support_colors: currentColors
        }
      } else {
        return {
          ...prev,
          eventSupportStaff: [...current, staffCode],
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
      case 'taskPicStaff':
        if (!value) return 'PIC Staff is required'
        break
      case 'dateStart':
        if (!value) return 'Start date is required'
        break
      case 'dateStop':
        if (taskData.dateStart && value) {
          const start = new Date(taskData.dateStart)
          const stop = new Date(value)
          start.setHours(0,0,0,0)
          stop.setHours(0,0,0,0)
          if (stop < start) return 'Stop date cannot be before start date'
          const diffTime = Math.abs(stop.getTime() - start.getTime())
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
          if (diffDays > 365) return 'Task duration cannot exceed 365 days'
        }
        break
      case 'timeStop':
        if (taskData.timeStart && value && taskData.dateStart === taskData.dateStop) {
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
    const picStaffError = validateTaskField('taskPicStaff', taskData.taskPicStaff)
    if (picStaffError) newErrors.taskPicStaff = picStaffError
    const dateStartError = validateTaskField('dateStart', taskData.dateStart)
    if (dateStartError) newErrors.dateStart = dateStartError
    if (taskData.dateStop) {
      const dateStopError = validateTaskField('dateStop', taskData.dateStop)
      if (dateStopError) newErrors.dateStop = dateStopError
    }
    if (taskData.timeStart && taskData.timeStop) {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (isSaving) return
    
    setErrors({})
    
    let isValid = false
    
    if (activeTab === 'event') {
      isValid = validateEventForm()
    } else {
      isValid = validateTaskForm()
    }
    
    if (!isValid) {
      const firstError = Object.values(errors)[0]
      if (firstError) {
        toast({
          title: "Validation Error",
          description: firstError,
          variant: "destructive",
        })
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
            event_pic_staff: eventData.eventPicStaff || null,
            event_support_staff: eventData.eventSupportStaff.length > 0 
              ? eventData.eventSupportStaff.join(',') 
              : null,
            event_pic_name: eventData.event_pic_name || '',
            event_pic_color: eventData.event_pic_color || '',
            event_support_names: eventData.event_support_names.length > 0 
              ? eventData.event_support_names.join(',') 
              : null,
            event_support_colors: eventData.event_support_colors.length > 0 
              ? eventData.event_support_colors.join(',') 
              : null,
            created_by: currentUser?.id
          }
          
          let result
          if (onSave) {
            result = await onSave(dataToSave, 'event')
          } else {
            throw new Error("Save function not available")
          }

        if (result && result.id) {
          console.log('📨 Event saved with ID:', result.id);
          
          // Send notifications if there are staff assigned
          if (eventData.eventPicStaff || (eventData.eventSupportStaff && eventData.eventSupportStaff.length > 0)) {
            console.log('📨 Sending event notifications...');
            await sendEventNotifications(eventData, result.id);
          } else {
            console.log('⚠️ No staff assigned, skipping notifications');
          }
        }

          toast({
            title: "Success",
            description: selectedItem ? "Event updated successfully" : "Event created successfully",
          })
        } else {
          const runningNumber = taskData.runningNumber

          if (!runningNumber) {
            throw new Error("Running number not generated")
          }

          const dataToSave = {
            client_name: taskData.clientName,
            running_number: runningNumber,
            job_task: taskData.jobTask || 'General Task',
            date_start: taskData.dateStart,
            date_stop: taskData.dateStop || null,
            time_start: taskData.timeStart || '',
            time_stop: taskData.timeStop || '',
            additional_remark: taskData.additionalRemark || '',
            pdf_job_order: taskData.pdfJobOrderName || '',
            pdf_job_order_path: taskData.pdfJobOrderPath || null,
            pdf_job_order_url: taskData.pdfJobOrderUrl || null,
            task_pic_staff: taskData.taskPicStaff,
            task_support_staff: taskData.taskSupportStaff.join(','),
            task_pic_name: taskData.task_pic_name || '',
            task_pic_color: taskData.task_pic_color || '',
            task_support_names: taskData.task_support_names.join(','),
            task_support_colors: taskData.task_support_colors.join(','),
            pdf_final_report: taskData.pdfFinalReportName || '',
            pdf_final_report_path: taskData.pdfFinalReportPath || null,
            pdf_final_report_url: taskData.pdfFinalReportUrl || null,
            job_status: taskData.jobStatus,
            created_by: currentUser?.id
          }

          let result
          if (onSave) {
            result = await onSave(dataToSave, 'task')
          } else {
            throw new Error("Save function not available")
          }

        // After successfully saving task
        if (result && result.id) {
          console.log('📨 Task saved with ID:', result.id);
          
          // Send notifications if there are staff assigned
          if (taskData.taskPicStaff || (taskData.taskSupportStaff && taskData.taskSupportStaff.length > 0)) {
            console.log('📨 Sending task notifications...');
            await sendTaskNotifications(taskData, result.id);
          } else {
            console.log('⚠️ No staff assigned, skipping notifications');
          }
        }

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
          description: error.message || "Failed to save",
          variant: "destructive",
        })
      } finally {
        setIsSaving(false)
        setShowConfirmDialog(false)
        setPendingSubmit(null)
      }
    }

    if (activeTab === 'task') {
      setPendingSubmit(() => saveFunction)
      setShowConfirmDialog(true)
    } else {
      saveFunction()
    }
  }

  const handleDelete = async () => {
    if (!selectedItem) return
    
    const confirmDelete = window.confirm(`Are you sure you want to delete this ${selectedType}?`)
    if (!confirmDelete) return
    
    setIsSaving(true)
    
    try {
      if (onDelete) {
        await onDelete(selectedItem.id, activeTab)
      } else {
        toast({
          title: "Error",
          description: "Delete function not available",
          variant: "destructive",
        })
        return
      }
      
      toast({
        title: "Success",
        description: "Deleted successfully",
      })
      
      resetForm()
      onClose()
      if (onSuccess) onSuccess()
      
    } catch (error: any) {
      console.error('Error deleting:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'JobOrder' | 'FinalReport') => {
  if (e.target.files && e.target.files[0]) {
    const file = e.target.files[0]
    
    if (file.type !== 'application/pdf') {
      toast({
        title: "Invalid File",
        description: "Only PDF files are allowed",
        variant: "destructive",
      })
      return
    }
    
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "File size cannot exceed 10MB",
        variant: "destructive",
      })
      return
    }
    
    if (field === 'JobOrder') {
      setTaskData({ 
        ...taskData, 
        pdfJobOrder: file,
        pdfJobOrderName: file.name
        // pdfJobOrderPath dan pdfJobOrderUrl akan diisi selepas upload
      })
    } else {
      setTaskData({ 
        ...taskData, 
        pdfFinalReport: file,
        pdfFinalReportName: file.name
        // pdfFinalReportPath dan pdfFinalReportUrl akan diisi selepas upload
      })
    }
  }
}

  const formatDate = (date: Date | null) => {
    if (!date) return ''
    return date.toLocaleDateString('en-GB', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    })
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

  const getStaffName = (code: string) => {
    const staff = staffList.find(s => s.code === code)
    return staff ? `${staff.name} (${staff.code})` : code
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <Card className="border-0">
          <CardHeader className="border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {selectedItem ? 'Edit' : 'Add New'} {activeTab === 'event' ? 'Event' : 'Job Task'}
              </CardTitle>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => {
                  resetForm()
                  onClose()
                }} 
                type="button"
                disabled={isSaving}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center space-x-4 mt-2 border-b border-gray-200 pb-2">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('event')
                  setErrors({})
                  setTouched({})
                }}
                disabled={isSaving}
                className={`pb-1 px-1 text-sm font-medium transition-colors relative flex items-center space-x-2 ${
                  activeTab === 'event'
                    ? 'text-purple-600 border-b-2 border-purple-600'
                    : 'text-gray-500 hover:text-gray-700'
                } ${isSaving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <CalendarCheck className="h-4 w-4" />
                <span>Event</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('task')
                  setErrors({})
                  setTouched({})
                }}
                disabled={isSaving}
                className={`pb-1 px-1 text-sm font-medium transition-colors relative flex items-center space-x-2 ${
                  activeTab === 'task'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                } ${isSaving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
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
                  <span>{formatDate(selectedDate)}</span>
                </div>
              )}

              {activeTab === 'task' && (
                <>
                  <div className="flex justify-end mb-2">
                    <div className="w-48">
                      <Select
                        value={taskData.jobStatus}
                        onValueChange={(value) => setTaskData({...taskData, jobStatus: value})}
                        disabled={isSaving}
                      >
                        <SelectTrigger className="bg-white border-gray-300">
                          <SelectValue>
                            <div className="flex items-center">
                              <span className={`w-2 h-2 rounded-full mr-2 ${
                                taskData.jobStatus === 'in-progress' ? 'bg-yellow-500' :
                                taskData.jobStatus === 'completed' ? 'bg-green-500' : 'bg-red-500'
                              }`}></span>
                              <span className="text-gray-900">
                                {taskStatuses.find(s => s.value === taskData.jobStatus)?.label}
                              </span>
                            </div>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="bg-white border border-gray-200 shadow-lg">
                          {taskStatuses.map((status) => (
                            <SelectItem 
                              key={status.value} 
                              value={status.value}
                              className="hover:bg-gray-100 text-gray-900"
                            >
                              <div className="flex items-center">
                                <span className={`w-2 h-2 rounded-full mr-2 ${status.dot}`}></span>
                                <span>{status.label}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-700 font-medium">
                      Client Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={taskData.clientName}
                      onChange={(e) => {
                        setTaskData({...taskData, clientName: e.target.value})
                        if (touched.clientName) {
                          const error = validateTaskField('clientName', e.target.value)
                          setErrors(prev => ({ ...prev, clientName: error }))
                        }
                      }}
                      onBlur={() => handleBlur('clientName')}
                      placeholder="Enter client name"
                      className={`border-gray-300 bg-white ${
                        touched.clientName && errors.clientName ? 'border-red-500' : ''
                      }`}
                      disabled={isSaving}
                      autoFocus
                    />
                    <ErrorMessage field="clientName" />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-700 font-medium">Running Number</Label>
                    <Input
                      value={taskData.runningNumber}
                      placeholder="Loading..."
                      className="border-gray-300 bg-gray-50 font-mono text-sm"
                      disabled={true}
                      readOnly
                    />
                    <p className="text-xs text-gray-500">
                      Format: ICS + Year(2 digits) + Month(2 digits) + Number(001) - Resets every month
                    </p>
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
                          if (value === "none") {
                            setTaskData({...taskData, jobTask: ""})
                          } else {
                            setTaskData({...taskData, jobTask: value})
                          }
                          if (touched.jobTask) {
                            const error = validateTaskField('jobTask', value)
                            setErrors(prev => ({ ...prev, jobTask: error }))
                          }
                        }}
                        onOpenChange={() => handleBlur('jobTask')}
                        disabled={isSaving}
                      >
                        <SelectTrigger className={`bg-white border-gray-300 ${
                          touched.jobTask && errors.jobTask ? 'border-red-500' : ''
                        }`}>
                          <SelectValue placeholder="Select job task" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border border-gray-200 shadow-lg max-h-80">
                          <SelectItem value="none" className="hover:bg-gray-100 text-gray-900 italic">
                            None
                          </SelectItem>
                          
                          {jobTasks.map((task) => (
                            <SelectItem 
                              key={task.id} 
                              value={task.name}
                              className="hover:bg-gray-100 text-gray-900"
                            >
                              <div className="flex items-center">
                                <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded mr-2">
                                  {task.code}
                                </span>
                                <span>{task.name}</span>
                              </div>
                            </SelectItem>
                          ))}

                          {jobTasks.length === 0 && (
                            <div className="px-2 py-3 text-sm text-gray-500 text-center">
                              No job tasks found. Please add in Settings first.
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                    )}
                    <ErrorMessage field="jobTask" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-gray-700 font-medium">
                        Date Start <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        type="date"
                        value={taskData.dateStart}
                        onChange={(e) => {
                          setTaskData({...taskData, dateStart: e.target.value})
                          if (touched.dateStart) {
                            const error = validateTaskField('dateStart', e.target.value)
                            setErrors(prev => ({ ...prev, dateStart: error }))
                          }
                          if (taskData.dateStop && touched.dateStop) {
                            const stopError = validateTaskField('dateStop', taskData.dateStop)
                            setErrors(prev => ({ ...prev, dateStop: stopError }))
                          }
                        }}
                        onBlur={() => handleBlur('dateStart')}
                        className={`border-gray-300 bg-white ${
                          touched.dateStart && errors.dateStart ? 'border-red-500' : ''
                        }`}
                        disabled={isSaving}
                      />
                      <ErrorMessage field="dateStart" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-700 font-medium">Date Stop (Optional)</Label>
                      <Input
                        type="date"
                        value={taskData.dateStop}
                        onChange={(e) => {
                          setTaskData({...taskData, dateStop: e.target.value})
                          if (touched.dateStop) {
                            const error = validateTaskField('dateStop', e.target.value)
                            setErrors(prev => ({ ...prev, dateStop: error }))
                          }
                        }}
                        onBlur={() => handleBlur('dateStop')}
                        className={`border-gray-300 bg-white ${
                          touched.dateStop && errors.dateStop ? 'border-red-500' : ''
                        }`}
                        disabled={isSaving}
                      />
                      <ErrorMessage field="dateStop" />
                    </div>
                  </div>

                  {!showTime ? (
                    <button
                      type="button"
                      onClick={() => setShowTime(true)}
                      className="flex items-center text-sm text-blue-600 hover:text-blue-700"
                      disabled={isSaving}
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      Add time
                    </button>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-gray-700 font-medium">Time Start</Label>
                        <Input
                          type="time"
                          value={taskData.timeStart}
                          onChange={(e) => {
                            setTaskData({...taskData, timeStart: e.target.value})
                            if (touched.timeStop && taskData.timeStop) {
                              const error = validateTaskField('timeStop', taskData.timeStop)
                              setErrors(prev => ({ ...prev, timeStop: error }))
                            }
                          }}
                          className="border-gray-300 bg-white"
                          disabled={isSaving}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-gray-700 font-medium">Time Stop</Label>
                        <Input
                          type="time"
                          value={taskData.timeStop}
                          onChange={(e) => {
                            setTaskData({...taskData, timeStop: e.target.value})
                            if (touched.timeStop) {
                              const error = validateTaskField('timeStop', e.target.value)
                              setErrors(prev => ({ ...prev, timeStop: error }))
                            }
                          }}
                          onBlur={() => handleBlur('timeStop')}
                          className={`border-gray-300 bg-white ${
                            touched.timeStop && errors.timeStop ? 'border-red-500' : ''
                          }`}
                          disabled={isSaving}
                        />
                        <ErrorMessage field="timeStop" />
                      </div>
                    </div>
                  )}

                  {!showDescription ? (
                    <button
                      type="button"
                      onClick={() => setShowDescription(true)}
                      className="flex items-center text-sm text-gray-600 hover:text-gray-900"
                      disabled={isSaving}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Add additional remark
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <Label className="text-gray-700 font-medium">Additional Remark</Label>
                      <Textarea
                        value={taskData.additionalRemark}
                        onChange={(e) => setTaskData({...taskData, additionalRemark: e.target.value})}
                        placeholder="Enter any additional remarks..."
                        className="border-gray-300 bg-white min-h-[80px]"
                        disabled={isSaving}
                      />
                    </div>
                  )}

                  <div className="border-t border-gray-200 pt-4">
                    <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center justify-between">
                      <div className="flex items-center">
                        <FileText className="h-4 w-4 mr-2 text-blue-600" />
                        PDF File (Job Order)
                      </div>
                      {taskData.pdfJobOrderUrl && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(taskData.pdfJobOrderUrl, '_blank')}
                          className="text-blue-600"
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          View PDF
                        </Button>
                      )}
                    </h4>
                    
                    {taskData.pdfJobOrderName && taskData.pdfJobOrderUrl && !taskData.pdfJobOrder && (
                      <div className="mb-2 p-2 bg-blue-50 rounded border border-blue-200 text-sm">
                        <p className="text-blue-700 flex items-center">
                          <FileText className="h-4 w-4 mr-2" />
                          Current: {taskData.pdfJobOrderName}
                        </p>
                      </div>
                    )}
                    
                    <Input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => handleFileChange(e, 'JobOrder')}
                      className="border-gray-300 bg-white"
                      disabled={isSaving}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {taskData.pdfJobOrderName ? 'Upload new PDF to replace existing file' : 'Upload job order PDF (max 10MB)'}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-700 font-medium">
                      PIC (Person In Charge) <span className="text-red-500">*</span>
                    </Label>
                    {loadingStaff ? (
                      <div className="flex items-center space-x-2 border border-gray-300 rounded-md p-2">
                        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                        <span className="text-sm text-gray-500">Loading staff...</span>
                      </div>
                    ) : (
                      <Select
                        value={taskData.taskPicStaff}
                        onValueChange={(value) => {
                          const selectedStaff = staffList.find(s => s.code === value)
                          setTaskData({
                            ...taskData,
                            taskPicStaff: value,
                            task_pic_name: selectedStaff?.name || '',
                            task_pic_color: selectedStaff?.color || 'blue'
                          })
                          if (touched.taskPicStaff) {
                            const error = validateTaskField('taskPicStaff', value)
                            setErrors(prev => ({ ...prev, taskPicStaff: error }))
                          }
                        }}
                        onOpenChange={() => handleBlur('taskPicStaff')}
                        disabled={isSaving}
                      >
                        <SelectTrigger className={`bg-white border-gray-300 ${
                          touched.taskPicStaff && errors.taskPicStaff ? 'border-red-500' : ''
                        }`}>
                          <SelectValue placeholder="Select main PIC" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border border-gray-200 shadow-lg">
                          {staffList.map((staff) => (
                            <SelectItem 
                              key={staff.id} 
                              value={staff.code}
                              className="hover:bg-gray-100 text-gray-900"
                            >
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: staff.color || '#3b82f6' }}
                                ></div>
                                <span>{staff.name} ({staff.code})</span>
                              </div>
                            </SelectItem>
                          ))}
                          {staffList.length === 0 && (
                            <div className="px-2 py-3 text-sm text-gray-500 text-center">
                              No staff found. Please add staff in Settings first.
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                    )}
                    <ErrorMessage field="taskPicStaff" />
                    {taskData.task_pic_name && (
                      <div className="mt-1 flex items-center gap-2 text-xs text-green-600">
                        <div 
                          className="w-2 h-2 rounded-full" 
                          style={{ backgroundColor: taskData.task_pic_color || '#3b82f6' }}
                        ></div>
                        <span>Selected: {taskData.task_pic_name} ({taskData.taskPicStaff})</span>
                      </div>
                    )}
                  </div>

                  {!showSupport ? (
                    <button
                      type="button"
                      onClick={() => setShowSupport(true)}
                      className="flex items-center text-sm text-gray-600 hover:text-gray-900"
                      disabled={isSaving}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add Support Staff (Optional)
                    </button>
                  ) : (
                    <div className="space-y-3 border rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center justify-between">
                        <Label className="text-gray-700 font-medium flex items-center">
                          <Users className="h-4 w-4 mr-2" />
                          Task Support Staff
                        </Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowSupport(false)}
                          className="h-6 w-6 p-0"
                          disabled={isSaving}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500">Select staff who will support this task:</p>
                      {loadingStaff ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          {staffList
                            .filter(staff => staff.code !== taskData.taskPicStaff)
                            .map((staff) => (
                              <div key={staff.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`task-support-${staff.id}`}
                                  checked={taskData.taskSupportStaff.includes(staff.code)}
                                  onCheckedChange={() => handleTaskSupportToggle(staff.code)}
                                  disabled={isSaving}
                                />
                                <label
                                  htmlFor={`task-support-${staff.id}`}
                                  className="text-sm cursor-pointer text-gray-700 flex items-center gap-1"
                                >
                                  <div 
                                    className="w-2 h-2 rounded-full" 
                                    style={{ backgroundColor: staff.color || '#3b82f6' }}
                                  ></div>
                                  {staff.name} ({staff.code})
                                </label>
                              </div>
                            ))}
                        </div>
                      )}
                      
                      {taskData.taskSupportStaff.length > 0 && (
                        <div className="mt-2 text-xs text-green-600 flex flex-wrap gap-2">
                          {taskData.taskSupportStaff.map((code, index) => (
                            <span key={code} className="inline-flex items-center gap-1">
                              <div 
                                className="w-2 h-2 rounded-full" 
                                style={{ backgroundColor: taskData.task_support_colors?.[index] || '#3b82f6' }}
                              ></div>
                              {staffList.find(s => s.code === code)?.name || code}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {!showFinalReport ? (
                    <button
                      type="button"
                      onClick={() => setShowFinalReport(true)}
                      className="flex items-center text-sm text-gray-600 hover:text-gray-900"
                      disabled={isSaving}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Add PDF Final Report
                    </button>
                  ) : (
                    <div className="space-y-4 border-t border-gray-200 pt-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-gray-800 flex items-center">
                          <FileText className="h-4 w-4 mr-2 text-green-600" />
                          PDF File (Final Report)
                        </h4>
                        <div className="flex gap-2">
                          {taskData.pdfFinalReportUrl && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(taskData.pdfFinalReportUrl, '_blank')}
                              className="text-green-600"
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              View PDF
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowFinalReport(false)}
                            className="h-6 w-6 p-0"
                            disabled={isSaving}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      
                      {taskData.pdfFinalReportName && taskData.pdfFinalReportUrl && !taskData.pdfFinalReport && (
                        <div className="p-2 bg-green-50 rounded border border-green-200 text-sm">
                          <p className="text-green-700 flex items-center">
                            <FileText className="h-4 w-4 mr-2" />
                            Current: {taskData.pdfFinalReportName}
                          </p>
                        </div>
                      )}
                      
                      <Input
                        type="file"
                        accept=".pdf"
                        onChange={(e) => handleFileChange(e, 'FinalReport')}
                        className="border-gray-300 bg-white"
                        disabled={isSaving}
                      />
                      <p className="text-xs text-gray-500">
                        {taskData.pdfFinalReportName ? 'Upload new PDF to replace existing file' : 'Upload final report PDF (max 10MB)'}
                      </p>
                    </div>
                  )}
                </>
              )}

              {activeTab === 'event' && (
                <>
                  <div className="space-y-2">
                    <Label className="text-gray-700 font-medium">
                      Title <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={eventData.title}
                      onChange={(e) => {
                        setEventData({...eventData, title: e.target.value})
                        if (touched.title) {
                          const error = validateEventField('title', e.target.value)
                          setErrors(prev => ({ ...prev, title: error }))
                        }
                      }}
                      onBlur={() => handleBlur('title')}
                      placeholder="Enter event title"
                      className={`border-gray-300 bg-white ${
                        touched.title && errors.title ? 'border-red-500' : ''
                      }`}
                      disabled={isSaving}
                      autoFocus
                    />
                    <ErrorMessage field="title" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-gray-700 font-medium">
                        Date Start <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        type="date"
                        value={eventData.dateStart}
                        onChange={(e) => {
                          setEventData({...eventData, dateStart: e.target.value})
                          if (touched.dateStart) {
                            const error = validateEventField('dateStart', e.target.value)
                            setErrors(prev => ({ ...prev, dateStart: error }))
                          }
                          if (eventData.dateStop && touched.dateStop) {
                            const stopError = validateEventField('dateStop', eventData.dateStop)
                            setErrors(prev => ({ ...prev, dateStop: stopError }))
                          }
                        }}
                        onBlur={() => handleBlur('dateStart')}
                        className={`border-gray-300 bg-white ${
                          touched.dateStart && errors.dateStart ? 'border-red-500' : ''
                        }`}
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
                          setEventData({...eventData, dateStop: e.target.value})
                          if (touched.dateStop) {
                            const error = validateEventField('dateStop', e.target.value)
                            setErrors(prev => ({ ...prev, dateStop: error }))
                          }
                        }}
                        onBlur={() => handleBlur('dateStop')}
                        className={`border-gray-300 bg-white ${
                          touched.dateStop && errors.dateStop ? 'border-red-500' : ''
                        }`}
                        disabled={isSaving}
                      />
                      <ErrorMessage field="dateStop" />
                    </div>
                  </div>

                  {!showTime ? (
                    <button
                      type="button"
                      onClick={() => setShowTime(true)}
                      className="flex items-center text-sm text-blue-600 hover:text-blue-700"
                      disabled={isSaving}
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      Add time
                    </button>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-gray-700 font-medium">Time Start</Label>
                        <Input
                          type="time"
                          value={eventData.timeStart}
                          onChange={(e) => {
                            setEventData({...eventData, timeStart: e.target.value})
                            if (touched.timeStop && eventData.timeStop) {
                              const error = validateEventField('timeStop', eventData.timeStop)
                              setErrors(prev => ({ ...prev, timeStop: error }))
                            }
                          }}
                          className="border-gray-300 bg-white"
                          disabled={isSaving}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-gray-700 font-medium">Time Stop</Label>
                        <Input
                          type="time"
                          value={eventData.timeStop}
                          onChange={(e) => {
                            setEventData({...eventData, timeStop: e.target.value})
                            if (touched.timeStop) {
                              const error = validateEventField('timeStop', e.target.value)
                              setErrors(prev => ({ ...prev, timeStop: error }))
                            }
                          }}
                          onBlur={() => handleBlur('timeStop')}
                          className={`border-gray-300 bg-white ${
                            touched.timeStop && errors.timeStop ? 'border-red-500' : ''
                          }`}
                          disabled={isSaving}
                        />
                        <ErrorMessage field="timeStop" />
                      </div>
                    </div>
                  )}

                  {!showLocation ? (
                    <button
                      type="button"
                      onClick={() => setShowLocation(true)}
                      className="flex items-center text-sm text-gray-600 hover:text-gray-900"
                      disabled={isSaving}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Add location
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <Label className="text-gray-700 font-medium">Location</Label>
                      <Input
                        value={eventData.location}
                        onChange={(e) => setEventData({...eventData, location: e.target.value})}
                        placeholder="Enter location"
                        className="border-gray-300 bg-white"
                        disabled={isSaving}
                      />
                    </div>
                  )}

                  {!showDescription ? (
                    <button
                      type="button"
                      onClick={() => setShowDescription(true)}
                      className="flex items-center text-sm text-gray-600 hover:text-gray-900"
                      disabled={isSaving}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Add description
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <Label className="text-gray-700 font-medium">Description</Label>
                      <Textarea
                        value={eventData.description}
                        onChange={(e) => setEventData({...eventData, description: e.target.value})}
                        placeholder="Enter description"
                        className="border-gray-300 bg-white min-h-[80px]"
                        disabled={isSaving}
                      />
                    </div>
                  )}

                  {/* ===== EVENT PIC STAFF ===== */}
                  {!showEventPic ? (
                    <button
                      type="button"
                      onClick={() => setShowEventPic(true)}
                      className="flex items-center text-sm text-blue-600 hover:text-blue-700"
                      disabled={isSaving}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add PIC (Person In Charge)
                    </button>
                  ) : (
                    <div className="space-y-2 border rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center justify-between">
                        <Label className="text-gray-700 font-medium flex items-center">
                          <Users className="h-4 w-4 mr-2" />
                          Event PIC
                        </Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowEventPic(false)}
                          className="h-6 w-6 p-0"
                          disabled={isSaving}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      {loadingStaff ? (
                        <div className="flex items-center space-x-2 border border-gray-300 rounded-md p-2">
                          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                          <span className="text-sm text-gray-500">Loading staff...</span>
                        </div>
                      ) : (
                        <Select
                          value={eventData.eventPicStaff}
                          onValueChange={(value) => {
                            const selectedStaff = staffList.find(s => s.code === value)
                            setEventData({
                              ...eventData,
                              eventPicStaff: value,
                              event_pic_name: selectedStaff?.name || '',
                              event_pic_color: selectedStaff?.color || 'purple'
                            })
                          }}
                          disabled={isSaving}
                        >
                          <SelectTrigger className="bg-white border-gray-300">
                            <SelectValue placeholder="Select PIC for this event" />
                          </SelectTrigger>
                          <SelectContent className="bg-white border border-gray-200 shadow-lg">
                            {staffList.map((staff) => (
                              <SelectItem 
                                key={staff.id} 
                                value={staff.code}
                                className="hover:bg-gray-100 text-gray-900"
                              >
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-3 h-3 rounded-full" 
                                    style={{ backgroundColor: staff.color || '#8b5cf6' }}
                                  ></div>
                                  <span>{staff.name} ({staff.code})</span>
                                </div>
                              </SelectItem>
                            ))}
                            {staffList.length === 0 && (
                              <div className="px-2 py-3 text-sm text-gray-500 text-center">
                                No staff found. Please add staff in Settings first.
                              </div>
                            )}
                          </SelectContent>
                        </Select>
                      )}
                      
                      {eventData.event_pic_name && (
                        <div className="mt-2 flex items-center gap-2 p-2 rounded bg-white border">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: eventData.event_pic_color || '#8b5cf6' }}
                          ></div>
                          <span className="text-sm text-gray-700">
                            Selected: {eventData.event_pic_name} ({eventData.eventPicStaff})
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ===== EVENT SUPPORT STAFF ===== */}
                  {!showEventSupport ? (
                    <button
                      type="button"
                      onClick={() => setShowEventSupport(true)}
                      className="flex items-center text-sm text-gray-600 hover:text-gray-900"
                      disabled={isSaving}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add Support Staff (Optional)
                    </button>
                  ) : (
                    <div className="space-y-3 border rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center justify-between">
                        <Label className="text-gray-700 font-medium flex items-center">
                          <Users className="h-4 w-4 mr-2" />
                          Event Support Staff
                        </Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowEventSupport(false)}
                          className="h-6 w-6 p-0"
                          disabled={isSaving}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500">Select staff who will support this event:</p>
                      {loadingStaff ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          {staffList
                            .filter(staff => staff.code !== eventData.eventPicStaff)
                            .map((staff) => (
                              <div key={staff.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`event-support-${staff.id}`}
                                  checked={eventData.eventSupportStaff.includes(staff.code)}
                                  onCheckedChange={() => handleEventSupportToggle(staff.code)}
                                  disabled={isSaving}
                                />
                                <label
                                  htmlFor={`event-support-${staff.id}`}
                                  className="text-sm cursor-pointer text-gray-700 flex items-center gap-1"
                                >
                                  <div 
                                    className="w-2 h-2 rounded-full" 
                                    style={{ backgroundColor: staff.color || '#8b5cf6' }}
                                  ></div>
                                  {staff.name} ({staff.code})
                                </label>
                              </div>
                            ))}
                        </div>
                      )}
                      
                      {eventData.eventSupportStaff.length > 0 && (
                        <div className="mt-2 text-xs text-green-600 flex flex-wrap gap-2">
                          {eventData.eventSupportStaff.map((code, index) => (
                            <span key={code} className="inline-flex items-center gap-1">
                              <div 
                                className="w-2 h-2 rounded-full" 
                                style={{ backgroundColor: eventData.event_support_colors?.[index] || '#8b5cf6' }}
                              ></div>
                              {staffList.find(s => s.code === code)?.name || code}
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
                  <Button 
                    type="button" 
                    variant="destructive" 
                    size="sm" 
                    onClick={handleDelete}
                    disabled={isSaving}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                )}
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    resetForm()
                    onClose()
                  }}
                  disabled={isSaving}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
              
              <Button 
                type="submit" 
                size="sm" 
                className={activeTab === 'event' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
              <Bell className="h-5 w-5 mr-2 text-blue-600" />
              Confirm Task Assignment
            </h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to assign this task with the following staff?
            </p>
            
            <div className="bg-gray-50 p-4 rounded-lg mb-4 space-y-3">
              <div className="text-sm">
                <span className="font-medium text-gray-700">PIC (Main):</span>{' '}
                <span className="text-gray-900 flex items-center gap-1">
                  <div 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: taskData.task_pic_color || '#3b82f6' }}
                  ></div>
                  {getStaffName(taskData.taskPicStaff)}
                </span>
              </div>
              
              {taskData.taskSupportStaff.length > 0 && (
                <div className="text-sm">
                  <span className="font-medium text-gray-700">Support Staff:</span>
                  <ul className="mt-1 ml-4 list-disc space-y-1">
                    {taskData.taskSupportStaff.map((code, index) => (
                      <li key={code} className="text-gray-900 flex items-center gap-1">
                        <div 
                          className="w-2 h-2 rounded-full" 
                          style={{ backgroundColor: taskData.task_support_colors?.[index] || '#3b82f6' }}
                        ></div>
                        {getStaffName(code)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="text-sm bg-yellow-50 p-2 rounded border border-yellow-200 mt-2">
                <p className="text-yellow-800 flex items-start">
                  <Bell className="h-4 w-4 mr-1 mt-0.5 flex-shrink-0" />
                  <span>
                    These staff members will receive notifications about this task assignment.
                  </span>
                </p>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowConfirmDialog(false)
                  setPendingSubmit(null)
                }}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={async () => {
                  if (pendingSubmit) {
                    await pendingSubmit()
                  }
                }}
                disabled={isSaving}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Confirm & Save
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}