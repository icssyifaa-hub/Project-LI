'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
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
import { Combobox } from '@/components/ui/combobox'
import { 
  Briefcase, 
  Plus, 
  X,
  GripVertical,
  Search,
  Save,
  Trash2,
  Loader2,
  Edit2,
  FileText,
  Calendar,
  Eye,
  AlertCircle,
  MapPin
} from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS as DndCSS } from '@dnd-kit/utilities'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/use-toast'
// PDFs removed per request: use job order number/final report number instead
import { getDotClass } from '@/lib/colors'
import {
  Client,
  fetchClients,
  findClient,
  getLocationsForClient,
  getUniqueClientNames,
} from '@/lib/settings/clients'
import { fetchJobTaskNames } from '@/lib/settings/job-tasks'
import {
  JOB_ORDER_NUMBER_EXAMPLE,
  normalizeJobOrderNumber,
  validateJobOrderNumberFormat,
} from '@/lib/reports/number-formats'
import { getMissingSchemaColumn, getSupabaseSchemaErrorMessage } from '@/lib/supabase/schema-errors'
import { getTaskClient, TASK_CLIENT_SELECT, type TaskClientRecord } from '@/lib/settings/task-client'
import { createJobGroupId, getTaskJobGroupId } from '@/lib/job-groups'

export interface UnscheduledTask {
  id: string
  clientName: string
  clientId?: string
  location?: string
  address?: string
  jobTask: string
  task_pic_id: string
  task_pic_name?: string
  task_pic_color?: string
  jobOrderNumber?: string
  jobGroupId?: string
  createdAt: Date
  notes?: string
  timeStart?: string
  timeStop?: string
  additionalRemark?: string
  task_support_ids?: string[]
  task_support_names?: string[]
  task_support_colors?: string[]
  finalReportNumber?: string
  jobStatus?: 'onhold' | 'in-progress' | 'completed' | 'incomplete' | 'ongoing' | 'upcoming'
}

interface TaskInboxProps {
  onDragStart: (task: UnscheduledTask) => void
  onDragEnd: (taskId: string, date: Date | null) => void
  onTaskClick?: (task: UnscheduledTask) => void
  onTaskSaved?: () => void
  onUnreadCountChange?: (count: number) => void
  refreshKey?: number
  focusedTaskId?: string | null
  onFocusedTaskHandled?: () => void
}

interface JobTask {
  id: string
  name: string
}

interface Staff {
  id: string
  name: string
  color?: string
  is_active?: boolean
}

// PDF viewer removed — using job order number/final report number fields instead

const normalizeText = (value?: string | null) => String(value || '').trim().toLowerCase()

const toTextList = (value?: string | string[] | null): string[] => {
  if (Array.isArray(value)) {
    return value.map(item => String(item).trim()).filter(Boolean)
  }

  return String(value || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
}

const findStaffForPic = (
  staffList: Staff[],
  picId?: string | null,
  picName?: string | null
) => {
  const normalizedPicId = normalizeText(picId)
  const normalizedPicName = normalizeText(picName)

  return staffList.find((staff) => {
    const staffId = normalizeText(staff.id)
    const staffName = normalizeText(staff.name)

    return (
      (!!normalizedPicId && (staffId === normalizedPicId || staffName === normalizedPicId)) ||
      (!!normalizedPicName && staffName === normalizedPicName)
    )
  })
}

const getTaskPicDetails = (staffList: Staff[], task: Pick<UnscheduledTask, 'task_pic_id' | 'task_pic_name' | 'task_pic_color'>) => {
  const staff = findStaffForPic(staffList, task.task_pic_id, task.task_pic_name)

  return {
    id: staff?.id || task.task_pic_id || '',
    name: staff?.name || task.task_pic_name || '',
    color: staff?.color || task.task_pic_color || 'blue',
  }
}

function SortableTaskItem({ 
  task, 
  onTaskClick,
  onEdit,
  onRequestDelete,
  isDeleting,
  isFocused
}: { 
  task: UnscheduledTask, 
  onTaskClick?: (task: UnscheduledTask) => void,
  onEdit?: (task: UnscheduledTask) => void,
  onRequestDelete?: (task: UnscheduledTask) => void,
  isDeleting?: boolean,
  isFocused?: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: DndCSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
    zIndex: isSortableDragging ? 999 : 'auto',
  }

  // PDFs removed; no preview state needed

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    onRequestDelete?.(task)
  }

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    onEdit?.(task)
  }

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        data-task-inbox-id={task.id}
        className={`rounded-lg border bg-white p-3 shadow-sm transition-all hover:shadow-md dark:bg-gray-900 ${
          isSortableDragging ? 'shadow-lg rotate-2 scale-105' : ''
        } ${isDeleting ? 'opacity-50' : ''} ${
          isFocused
            ? 'border-blue-500 ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-50 dark:border-blue-400 dark:ring-blue-400 dark:ring-offset-gray-950'
            : 'border-gray-200 dark:border-gray-800'
        }`}
      >
        <div className="flex items-start gap-2">
          <div 
            {...listeners} 
            className="cursor-grab hover:text-blue-600 mt-1 flex-shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-4 w-4 text-gray-400 dark:text-gray-500" />
          </div>

          <div className="min-w-0 flex-1 cursor-pointer" onClick={() => onTaskClick?.(task)}>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
              <h4 className="break-words text-sm font-medium text-gray-900 dark:text-gray-100">{task.clientName}</h4>
            </div>
            {task.location && (
              <div
                className="mt-1 flex min-w-0 items-start gap-1 text-xs text-gray-500 dark:text-gray-400"
                title={task.address ? `${task.location} - ${task.address}` : task.location}
              >
                <MapPin className="mt-0.5 h-3 w-3 flex-shrink-0" />
                <span className="min-w-0 break-words">{task.location}</span>
              </div>
            )}
            
            <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
              {task.jobTask && <span className="mr-1 inline-block max-w-full break-words rounded bg-gray-100 px-1 font-mono dark:bg-gray-800 dark:text-gray-200">{task.jobTask}</span>}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex min-w-0 items-center">
                <div className={`mr-1 h-2 w-2 flex-shrink-0 rounded-full ${getDotClass(task.task_pic_color)}`}></div>
                <span className="min-w-0 break-words">{task.task_pic_name || 'No PIC'}</span>
              </span>
              {task.jobOrderNumber && (
                  <span className="flex min-w-0 items-center">
                    <FileText className="mr-1 h-3 w-3 flex-shrink-0" />
                    <span className="min-w-0 break-words">Job Order: {task.jobOrderNumber}</span>
                  </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {/* No PDF preview button when using job order number/final report number */}
            <button
              onClick={handleEdit}
              className="p-1 hover:bg-gray-100 rounded transition-colors dark:hover:bg-gray-800"
              disabled={isDeleting}
            >
              <Edit2 className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
            </button>
            <button
              onClick={handleDelete}
              className="p-1 hover:bg-red-100 rounded transition-colors dark:hover:bg-red-950/50"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-red-500" />
              ) : (
                <Trash2 className="h-3.5 w-3.5 text-red-500" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* No PDF viewer — using job order number/final report number instead */}
    </>
  )
}

function AddTaskModal({ 
  isOpen, 
  onClose, 
  onAdd,
  staffList,
  jobTasks,
  clients
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  onAdd: (task: UnscheduledTask) => Promise<void>,
  staffList: Staff[],
  jobTasks: JobTask[],
  clients: Client[]
}) {
  const [formData, setFormData] = useState({
    clientName: '',
    clientId: '',
    location: '',
    address: '',
    jobTask: '',
    task_pic_id: '',
    jobOrderNumber: '',
  })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<{[key: string]: string}>({})
  const [touched, setTouched] = useState<{[key: string]: boolean}>({})
  const { toast } = useToast()
  const supabase = createClient()
  const activeStaffList = staffList.filter((staff) => staff.is_active !== false)

  const checkTaskNumberExists = async (
    column: 'job_order_number',
    value: string
  ): Promise<boolean> => {
    if (!value || value.trim() === '') return false
    
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('id')
        .eq(column, value.trim())
        .maybeSingle()
      
      if (error) throw error
      return !!data
    } catch (error) {
      console.error(`Error checking ${column}:`, error)
      return false
    }
  }

  useEffect(() => {
    if (isOpen) {
      setFormData({
        clientName: '',
        clientId: '',
        location: '',
        address: '',
        jobTask: '',
        task_pic_id: '',
        jobOrderNumber: '',
      })
      setErrors({})
      setTouched({})
    }
  }, [isOpen])

  useEffect(() => {
    const jobOrderNumber = normalizeJobOrderNumber(formData.jobOrderNumber)
    if (!jobOrderNumber) {
      setErrors(prev => {
        if (!prev.jobOrderNumber?.includes('already exists')) return prev
        const next = { ...prev }
        delete next.jobOrderNumber
        return next
      })
      return
    }
    if (!validateJobOrderNumberFormat(jobOrderNumber)) return

    const timer = setTimeout(async () => {
      const exists = await checkTaskNumberExists('job_order_number', jobOrderNumber)
      setTouched(prev => ({ ...prev, jobOrderNumber: true }))
      setErrors(prev => {
        const next = { ...prev }
        if (next.jobOrderNumber?.includes('already exists')) delete next.jobOrderNumber
        if (exists) {
          next.jobOrderNumber = `Job Order Number "${jobOrderNumber}" already exists. Please use a different number.`
        }
        return next
      })
    }, 800)

    return () => clearTimeout(timer)
  }, [formData.jobOrderNumber])

  // No file inputs: using jobOrderNumber instead

  const validateField = (field: string, value: string): string => {
    switch (field) {
      case 'clientName':
        if (!value.trim()) return 'Client Name is required'
        if (value.length < 2) return 'Client name must be at least 2 characters'
        return ''
      case 'location':
        if (getLocationsForClient(clients, formData.clientName).length > 0 && !value.trim()) return 'Location is required'
        return ''
      case 'jobTask':
        if (!value.trim()) return 'Job Task is required'
        return ''
      case 'task_pic_id':
        if (!value) return 'PIC is required'
        return ''
      case 'jobOrderNumber':
        if (value && !validateJobOrderNumberFormat(value)) {
          return `Job Order Number must use format ${JOB_ORDER_NUMBER_EXAMPLE}`
        }
        return ''
      default:
        return ''
    }
  }

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }))
    const error = validateField(field, formData[field as keyof typeof formData] as string)
    setErrors(prev => ({ ...prev, [field]: error }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate all fields
    const newErrors: {[key: string]: string} = {}
    const clientNameError = validateField('clientName', formData.clientName)
    if (clientNameError) newErrors.clientName = clientNameError
    const locationError = validateField('location', formData.location)
    if (locationError) newErrors.location = locationError
    const jobTaskError = validateField('jobTask', formData.jobTask)
    if (jobTaskError) newErrors.jobTask = jobTaskError
    const picError = validateField('task_pic_id', formData.task_pic_id)
    if (picError) newErrors.task_pic_id = picError
    const jobOrderNumberError = validateField('jobOrderNumber', formData.jobOrderNumber)
    if (jobOrderNumberError) newErrors.jobOrderNumber = jobOrderNumberError
    
    const normalizedJobOrderNumber = normalizeJobOrderNumber(formData.jobOrderNumber)
    if (normalizedJobOrderNumber && !jobOrderNumberError) {
      const exists = await checkTaskNumberExists('job_order_number', normalizedJobOrderNumber)
      if (exists) {
        newErrors.jobOrderNumber = `Job Order Number "${normalizedJobOrderNumber}" already exists. Please use a different number.`
      }
    }

    setErrors(newErrors)
    
    if (Object.keys(newErrors).length > 0) {
      toast({
        title: "Validation Error",
        description: Object.values(newErrors)[0],
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    try {
      const selectedStaff = findStaffForPic(staffList, formData.task_pic_id)

      const newTask: UnscheduledTask = {
        id: `temp-${Date.now()}`,
        clientName: formData.clientName,
        clientId: formData.clientId,
        location: formData.location,
        address: formData.address,
        jobTask: formData.jobTask,
        task_pic_id: selectedStaff?.id || formData.task_pic_id,
        task_pic_name: selectedStaff?.name,
        task_pic_color: selectedStaff?.color || 'blue',
        jobOrderNumber: normalizedJobOrderNumber || undefined,
        createdAt: new Date()
      }

      await onAdd(newTask)
      onClose()
      
      toast({
        title: "Success",
        description: "Task created successfully",
      })
    } catch (error: any) {
      console.error('Error in handleSubmit:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to create task",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
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

  if (!isOpen) return null

  const clientNameOptions = getUniqueClientNames(clients).map((name) => ({ value: name, label: name }))
  if (formData.clientName && !clientNameOptions.some((option) => option.value === formData.clientName)) {
    clientNameOptions.push({ value: formData.clientName, label: `${formData.clientName} (current)` })
  }
  const availableLocations = getLocationsForClient(clients, formData.clientName)
  const selectedClient = findClient(clients, {
    id: formData.clientId,
    clientName: formData.clientName,
    location: formData.location,
  })
  const hasLegacyLocation =
    formData.location &&
    !availableLocations.some((item) => item.id === (selectedClient?.id || formData.clientId) || item.location === formData.location)
  const legacyClientValue = hasLegacyLocation ? `legacy-${formData.location}` : ''
  const selectedClientValue = selectedClient?.id || formData.clientId || legacyClientValue

  const handleClientNameSelect = (clientName: string) => {
    const locations = getLocationsForClient(clients, clientName)
    const nextLocation = locations.length === 1 ? locations[0] : undefined
    setFormData({
      ...formData,
      clientName,
      clientId: nextLocation?.id || '',
      location: nextLocation?.location || '',
      address: nextLocation?.address || '',
    })
    if (touched.clientName) {
      setErrors(prev => ({ ...prev, clientName: validateField('clientName', clientName) }))
    }
  }

  const handleClientSelect = (clientId: string) => {
    if (clientId.startsWith('legacy-')) {
      setFormData({
        ...formData,
        clientId: '',
        location: clientId.replace(/^legacy-/, ''),
        address: '',
      })
      return
    }

    const selectedLocation = clients.find((item) => item.id === clientId)
    setFormData({
      ...formData,
      clientId,
      clientName: selectedLocation?.client_name || formData.clientName,
      location: selectedLocation?.location || '',
      address: selectedLocation?.address || '',
    })
    if (touched.location) {
      setErrors(prev => ({ ...prev, location: validateField('location', selectedLocation?.location || '') }))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4">
      <div className="flex max-h-[90vh] w-full max-w-md flex-col rounded-lg bg-white">
        <div className="flex items-center justify-between gap-3 border-b p-4">
          <h3 className="min-w-0 truncate font-semibold">New Unscheduled Task</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          <div className="space-y-2">
            <Label className="font-medium text-gray-900">Job Order Number</Label>
            <Input
              value={formData.jobOrderNumber}
              onChange={(e) => {
                const value = normalizeJobOrderNumber(e.target.value)
                setFormData({...formData, jobOrderNumber: value})
                if (touched.jobOrderNumber) {
                  const error = validateField('jobOrderNumber', value)
                  setErrors(prev => ({ ...prev, jobOrderNumber: error }))
                }
              }}
              onBlur={() => handleBlur('jobOrderNumber')}
              placeholder={JOB_ORDER_NUMBER_EXAMPLE}
              className={`border-gray-300 bg-white ${touched.jobOrderNumber && errors.jobOrderNumber ? 'border-red-500' : ''}`}
            />
            <ErrorMessage field="jobOrderNumber" />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-700 font-medium">
              Client Name <span className="text-red-500">*</span>
            </Label>
            <Combobox
              options={clientNameOptions}
              value={formData.clientName}
              onValueChange={handleClientNameSelect}
              onBlur={() => handleBlur('clientName')}
              placeholder="Select client"
              emptyMessage="No clients found."
              disabled={saving}
              className={touched.clientName && errors.clientName ? 'border-red-500' : ''}
            />
            <ErrorMessage field="clientName" />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-700 font-medium">
              Location <span className={availableLocations.length > 0 ? 'text-red-500' : 'text-gray-400'}>{availableLocations.length > 0 ? '*' : '(Optional)'}</span>
            </Label>
            <Select
              value={selectedClientValue}
              onValueChange={handleClientSelect}
              onOpenChange={() => handleBlur('location')}
              disabled={saving || !formData.clientName || availableLocations.length === 0}
            >
              <SelectTrigger className={`border-gray-300 bg-white ${touched.location && errors.location ? 'border-red-500' : ''}`}>
                {formData.location ? (
                  <span className="truncate">{formData.location}</span>
                ) : (
                  <span className="text-muted-foreground">{formData.clientName ? 'Select location' : 'Select client first'}</span>
                )}
              </SelectTrigger>
              <SelectContent
                className="max-h-80 overflow-hidden border border-gray-200 bg-white text-gray-900 shadow-lg dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                viewportClassName="h-auto max-h-52 overflow-y-auto overscroll-contain"
              >
                {hasLegacyLocation && (
                  <SelectItem value={legacyClientValue}>{formData.location} (current)</SelectItem>
                )}
                {availableLocations.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ErrorMessage field="location" />
          </div>

          {/* Job Task - SEARCHABLE COMBOBOX */}
          <div className="space-y-2">
            <Label className="text-gray-700 font-medium">
              Job Task <span className="text-red-500">*</span>
            </Label>
            <Combobox
              options={jobTasks.map(jt => ({ value: jt.name, label: jt.name }))}
              value={formData.jobTask}
              onValueChange={(value) => {
                setFormData({...formData, jobTask: value})
                if (touched.jobTask) {
                  const error = validateField('jobTask', value)
                  setErrors(prev => ({ ...prev, jobTask: error }))
                }
              }}
              onBlur={() => handleBlur('jobTask')}
              placeholder="Select job task"
              emptyMessage="No job tasks found."
              disabled={saving}
              className={touched.jobTask && errors.jobTask ? 'border-red-500' : ''}
            />
            <ErrorMessage field="jobTask" />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-700 font-medium">
              PIC (Person In Charge) <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.task_pic_id}
              onValueChange={(value) => {
                setFormData({...formData, task_pic_id: value})
                if (touched.task_pic_id) {
                  const error = validateField('task_pic_id', value)
                  setErrors(prev => ({ ...prev, task_pic_id: error }))
                }
              }}
              onOpenChange={() => handleBlur('task_pic_id')}
            >
              <SelectTrigger className={`bg-white border-gray-300 ${touched.task_pic_id && errors.task_pic_id ? 'border-red-500' : ''}`}>
                {formData.task_pic_id ? (
                  <span className="truncate">
                    {staffList.find(s => s.id === formData.task_pic_id)?.name || 'Select PIC'}
                  </span>
                ) : (
                  <span className="text-muted-foreground">Select PIC</span>
                )}
              </SelectTrigger>
              <SelectContent
                className="max-h-80 overflow-hidden border border-gray-200 bg-white shadow-lg"
                viewportClassName="h-auto max-h-52 overflow-y-auto overscroll-contain"
              >
                {activeStaffList.map((staff) => (
                  <SelectItem key={staff.id} value={staff.id} textValue={staff.name}>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${getDotClass(staff.color)}`}></div>
                      <span>{staff.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ErrorMessage field="task_pic_id" />
          </div>

          <div className="flex flex-col gap-2 pt-2 sm:flex-row">
            <Button 
              type="submit" 
              disabled={saving}
              className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Create Task
            </Button>
            <Button type="button" variant="outline" onClick={onClose} className="sm:w-auto">Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

function EditTaskModal({ 
  task, 
  isOpen, 
  onClose, 
  onSave,
  staffList,
  jobTasks,
  clients
}: { 
  task: UnscheduledTask | null, 
  isOpen: boolean, 
  onClose: () => void, 
  onSave: (task: UnscheduledTask) => Promise<void>,
  staffList: Staff[],
  jobTasks: JobTask[],
  clients: Client[]
}) {
  const [formData, setFormData] = useState({
    clientName: '',
    clientId: '',
    location: '',
    address: '',
    jobTask: '',
    task_pic_id: '',
    jobOrderNumber: '',
  })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<{[key: string]: string}>({})
  const [touched, setTouched] = useState<{[key: string]: boolean}>({})
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    if (task && isOpen) {
      let picId = task.task_pic_id || ''
      const currentStaff = findStaffForPic(staffList, picId, task.task_pic_name)
      
      if (currentStaff) {
        picId = currentStaff.id
      }
      
      const jobTaskValue = task.jobTask || ''
      const clientName = task.clientName || ''
      const taskLocation = task.location || ''
      const clientLocations = getLocationsForClient(clients, clientName)
      const matchingClient = findClient(clients, {
        id: task.clientId,
        clientName,
        location: taskLocation,
      })
      const onlyClientLocation = !taskLocation && clientLocations.length === 1 ? clientLocations[0] : undefined
      const resolvedClient = matchingClient || onlyClientLocation
      
      setFormData({
        clientName: clientName || resolvedClient?.client_name || '',
        clientId: resolvedClient?.id || task.clientId || '',
        location: taskLocation || resolvedClient?.location || '',
        address: task.address || resolvedClient?.address || '',
        jobTask: jobTaskValue,
        task_pic_id: picId,
        jobOrderNumber: task.jobOrderNumber || '',
      })
      setErrors({})
      setTouched({})
    }
  }, [task, isOpen, staffList, clients])

  useEffect(() => {
    if (!isOpen || !task || clients.length === 0) return

    const selectedLocation = findClient(clients, {
      id: formData.clientId,
      clientName: formData.clientName,
      location: formData.location || task.location,
    })
    if (!selectedLocation) return

    setFormData((prev) => {
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
    task,
    clients,
    formData.clientId,
    formData.clientName,
    formData.location,
  ])

  const validateField = (field: string, value: string): string => {
    switch (field) {
      case 'clientName':
        if (!value.trim()) return 'Client Name is required'
        if (value.length < 2) return 'Client name must be at least 2 characters'
        return ''
      case 'location':
        if (getLocationsForClient(clients, formData.clientName).length > 0 && !value.trim()) return 'Location is required'
        return ''
      case 'jobTask':
        if (!value.trim()) return 'Job Task is required'
        return ''
      case 'task_pic_id':
        if (!value) return 'PIC is required'
        return ''
      case 'jobOrderNumber':
        if (value && !validateJobOrderNumberFormat(value)) {
          return `Job Order Number must use format ${JOB_ORDER_NUMBER_EXAMPLE}`
        }
        return ''
      default:
        return ''
    }
  }

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }))
    const error = validateField(field, formData[field as keyof typeof formData] as string)
    setErrors(prev => ({ ...prev, [field]: error }))
  }

  // No file inputs for edit modal; using number fields instead

  const checkJobOrderNumberExists = async (jobOrderNumber: string): Promise<boolean> => {
    if (!jobOrderNumber || !task?.id) return false

    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('id')
        .eq('job_order_number', jobOrderNumber)
        .maybeSingle()

      if (error) throw error
      return !!data && data.id !== task.id
    } catch (error) {
      console.error('Error checking job order number:', error)
      return false
    }
  }

  useEffect(() => {
    const jobOrderNumber = normalizeJobOrderNumber(formData.jobOrderNumber)
    if (!jobOrderNumber) {
      setErrors(prev => {
        if (!prev.jobOrderNumber?.includes('already exists')) return prev
        const next = { ...prev }
        delete next.jobOrderNumber
        return next
      })
      return
    }
    if (!validateJobOrderNumberFormat(jobOrderNumber)) return

    const timer = setTimeout(async () => {
      const exists = await checkJobOrderNumberExists(jobOrderNumber)
      setTouched(prev => ({ ...prev, jobOrderNumber: true }))
      setErrors(prev => {
        const next = { ...prev }
        if (next.jobOrderNumber?.includes('already exists')) delete next.jobOrderNumber
        if (exists) {
          next.jobOrderNumber = `Job Order Number "${jobOrderNumber}" already exists. Please use a different number.`
        }
        return next
      })
    }, 800)

    return () => clearTimeout(timer)
  }, [formData.jobOrderNumber, task?.id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate all fields
    const newErrors: {[key: string]: string} = {}
    const clientNameError = validateField('clientName', formData.clientName)
    if (clientNameError) newErrors.clientName = clientNameError
    const locationError = validateField('location', formData.location || task?.location || '')
    if (locationError) newErrors.location = locationError
    const jobTaskError = validateField('jobTask', formData.jobTask)
    if (jobTaskError) newErrors.jobTask = jobTaskError
    const picError = validateField('task_pic_id', formData.task_pic_id)
    if (picError) newErrors.task_pic_id = picError
    const jobOrderNumberError = validateField('jobOrderNumber', formData.jobOrderNumber)
    if (jobOrderNumberError) newErrors.jobOrderNumber = jobOrderNumberError

    const normalizedJobOrderNumber = normalizeJobOrderNumber(formData.jobOrderNumber)
    if (normalizedJobOrderNumber && !jobOrderNumberError) {
      const exists = await checkJobOrderNumberExists(normalizedJobOrderNumber)
      if (exists) {
        newErrors.jobOrderNumber = `Job Order Number "${normalizedJobOrderNumber}" already exists. Please use a different number.`
      }
    }
    
    setErrors(newErrors)
    
    if (Object.keys(newErrors).length > 0) {
      toast({
        title: "Validation Error",
        description: Object.values(newErrors)[0],
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    try {
      const selectedStaff = findStaffForPic(staffList, formData.task_pic_id, task!.task_pic_name)
      const selectedClient = findClient(clients, {
        id: formData.clientId,
        clientName: formData.clientName,
        location: formData.location || task!.location,
      })
      const resolvedClientId = selectedClient?.id || formData.clientId
      const resolvedLocation = selectedClient?.location || formData.location || task!.location
      const resolvedAddress = selectedClient?.address || formData.address || task!.address

      const updatedTask: UnscheduledTask = {
        ...task!,
        clientName: formData.clientName,
        clientId: resolvedClientId,
        location: resolvedLocation,
        address: resolvedAddress,
        jobTask: formData.jobTask,
        task_pic_id: selectedStaff?.id || formData.task_pic_id,
        task_pic_name: selectedStaff?.name,
        task_pic_color: selectedStaff?.color || 'blue',
        jobOrderNumber: normalizedJobOrderNumber || undefined,
      }

      await onSave(updatedTask)
      onClose()
      
      toast({
        title: "Success",
        description: "Task updated successfully",
      })
    } catch (error: any) {
      console.error('Error saving task:', error)
      toast({
        title: "Error",
        description: getSupabaseSchemaErrorMessage(error) || error.message || "Failed to save task",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
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

  if (!isOpen || !task) return null
  const selectedPic = findStaffForPic(staffList, formData.task_pic_id, task.task_pic_name)
  const selectedPicLabel = selectedPic?.name || task.task_pic_name || formData.task_pic_id
  const selectedPicValue = selectedPic?.id || formData.task_pic_id || ''
  const selectedPicColor = selectedPic?.color || task.task_pic_color || 'blue'
  const hasSelectedPicOption = staffList.some(staff => staff.id === selectedPicValue)
  const clientNameOptions = getUniqueClientNames(clients).map((name) => ({ value: name, label: name }))
  if (formData.clientName && !clientNameOptions.some((option) => option.value === formData.clientName)) {
    clientNameOptions.push({ value: formData.clientName, label: `${formData.clientName} (current)` })
  }
  const selectedClient = findClient(clients, {
    id: formData.clientId,
    clientName: formData.clientName,
    location: formData.location || task.location,
  })
  const resolvedClientName = selectedClient?.client_name || formData.clientName
  const availableLocations = getLocationsForClient(clients, resolvedClientName)
  const effectiveLocation = selectedClient?.location || formData.location || task.location || ''
  const effectiveAddress = selectedClient?.address || formData.address || task.address || ''
  const hasLegacyLocation =
    effectiveLocation &&
    !availableLocations.some((item) => item.id === (selectedClient?.id || formData.clientId) || item.location === effectiveLocation)
  const legacyClientValue = hasLegacyLocation ? `legacy-${effectiveLocation}` : ''
  const selectedClientValue = selectedClient?.id || formData.clientId || legacyClientValue
  const selectedLocationLabel = effectiveLocation

  const handleClientNameSelect = (clientName: string) => {
    const locations = getLocationsForClient(clients, clientName)
    const currentLocationStillValid = locations.some((item) => item.location === formData.location)
    const nextLocation = locations.length === 1
      ? locations[0]
      : currentLocationStillValid
        ? findClient(locations, { clientName, location: formData.location })
        : undefined

    setFormData({
      ...formData,
      clientName,
      clientId: nextLocation?.id || '',
      location: nextLocation?.location || '',
      address: nextLocation?.address || '',
    })
    if (touched.clientName) {
      setErrors(prev => ({ ...prev, clientName: validateField('clientName', clientName) }))
    }
  }

  const handleClientSelect = (clientId: string) => {
    if (clientId.startsWith('legacy-')) {
      const location = clientId.replace(/^legacy-/, '')
      setFormData({
        ...formData,
        clientId: '',
        location,
        address: location === effectiveLocation ? effectiveAddress : '',
      })
      return
    }

    const selectedLocation = clients.find((item) => item.id === clientId)
    setFormData({
      ...formData,
      clientId,
      clientName: selectedLocation?.client_name || formData.clientName,
      location: selectedLocation?.location || '',
      address: selectedLocation?.address || '',
    })
    if (touched.location) {
      setErrors(prev => ({ ...prev, location: validateField('location', selectedLocation?.location || '') }))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4">
      <div className="flex max-h-[90vh] w-full max-w-md flex-col rounded-lg bg-white">
        <div className="flex items-center justify-between gap-3 border-b p-4">
          <h3 className="min-w-0 truncate font-semibold">Edit Task</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          <div className="space-y-2">
            <Label className="font-medium text-gray-900">Job Order Number</Label>
            <Input
              value={formData.jobOrderNumber}
              onChange={(e) => {
                const value = normalizeJobOrderNumber(e.target.value)
                setFormData({...formData, jobOrderNumber: value})
                if (touched.jobOrderNumber) {
                  const error = validateField('jobOrderNumber', value)
                  setErrors(prev => ({ ...prev, jobOrderNumber: error }))
                }
              }}
              onBlur={() => handleBlur('jobOrderNumber')}
              placeholder={JOB_ORDER_NUMBER_EXAMPLE}
              className={`border-gray-300 bg-white ${touched.jobOrderNumber && errors.jobOrderNumber ? 'border-red-500' : ''}`}
            />
            <ErrorMessage field="jobOrderNumber" />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-700 font-medium">Client Name <span className="text-red-500">*</span></Label>
            <Combobox
              options={clientNameOptions}
              value={formData.clientName}
              onValueChange={handleClientNameSelect}
              onBlur={() => handleBlur('clientName')}
              placeholder="Select client"
              emptyMessage="No clients found."
              disabled={saving}
              className={touched.clientName && errors.clientName ? 'border-red-500' : ''}
            />
            <ErrorMessage field="clientName" />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-700 font-medium">
              Location <span className={availableLocations.length > 0 ? 'text-red-500' : 'text-gray-400'}>{availableLocations.length > 0 ? '*' : '(Optional)'}</span>
            </Label>
            <Select
              value={selectedClientValue}
              onValueChange={handleClientSelect}
              onOpenChange={() => handleBlur('location')}
              disabled={saving || !formData.clientName}
            >
              <SelectTrigger className={`bg-white border-gray-300 ${touched.location && errors.location ? 'border-red-500' : ''}`}>
                {selectedLocationLabel ? (
                  <span className="truncate">{selectedLocationLabel}</span>
                ) : (
                  <span className="text-muted-foreground">{formData.clientName ? 'Select location' : 'Select client first'}</span>
                )}
              </SelectTrigger>
              <SelectContent
                className="z-[80] max-h-80 overflow-hidden border border-gray-200 bg-white text-gray-900 shadow-lg dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                viewportClassName="h-auto max-h-52 overflow-y-auto overscroll-contain"
              >
                {hasLegacyLocation && (
                  <SelectItem value={legacyClientValue}>{effectiveLocation} (current)</SelectItem>
                )}
                {availableLocations.length === 0 && (
                  <div className="px-2 py-2 text-sm text-gray-500 dark:text-gray-400">
                    No locations found for this client.
                  </div>
                )}
                {availableLocations.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ErrorMessage field="location" />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-700 font-medium">Job Task <span className="text-red-500">*</span></Label>
            <Combobox
              options={jobTasks.map(jt => ({ value: jt.name, label: jt.name }))}
              value={formData.jobTask}
              onValueChange={(value) => {
                setFormData({...formData, jobTask: value})
                if (touched.jobTask) {
                  const error = validateField('jobTask', value)
                  setErrors(prev => ({ ...prev, jobTask: error }))
                }
              }}
              onBlur={() => handleBlur('jobTask')}
              placeholder="Select job task"
              emptyMessage="No job tasks found."
              disabled={saving}
              className={touched.jobTask && errors.jobTask ? 'border-red-500' : ''}
            />
            <ErrorMessage field="jobTask" />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-700 font-medium">PIC (Person In Charge) <span className="text-red-500">*</span></Label>
            <Select
              value={selectedPicValue}
              onValueChange={(value) => {
                setFormData({...formData, task_pic_id: value})
                if (touched.task_pic_id) {
                  const error = validateField('task_pic_id', value)
                  setErrors(prev => ({ ...prev, task_pic_id: error }))
                }
              }}
              disabled={saving}
              onOpenChange={() => handleBlur('task_pic_id')}
            >
              <SelectTrigger className={`bg-white border-gray-300 ${touched.task_pic_id && errors.task_pic_id ? 'border-red-500' : ''}`}>
                {selectedPicValue && selectedPicLabel ? (
                  <div className="flex min-w-0 items-center gap-2 truncate">
                    <span className={`h-3 w-3 flex-shrink-0 rounded-full ${getDotClass(selectedPicColor)}`} />
                    <span className="truncate">{selectedPicLabel}</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">Select PIC</span>
                )}
              </SelectTrigger>
              <SelectContent
                className="max-h-80 overflow-hidden border border-gray-200 bg-white shadow-lg"
                viewportClassName="h-auto max-h-52 overflow-y-auto overscroll-contain"
              >
                {selectedPicValue && selectedPicLabel && !hasSelectedPicOption && (
                  <SelectItem value={selectedPicValue} textValue={selectedPicLabel}>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${getDotClass(selectedPicColor)}`}></div>
                      <span>{selectedPicLabel}</span>
                    </div>
                  </SelectItem>
                )}
                {staffList.map((staff) => (
                  <SelectItem key={staff.id} value={staff.id} textValue={staff.name}>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${getDotClass(staff.color)}`}></div>
                      <span>{staff.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ErrorMessage field="task_pic_id" />
          </div>

          <div className="flex flex-col gap-2 pt-2 sm:flex-row">
            <Button type="submit" disabled={saving} className="flex-1 bg-blue-600 text-white hover:bg-blue-700">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save Changes
            </Button>
            <Button type="button" variant="outline" onClick={onClose} className="sm:w-auto">Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function TaskInbox({ onDragStart, onDragEnd, onTaskClick, onTaskSaved, onUnreadCountChange, refreshKey = 0, focusedTaskId = null, onFocusedTaskHandled }: TaskInboxProps) {
  const [tasks, setTasks] = useState<UnscheduledTask[]>([])
  const [filter, setFilter] = useState('')
  const [activeFocusedTaskId, setActiveFocusedTaskId] = useState<string | null>(focusedTaskId)
  const [showAddModal, setShowAddModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingTask, setEditingTask] = useState<UnscheduledTask | null>(null)
  const [pendingDeleteTask, setPendingDeleteTask] = useState<UnscheduledTask | null>(null)
  const [staffList, setStaffList] = useState<Staff[]>([])
  const [jobTasks, setJobTasks] = useState<JobTask[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loadingData, setLoadingData] = useState(true)

  const { toast } = useToast()
  const supabase = useMemo(() => createClient(), [])
  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const realtimeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchAllData = useCallback(async (options: { silent?: boolean } = {}) => {
    if (!options.silent) {
      setLoadingData(true)
    }
    try {
      const { data: staffData, error: staffError } = await supabase
        .from('users')
        .select('id, name, color, is_active')
        .order('is_active', { ascending: false })
        .order('name')
      
      if (staffError) throw staffError
      
      const formattedStaff: Staff[] = (staffData || []).map((user: {id: string; name:string; color?: string; is_active?: boolean})=> ({
        id: String(user.id),
        name: user.name,
        color: user.color || 'blue',
        is_active: user.is_active,
      }))
      setStaffList(formattedStaff)
      
      const jobTaskNames = await fetchJobTaskNames(supabase)
      setJobTasks(jobTaskNames.map((name) => ({ id: name, name })))

      try {
        const clientData = await fetchClients(supabase)
        setClients(clientData)
      } catch {
        setClients([])
      }
      
      let { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select(TASK_CLIENT_SELECT)
        .is('date_start', null)
        .order('created_at', { ascending: false })

      if (tasksError) {
        const fallback = await supabase
          .from('tasks')
          .select('*')
          .is('date_start', null)
          .order('created_at', { ascending: false })

        tasksData = fallback.data
        tasksError = fallback.error
      }
      
      if (tasksError) throw tasksError
      
      const formattedTasks: UnscheduledTask[] = (tasksData || []).map((task: {
        id: string;
        client?: TaskClientRecord | TaskClientRecord[] | null;
        client_name: string;
        client_id: string | null;
        location: string | null;
        address: string | null;
        job_task: string;
        task_pic_id: string | null;
        task_pic_name: string | null;
        task_pic_color: string | null;
        job_order_number: string | null;
        final_report_number: string | null;
        created_at: string;
        additional_remark: string | null;
        time_start: string | null;
        time_stop: string | null;
        task_support_ids: string | string[] | null;
        task_support_names: string | string[] | null;
        task_support_colors: string | string[] | null;
        job_status: 'onhold' | 'in-progress' | 'completed' | 'incomplete' | 'ongoing' | 'upcoming' | null;
      }) => {
        const client = getTaskClient(task)
        const staffInfo = findStaffForPic(formattedStaff, task.task_pic_id, task.task_pic_name)
        const supportIds = toTextList(task.task_support_ids)
        const supportNames = toTextList(task.task_support_names)
        const supportColors = toTextList(task.task_support_colors)
        
        return {
          id: task.id,
          clientName: client.client_name || 'Unknown Client',
          clientId: client.id || undefined,
          location: client.location || undefined,
          address: client.address || undefined,
          jobTask: task.job_task || '',
          task_pic_id: staffInfo?.id || task.task_pic_id || '',
          task_pic_name: staffInfo?.name || task.task_pic_name || undefined,
          task_pic_color: staffInfo?.color || task.task_pic_color || 'blue',
          jobOrderNumber: task.job_order_number || undefined,
          jobGroupId: getTaskJobGroupId(task),
          createdAt: new Date(task.created_at),
          notes: task.additional_remark || undefined,
          additionalRemark: task.additional_remark || undefined,
          timeStart: task.time_start || undefined,
          timeStop: task.time_stop || undefined,
          task_support_ids: supportIds,
          task_support_names: supportNames,
          task_support_colors: supportColors,
          finalReportNumber: task.final_report_number || undefined,
          jobStatus: task.job_status || 'onhold',
        }
      })
      setTasks(formattedTasks)
      
      onUnreadCountChange?.(formattedTasks.length)
      
    } catch (error: any) {
      console.error('Error fetching data:', error)
      if (!options.silent) {
        toast({
          title: "Error",
          description: error?.message || "Failed to load data",
          variant: "destructive",
        })
      }
    } finally {
      if (!options.silent) {
        setLoadingData(false)
      }
    }
  }, [supabase, toast, onUnreadCountChange])

  useEffect(() => {
    fetchAllData()
  }, [fetchAllData, refreshKey])

  useEffect(() => {
    const scheduleRealtimeRefresh = () => {
      if (realtimeTimerRef.current) {
        clearTimeout(realtimeTimerRef.current)
      }

      realtimeTimerRef.current = setTimeout(() => {
        fetchAllData({ silent: true })
      }, 300)
    }

    const channel = supabase
      .channel('task-inbox-tasks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
        },
        () => {
          scheduleRealtimeRefresh()
        }
      )
      .subscribe((status) => {
        console.log('Task inbox realtime status:', status)
      })

    return () => {
      if (realtimeTimerRef.current) {
        clearTimeout(realtimeTimerRef.current)
        realtimeTimerRef.current = null
      }
      supabase.removeChannel(channel)
    }
  }, [fetchAllData, supabase])

  useEffect(() => {
    onUnreadCountChange?.(tasks.length)
  }, [tasks.length, onUnreadCountChange])

  useEffect(() => {
    if (!focusedTaskId || loadingData) return

    const focusedTask = tasks.find(task => task.id === focusedTaskId)
    if (!focusedTask) return

    setFilter('')
    setActiveFocusedTaskId(focusedTaskId)

    window.requestAnimationFrame(() => {
      const escapedTaskId = window.CSS?.escape ? window.CSS.escape(focusedTaskId) : focusedTaskId.replace(/"/g, '\\"')
      const element = document.querySelector(`[data-task-inbox-id="${escapedTaskId}"]`)
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })

    if (focusTimerRef.current) {
      clearTimeout(focusTimerRef.current)
    }

    focusTimerRef.current = setTimeout(() => {
      setActiveFocusedTaskId(null)
      onFocusedTaskHandled?.()
      focusTimerRef.current = null
    }, 5000)

    return () => {
      if (focusTimerRef.current) {
        clearTimeout(focusTimerRef.current)
        focusTimerRef.current = null
      }
    }
  }, [focusedTaskId, loadingData, tasks, onFocusedTaskHandled])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragStartEvent = (event: DragStartEvent) => {
    const task = tasks.find(t => t.id === event.active.id)
    if (task) {
      onDragStart(task)
    }
  }

  const handleDragEndEvent = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setTasks((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }


  const saveTaskToDatabase = async (taskData: UnscheduledTask, isNew: boolean = true) => {
    const userData = localStorage.getItem('user')
    const currentUser = userData ? JSON.parse(userData) : null
    const updatedAt = new Date().toISOString()
    
    const selectedStaff = findStaffForPic(staffList, taskData.task_pic_id, taskData.task_pic_name)
    const selectedClient = findClient(clients, {
      id: taskData.clientId,
      clientName: taskData.clientName,
      location: taskData.location,
    })
    const resolvedClientName = selectedClient?.client_name || taskData.clientName
    const resolvedClientId = selectedClient?.id || taskData.clientId || null
    const resolvedLocation = selectedClient?.location || taskData.location || null
    const resolvedAddress = selectedClient?.address || taskData.address || null

    const baseData = {
      client_name: resolvedClientName,
      client_id: resolvedClientId,
      location: resolvedLocation,
      address: resolvedAddress,
      job_task: taskData.jobTask,
      task_pic_id: selectedStaff?.id || taskData.task_pic_id,
      task_pic_name: selectedStaff?.name || taskData.task_pic_name,
      task_pic_color: selectedStaff?.color || taskData.task_pic_color || 'blue',
      job_order_number: taskData.jobOrderNumber || null,
      job_group_id: taskData.jobGroupId || createJobGroupId(),
      job_status: 'onhold',
      date_start: null,
      date_stop: null,
      created_by: currentUser?.id || null,
      updated_at: updatedAt
    }

    const dataToSave = isNew
      ? { ...baseData, created_at: new Date().toISOString() }
      : baseData

    try {
      let savedTask
      const safeDataToSave = { ...dataToSave }
      
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const result = isNew
          ? await supabase
              .from('tasks')
              .insert(safeDataToSave)
              .select()
              .single()
          : await supabase
              .from('tasks')
              .update(safeDataToSave)
              .eq('id', taskData.id)
              .select()
              .maybeSingle()

        if (!result.error) {
          savedTask = result.data
          break
        }

        const missingColumn = getMissingSchemaColumn(result.error)
        if (
          missingColumn?.table === 'tasks' &&
          Object.prototype.hasOwnProperty.call(safeDataToSave, missingColumn.column)
        ) {
          console.warn(`Retrying tasks save without missing database column: ${missingColumn.column}`)
          delete safeDataToSave[missingColumn.column as keyof typeof safeDataToSave]
          continue
        }

        throw result.error
      }

      if (!isNew && !savedTask) {
        const { data: refreshedTask, error: refreshError } = await supabase
          .from('tasks')
          .select('*')
          .eq('id', taskData.id)
          .maybeSingle()

        if (refreshError) throw refreshError

        if (refreshedTask?.updated_at === updatedAt) {
          savedTask = refreshedTask
        } else {
          throw new Error('Task update did not return an updated row. Please refresh and try again.')
        }
      }

      if (!savedTask) throw new Error('Failed to save task')

      // No PDF upload handling

      return savedTask
    } catch (error: any) {
      console.error('saveTaskToDatabase error:', error)
      throw error
    }
  }

  const handleAddTask = async (newTask: UnscheduledTask) => {
    setSaving(true)
    
    try {
      const normalizedJobOrderNumber = normalizeJobOrderNumber(newTask.jobOrderNumber || '')
      if (normalizedJobOrderNumber) {
        const { data: existingJobOrder } = await supabase
          .from('tasks')
          .select('id')
          .eq('job_order_number', normalizedJobOrderNumber)
          .maybeSingle()

        if (existingJobOrder) {
          throw new Error(`Job Order Number "${normalizedJobOrderNumber}" already exists. Please use a different number.`)
        }

        newTask.jobOrderNumber = normalizedJobOrderNumber
      }

      const savedTask = await saveTaskToDatabase(newTask, true)
      const savedPic = getTaskPicDetails(staffList, {
        task_pic_id: savedTask.task_pic_id || newTask.task_pic_id,
        task_pic_name: savedTask.task_pic_name || newTask.task_pic_name,
        task_pic_color: savedTask.task_pic_color || newTask.task_pic_color,
      })

      const finalTask: UnscheduledTask = {
        ...newTask,
        id: savedTask.id,
        clientId: savedTask.client_id || newTask.clientId,
        location: savedTask.location || newTask.location,
        address: savedTask.address || newTask.address,
        jobOrderNumber: savedTask.job_order_number,
        jobGroupId: getTaskJobGroupId(savedTask),
        task_pic_id: savedPic.id,
        task_pic_name: savedPic.name,
        task_pic_color: savedPic.color,
      }

      setTasks([finalTask, ...tasks])
      
      toast({
        title: "Success",
        description: "Task created successfully",
      })
      
      onTaskSaved?.()
    } catch (error: any) {
      console.error('Error in handleAddTask:', error)
      toast({
        title: "Error",
        description: getSupabaseSchemaErrorMessage(error) || error.message || "Failed to create task",
        variant: "destructive",
      })
      throw error
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateTask = async (updatedTask: UnscheduledTask) => {
    try {
      const normalizedJobOrderNumber = normalizeJobOrderNumber(updatedTask.jobOrderNumber || '')
      if (normalizedJobOrderNumber) {
        const { data: existingJobOrder } = await supabase
          .from('tasks')
          .select('id')
          .eq('job_order_number', normalizedJobOrderNumber)
          .maybeSingle()

        if (existingJobOrder && existingJobOrder.id !== updatedTask.id) {
          throw new Error(`Job Order Number "${normalizedJobOrderNumber}" already exists. Please use a different number.`)
        }

        updatedTask.jobOrderNumber = normalizedJobOrderNumber
      }

      const savedTask = await saveTaskToDatabase(updatedTask, false)
      const savedPic = getTaskPicDetails(staffList, {
        task_pic_id: savedTask.task_pic_id || updatedTask.task_pic_id,
        task_pic_name: savedTask.task_pic_name || updatedTask.task_pic_name,
        task_pic_color: savedTask.task_pic_color || updatedTask.task_pic_color,
      })
      
      const finalTask: UnscheduledTask = {
        ...updatedTask,
        clientId: savedTask.client_id || updatedTask.clientId,
        location: savedTask.location || updatedTask.location,
        address: savedTask.address || updatedTask.address,
        jobOrderNumber: savedTask.job_order_number,
        jobGroupId: getTaskJobGroupId(savedTask),
        task_pic_id: savedPic.id,
        task_pic_name: savedPic.name,
        task_pic_color: savedPic.color,
      }
      
      setTasks(tasks.map(t => t.id === finalTask.id ? finalTask : t))
      
      toast({
        title: "Success",
        description: "Task updated successfully",
      })
      
      onTaskSaved?.()
    } catch (error: any) {
      console.error('Error updating task:', error)
      toast({
        title: "Error",
        description: getSupabaseSchemaErrorMessage(error) || error.message || "Failed to update task",
        variant: "destructive",
      })
      throw error
    }
  }

  const handleEditTask = async (task: UnscheduledTask) => {
    try {
      let { data, error } = await supabase
        .from('tasks')
        .select(TASK_CLIENT_SELECT)
        .eq('id', task.id)
        .maybeSingle()

      if (error) {
        const fallback = await supabase
          .from('tasks')
          .select('*')
          .eq('id', task.id)
          .maybeSingle()

        data = fallback.data
        error = fallback.error
      }

      if (error) throw error

      const savedPic = getTaskPicDetails(staffList, {
        task_pic_id: data?.task_pic_id || task.task_pic_id,
        task_pic_name: data?.task_pic_name || task.task_pic_name,
        task_pic_color: data?.task_pic_color || task.task_pic_color,
      })
      const client = data ? getTaskClient(data) : null

      setEditingTask({
        ...task,
        task_pic_id: savedPic.id,
        task_pic_name: savedPic.name || task.task_pic_name,
        task_pic_color: savedPic.color,
        jobOrderNumber: data?.job_order_number || task.jobOrderNumber,
        jobGroupId: getTaskJobGroupId(data || task),
        clientId: client?.id || task.clientId,
        location: client?.location || task.location,
        address: client?.address || task.address,
      })
    } catch (error: any) {
      console.error('Error loading task for edit:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to load task details",
        variant: "destructive",
      })
    }
  }

  const handleDeleteTask = async (id: string) => {
    const taskToDelete = tasks.find(t => t.id === id)
    
    setDeletingId(id)
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id)

      if (error) throw error

      setTasks(tasks.filter(t => t.id !== id))

      toast({
        title: "Success",
        description: "Task deleted successfully",
      })
      setPendingDeleteTask(null)

      onTaskSaved?.()
    } catch (error: any) {
      console.error('Error deleting task:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete task",
        variant: "destructive",
      })
    } finally {
      setDeletingId(null)
    }
  }

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.clientName.toLowerCase().includes(filter.toLowerCase()) ||
                         task.jobTask.toLowerCase().includes(filter.toLowerCase()) ||
                         (task.location || '').toLowerCase().includes(filter.toLowerCase()) ||
                         (task.address || '').toLowerCase().includes(filter.toLowerCase())
    return matchesSearch
  })

  if (loadingData) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center rounded-lg border border-gray-200 bg-white p-4 text-center shadow-lg dark:border-gray-800 dark:bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading tasks...</p>
      </div>
    )
  }

  return (
    <>
      <div className="flex h-full min-h-0 flex-col rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-800 dark:bg-gray-900">
        <div className="border-b border-gray-200 p-3 dark:border-gray-800 sm:p-4">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-2">
              <Briefcase className="h-5 w-5 text-blue-600" />
              <h3 className="min-w-0 truncate font-semibold text-gray-900 dark:text-gray-100">Task Inbox</h3>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800 dark:bg-blue-950/60 dark:text-blue-200">
                {tasks.length}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">unscheduled</span>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by client, location, contact, or job task..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="border-gray-200 bg-white pl-8 text-sm dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-gray-50 p-3 dark:bg-gray-950">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStartEvent}
            onDragEnd={handleDragEndEvent} >
            <SortableContext
              items={filteredTasks.map(t => t.id)}
              strategy={verticalListSortingStrategy} >
              {filteredTasks.map((task) => (
                <SortableTaskItem 
                  key={task.id} 
                  task={task} 
                  onTaskClick={onTaskClick}
                  onEdit={handleEditTask}
                  onRequestDelete={setPendingDeleteTask}
                  isDeleting={deletingId === task.id}
                  isFocused={activeFocusedTaskId === task.id}/>
              ))}
            </SortableContext>
          </DndContext>

          {filteredTasks.length === 0 && (
            <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
              <Briefcase className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
              <p>No unscheduled tasks found</p>
              <p className="text-xs mt-1">Click &quot;New Task&quot; to create one</p>
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 p-3 dark:border-gray-800">
          <Button variant="outline" size="sm" className="w-full" onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Unscheduled Task
          </Button>
        </div>

        <div className="flex flex-wrap items-center px-3 pb-2 text-[10px] text-gray-400 dark:text-gray-500">
          <GripVertical className="h-3 w-3 mr-1" />
          <Calendar className="h-3 w-3 mr-1" />
          Drag tasks to calendar to schedule
        </div>
      </div>

      <AlertDialog open={!!pendingDeleteTask} onOpenChange={(open) => !open && setPendingDeleteTask(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete task for &quot;{pendingDeleteTask?.clientName}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!deletingId}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                if (pendingDeleteTask) handleDeleteTask(pendingDeleteTask.id)
              }}
              disabled={!!deletingId}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {deletingId ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AddTaskModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddTask}
        staffList={staffList}
        jobTasks={jobTasks}
        clients={clients}
      />

      <EditTaskModal
        key={editingTask?.id || 'edit-task-modal'}
        task={editingTask}
        isOpen={!!editingTask}
        onClose={() => setEditingTask(null)}
        onSave={handleUpdateTask}
        staffList={staffList}
        jobTasks={jobTasks}
        clients={clients}
      />
    </>
  )
}
