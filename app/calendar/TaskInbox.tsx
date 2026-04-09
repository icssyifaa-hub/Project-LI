'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  Eye
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
import { CSS } from '@dnd-kit/utilities'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/use-toast'
import { uploadPDF, deletePDF } from '@/lib/pdf-service'

export interface UnscheduledTask {
  id: string
  clientName: string
  jobTask: string
  jobTaskCode?: string
  taskPicStaff: string
  taskPicName?: string
  taskPicColor?: string
  pdfJobOrder?: string
  pdfJobOrderName?: string
  pdfJobOrderPath?: string
  pdfJobOrderUrl?: string
  runningNumber?: string
  createdAt: Date
}

interface TaskInboxProps {
  onDragStart: (task: UnscheduledTask) => void
  onDragEnd: (taskId: string, date: Date | null) => void
  onTaskClick?: (task: UnscheduledTask) => void
  onTaskSaved?: () => void
}

interface JobTask {
  id: string
  code: string
  name: string
}

interface Staff {
  id: string
  name: string
  user_id: string
  color?: string
}

// ==================== PDF VIEWER MODAL ====================
function PDFViewerModal({ url, fileName, isOpen, onClose }: { 
  url: string | null, 
  fileName: string, 
  isOpen: boolean, 
  onClose: () => void 
}) {
  if (!url) return null

  return (
    <div className={`fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4 ${!isOpen && 'hidden'}`}>
      <div className="bg-white rounded-lg w-full max-w-4xl h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">{fileName}</h3>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(url, '_blank')}
            >
              Open in New Tab
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex-1 p-4">
          <iframe
            src={`${url}#toolbar=0`}
            className="w-full h-full"
            title={fileName}
          />
        </div>
      </div>
    </div>
  )
}

// ==================== SORTABLE TASK ITEM ====================
function SortableTaskItem({ 
  task, 
  onTaskClick,
  onEdit,
  onDelete,
  isDeleting
}: { 
  task: UnscheduledTask, 
  onTaskClick?: (task: UnscheduledTask) => void,
  onEdit?: (task: UnscheduledTask) => void,
  onDelete?: (id: string) => Promise<void>,
  isDeleting?: boolean
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
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
    zIndex: isSortableDragging ? 999 : 'auto',
  }

  const [showPDF, setShowPDF] = useState(false)

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm(`Delete task for "${task.clientName}"?`)) {
      await onDelete?.(task.id)
    }
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
        className={`bg-white border rounded-lg p-3 shadow-sm hover:shadow-md transition-all ${
          isSortableDragging ? 'shadow-lg rotate-2 scale-105' : ''
        } ${isDeleting ? 'opacity-50' : ''}`}
      >
        <div className="flex items-start gap-2">
          {/* Drag Handle */}
          <div 
            {...listeners} 
            className="cursor-grab hover:text-blue-600 mt-1 flex-shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-4 w-4 text-gray-400" />
          </div>

          {/* Task Content */}
          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onTaskClick?.(task)}>
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-medium text-sm truncate">{task.clientName}</h4>
              {task.runningNumber && (
                <span className="text-[10px] font-mono text-gray-400 flex-shrink-0">
                  {task.runningNumber}
                </span>
              )}
            </div>
            
            <p className="text-xs text-gray-600 mt-1 truncate">
              {task.jobTaskCode && <span className="font-mono bg-gray-100 px-1 rounded mr-1">{task.jobTaskCode}</span>}
              {task.jobTask}
            </p>
            
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
              <span className="flex items-center">
                <div 
                  className="w-2 h-2 rounded-full mr-1" 
                  style={{ backgroundColor: task.taskPicColor || '#3b82f6' }}
                ></div>
                <span className="truncate">{task.taskPicName || task.taskPicStaff}</span>
              </span>
              {task.pdfJobOrderName && (
                <span className="flex items-center">
                  <FileText className="h-3 w-3 mr-1" />
                  <span className="truncate">PDF</span>
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {task.pdfJobOrderUrl && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowPDF(true)
                }}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                title="View PDF"
              >
                <Eye className="h-3.5 w-3.5 text-blue-500" />
              </button>
            )}
            <button
              onClick={handleEdit}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              disabled={isDeleting}
            >
              <Edit2 className="h-3.5 w-3.5 text-gray-500" />
            </button>
            <button
              onClick={handleDelete}
              className="p-1 hover:bg-red-100 rounded transition-colors"
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

      {/* PDF Viewer Modal */}
      {showPDF && task.pdfJobOrderUrl && (
        <PDFViewerModal
          url={task.pdfJobOrderUrl}
          fileName={task.pdfJobOrderName || 'Document.pdf'}
          isOpen={showPDF}
          onClose={() => setShowPDF(false)}
        />
      )}
    </>
  )
}

// ==================== ADD TASK MODAL ====================
function AddTaskModal({ 
  isOpen, 
  onClose, 
  onAdd,
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  onAdd: (task: UnscheduledTask) => Promise<void>,
}) {
  const [formData, setFormData] = useState({
    clientName: '',
    jobTaskId: '',
    taskPicStaff: '',
    pdfFile: null as File | null,
    pdfFileName: ''
  })
  const [saving, setSaving] = useState(false)
  const [jobTasks, setJobTasks] = useState<JobTask[]>([])
  const [staffList, setStaffList] = useState<Staff[]>([])
  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    if (isOpen) {
      console.log('📂 AddTaskModal opened, fetching data...')
      fetchJobTasks()
      fetchStaff()
      setFormData({
        clientName: '',
        jobTaskId: '',
        taskPicStaff: '',
        pdfFile: null,
        pdfFileName: ''
      })
    }
  }, [isOpen])

  const fetchJobTasks = async () => {
    try {
      console.log('🔍 Fetching job tasks...')
      const { data, error } = await supabase
        .from('job_tasks')
        .select('*')
        .order('code')
      
      if (error) {
        console.error('❌ Error fetching job tasks:', error)
        return
      }
      
      console.log(`✅ Loaded ${data?.length || 0} job tasks`)
      if (data) setJobTasks(data)
    } catch (error) {
      console.error('💥 Error in fetchJobTasks:', error)
    }
  }

  const fetchStaff = async () => {
    try {
      console.log('🔍 Fetching staff...')
      const { data, error } = await supabase
        .from('users')
        .select('id, name, user_id, color')
        .eq('role', 'staff')
      
      if (error) {
        console.error('❌ Error fetching staff:', error)
        return
      }
      
      console.log(`✅ Loaded ${data?.length || 0} staff members`)
      if (data) setStaffList(data)
    } catch (error) {
      console.error('💥 Error in fetchStaff:', error)
    }
  }

  const generateRunningNumber = async (date: Date) => {
    console.log('🔢 Generating running number for date:', date)
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
      
      if (error) {
        console.error('❌ Error fetching last running number:', error)
        return `${prefix}001`
      }
      
      let nextNumber = 1
      if (data && data.length > 0) {
        const lastNumber = data[0].running_number
        console.log('📋 Last running number:', lastNumber)
        const lastSeq = parseInt(lastNumber.slice(-3))
        if (!isNaN(lastSeq)) {
          nextNumber = lastSeq + 1
        }
      }
      
      const seq = nextNumber.toString().padStart(3, '0')
      const newNumber = `${prefix}${seq}`
      console.log('✅ Generated new running number:', newNumber)
      return newNumber
      
    } catch (error) {
      console.error('💥 Error in generateRunningNumber:', error)
      return `${prefix}001`
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      console.log('📄 PDF file selected:', file.name)
      setFormData({ ...formData, pdfFile: file, pdfFileName: file.name })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('📝 Form submitted with data:', formData)
    
    if (!formData.clientName || !formData.jobTaskId || !formData.taskPicStaff) {
      console.warn('⚠️ Validation failed: missing required fields')
      toast({
        title: "Validation Error",
        description: "Client Name, Job Task, and PIC are required",
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    try {
      const selectedJobTask = jobTasks.find(jt => jt.id === formData.jobTaskId)
      console.log('✅ Selected job task:', selectedJobTask)
      
      const selectedStaff = staffList.find(s => s.user_id === formData.taskPicStaff)
      console.log('✅ Selected staff:', selectedStaff)
      
      const runningNumber = await generateRunningNumber(new Date())
      console.log('✅ Running number:', runningNumber)

      const newTask: UnscheduledTask = {
        id: `temp-${Date.now()}`,
        clientName: formData.clientName,
        jobTask: selectedJobTask?.name || '',
        jobTaskCode: selectedJobTask?.code,
        taskPicStaff: formData.taskPicStaff,
        taskPicName: selectedStaff?.name,
        taskPicColor: selectedStaff?.color || 'blue',
        pdfJobOrderName: formData.pdfFileName || undefined,
        runningNumber: runningNumber,
        createdAt: new Date()
      }

      console.log('📦 New task object:', newTask)
      await onAdd(newTask)
      onClose()
      
      toast({
        title: "Success",
        description: "Task created successfully",
      })
    } catch (error: any) {
      console.error('❌ Error in handleSubmit:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to create task",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">New Unscheduled Task</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Client Name */}
          <div className="space-y-2">
            <Label className="text-gray-700 font-medium">
              Client Name <span className="text-red-500">*</span>
            </Label>
            <Input
              value={formData.clientName}
              onChange={(e) => setFormData({...formData, clientName: e.target.value})}
              placeholder="Enter client name"
              className="border-gray-300"
              required
              autoFocus
            />
          </div>

          {/* Job Task */}
          <div className="space-y-2">
            <Label className="text-gray-700 font-medium">
              Job Task <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.jobTaskId}
              onValueChange={(value) => setFormData({...formData, jobTaskId: value})}
            >
              <SelectTrigger className="border-gray-300">
                <SelectValue placeholder="Select job task" />
              </SelectTrigger>
              <SelectContent>
                {jobTasks.map((jt) => (
                  <SelectItem key={jt.id} value={jt.id}>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                        {jt.code}
                      </span>
                      <span>{jt.name}</span>
                    </div>
                  </SelectItem>
                ))}
                {jobTasks.length === 0 && (
                  <div className="p-2 text-sm text-gray-500 text-center">
                    No job tasks available
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* PIC Staff */}
          <div className="space-y-2">
            <Label className="text-gray-700 font-medium">
              PIC (Person In Charge) <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.taskPicStaff}
              onValueChange={(value) => setFormData({...formData, taskPicStaff: value})}
            >
              <SelectTrigger className="border-gray-300">
                <SelectValue placeholder="Select PIC" />
              </SelectTrigger>
              <SelectContent>
                {staffList.map((staff) => (
                  <SelectItem key={staff.id} value={staff.user_id}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: staff.color || '#3b82f6' }}
                      ></div>
                      <span>{staff.name} ({staff.user_id})</span>
                    </div>
                  </SelectItem>
                ))}
                {staffList.length === 0 && (
                  <div className="p-2 text-sm text-gray-500 text-center">
                    No staff available
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* PDF Job Order */}
          <div className="space-y-2">
            <Label className="text-gray-700 font-medium">PDF Job Order (Optional)</Label>
            <Input
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="border-gray-300"
            />
            <p className="text-xs text-gray-500">Upload job order PDF (max 10MB)</p>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Create Task
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ==================== EDIT TASK MODAL ====================
function EditTaskModal({ 
  task, 
  isOpen, 
  onClose, 
  onSave 
}: { 
  task: UnscheduledTask | null, 
  isOpen: boolean, 
  onClose: () => void, 
  onSave: (task: UnscheduledTask) => Promise<void> 
}) {
  const [formData, setFormData] = useState({
    clientName: '',
    jobTaskId: '',
    taskPicStaff: '',
    pdfFile: null as File | null,
    pdfFileName: ''
  })
  const [saving, setSaving] = useState(false)
  const [jobTasks, setJobTasks] = useState<JobTask[]>([])
  const [staffList, setStaffList] = useState<Staff[]>([])
  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    if (task && isOpen) {
      console.log('✏️ EditTaskModal opened for task:', task)
      fetchJobTasks()
      fetchStaff()
      
      // Find job task ID from name
      const jobTaskObj = jobTasks.find(jt => jt.name === task.jobTask)
      
      setFormData({
        clientName: task.clientName || '',
        jobTaskId: jobTaskObj?.id || '',
        taskPicStaff: task.taskPicStaff || '',
        pdfFile: null,
        pdfFileName: task.pdfJobOrderName || ''
      })
    }
  }, [task, isOpen, jobTasks])

  const fetchJobTasks = async () => {
    try {
      const { data } = await supabase
        .from('job_tasks')
        .select('*')
        .order('code')
      if (data) setJobTasks(data)
    } catch (error) {
      console.error('Error fetching job tasks:', error)
    }
  }

  const fetchStaff = async () => {
    try {
      const { data } = await supabase
        .from('users')
        .select('id, name, user_id, color')
        .eq('role', 'staff')
      if (data) setStaffList(data)
    } catch (error) {
      console.error('Error fetching staff:', error)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      setFormData({ ...formData, pdfFile: file, pdfFileName: file.name })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.clientName || !formData.jobTaskId || !formData.taskPicStaff) {
      toast({
        title: "Validation Error",
        description: "Client Name, Job Task, and PIC are required",
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    try {
      const selectedJobTask = jobTasks.find(jt => jt.id === formData.jobTaskId)
      const selectedStaff = staffList.find(s => s.user_id === formData.taskPicStaff)

      const updatedTask: UnscheduledTask = {
        ...task!,
        clientName: formData.clientName,
        jobTask: selectedJobTask?.name || '',
        jobTaskCode: selectedJobTask?.code,
        taskPicStaff: formData.taskPicStaff,
        taskPicName: selectedStaff?.name,
        taskPicColor: selectedStaff?.color || 'blue',
        pdfJobOrderName: formData.pdfFileName || undefined,
      }

      await onSave(updatedTask)
      onClose()
    } catch (error: any) {
      console.error('Error saving task:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to save task",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen || !task) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Edit Task</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Client Name */}
          <div className="space-y-2">
            <Label className="text-gray-700 font-medium">
              Client Name <span className="text-red-500">*</span>
            </Label>
            <Input
              value={formData.clientName}
              onChange={(e) => setFormData({...formData, clientName: e.target.value})}
              placeholder="Enter client name"
              className="border-gray-300"
              required
            />
          </div>

          {/* Job Task */}
          <div className="space-y-2">
            <Label className="text-gray-700 font-medium">
              Job Task <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.jobTaskId}
              onValueChange={(value) => setFormData({...formData, jobTaskId: value})}
            >
              <SelectTrigger className="border-gray-300">
                <SelectValue placeholder="Select job task" />
              </SelectTrigger>
              <SelectContent>
                {jobTasks.map((jt) => (
                  <SelectItem key={jt.id} value={jt.id}>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                        {jt.code}
                      </span>
                      <span>{jt.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* PIC Staff */}
          <div className="space-y-2">
            <Label className="text-gray-700 font-medium">
              PIC (Person In Charge) <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.taskPicStaff}
              onValueChange={(value) => setFormData({...formData, taskPicStaff: value})}
            >
              <SelectTrigger className="border-gray-300">
                <SelectValue placeholder="Select PIC" />
              </SelectTrigger>
              <SelectContent>
                {staffList.map((staff) => (
                  <SelectItem key={staff.id} value={staff.user_id}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: staff.color || '#3b82f6' }}
                      ></div>
                      <span>{staff.name} ({staff.user_id})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* PDF Job Order */}
          <div className="space-y-2">
            <Label className="text-gray-700 font-medium">PDF Job Order (Optional)</Label>
            {task.pdfJobOrderUrl && (
              <div className="mb-2 p-2 bg-blue-50 rounded border border-blue-200 text-sm">
                <p className="text-blue-700 flex items-center justify-between">
                  <span className="flex items-center">
                    <FileText className="h-4 w-4 mr-2" />
                    Current: {task.pdfJobOrderName || 'PDF Available'}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(task.pdfJobOrderUrl, '_blank')}
                    className="text-blue-600"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    View
                  </Button>
                </p>
              </div>
            )}
            <Input
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="border-gray-300"
            />
            <p className="text-xs text-gray-500">
              {task.pdfJobOrderName ? 'Upload new PDF to replace existing file' : 'Upload job order PDF (max 10MB)'}
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save Changes
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ==================== MAIN TASK INBOX COMPONENT ====================
export default function TaskInbox({ onDragStart, onDragEnd, onTaskClick, onTaskSaved }: TaskInboxProps) {
  const [tasks, setTasks] = useState<UnscheduledTask[]>([])
  const [filter, setFilter] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingTask, setEditingTask] = useState<UnscheduledTask | null>(null)
  const [loading, setLoading] = useState(true)

  const { toast } = useToast()
  const supabase = createClient()

  // Fetch existing unscheduled tasks from database
  const fetchUnscheduledTasks = async () => {
    setLoading(true)
    try {
      console.log('🔍 Fetching unscheduled tasks...')
      // Get tasks that don't have a date_start (unscheduled)
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .is('date_start', null)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ Error fetching tasks:', error)
        throw error
      }

      console.log(`✅ Loaded ${data?.length || 0} unscheduled tasks`)
      
      const formattedTasks: UnscheduledTask[] = (data || []).map(task => ({
        id: task.id,
        clientName: task.client_name || 'Unknown Client',
        jobTask: task.job_task || '',
        jobTaskCode: '',
        taskPicStaff: task.task_pic_staff || '',
        taskPicName: task.task_pic_name,
        taskPicColor: task.task_pic_color || 'blue',
        pdfJobOrder: task.pdf_job_order,
        pdfJobOrderName: task.pdf_job_order,
        pdfJobOrderPath: task.pdf_job_order_path,
        pdfJobOrderUrl: task.pdf_job_order_url,
        runningNumber: task.running_number,
        createdAt: new Date(task.created_at)
      }))

      setTasks(formattedTasks)
    } catch (error: any) {
      console.error('💥 Error in fetchUnscheduledTasks:', error)
      toast({
        title: "Error",
        description: error?.message || "Failed to load unscheduled tasks",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUnscheduledTasks()
  }, [])

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

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find(t => t.id === event.active.id)
    if (task) {
      console.log('🎯 Drag started for task:', task.clientName)
      onDragStart(task)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setTasks((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  // Upload PDF to storage
  const uploadTaskPDF = async (file: File, taskId: string): Promise<{ path: string, url: string, name: string } | null> => {
    try {
      const result = await uploadPDF(file, taskId, 'job_order')
      return {
        path: result.filePath,
        url: result.publicUrl,
        name: result.fileName
      }
    } catch (error) {
      console.error('Error uploading PDF:', error)
      return null
    }
  }

  // Save task to database (as unscheduled)
  const saveTaskToDatabase = async (taskData: UnscheduledTask, isNew: boolean = true, pdfFile?: File | null) => {
    console.log('💾 saveTaskToDatabase called:', { taskData, isNew })
    
    const userData = localStorage.getItem('user')
    const currentUser = userData ? JSON.parse(userData) : null
    
    console.log('👤 Current user:', currentUser)

    // Prepare base data
    const baseData = {
      client_name: taskData.clientName,
      running_number: taskData.runningNumber,
      job_task: taskData.jobTask,
      task_pic_staff: taskData.taskPicStaff,
      task_pic_name: taskData.taskPicName,
      task_pic_color: taskData.taskPicColor,
      pdf_job_order: taskData.pdfJobOrderName || null,
      pdf_job_order_path: taskData.pdfJobOrderPath || null,
      pdf_job_order_url: taskData.pdfJobOrderUrl || null,
      job_status: 'in-progress',
      date_start: null,
      date_stop: null,
      created_by: currentUser?.id || null,
      updated_at: new Date().toISOString()
    }

    // Add created_at only for new tasks
    const dataToSave = isNew 
      ? { ...baseData, created_at: new Date().toISOString() }
      : baseData

    console.log('📦 Data to save:', dataToSave)

    try {
      let savedTask
      
      if (isNew) {
        console.log('🆕 Inserting new task...')
        const { data, error } = await supabase
          .from('tasks')
          .insert(dataToSave)
          .select()
          .single()

        if (error) {
          console.error('❌ Insert error:', error)
          throw new Error(`Database insert failed: ${error.message}`)
        }
        savedTask = data
        console.log('✅ Task inserted successfully:', savedTask)
      } else {
        console.log('✏️ Updating task...')
        const { data, error } = await supabase
          .from('tasks')
          .update(dataToSave)
          .eq('id', taskData.id)
          .select()
          .single()

        if (error) {
          console.error('❌ Update error:', error)
          throw new Error(`Database update failed: ${error.message}`)
        }
        savedTask = data
        console.log('✅ Task updated successfully:', savedTask)
      }

      // Handle PDF upload if there's a new file
      if (pdfFile && savedTask?.id) {
        console.log('📄 Uploading PDF for task:', savedTask.id)
        
        // Delete old PDF if exists
        if (taskData.pdfJobOrderPath) {
          await deletePDF(taskData.pdfJobOrderPath)
        }
        
        const uploadResult = await uploadTaskPDF(pdfFile, savedTask.id)
        
        if (uploadResult) {
          // Update task with PDF info
          const { error: updateError } = await supabase
            .from('tasks')
            .update({
              pdf_job_order: uploadResult.name,
              pdf_job_order_path: uploadResult.path,
              pdf_job_order_url: uploadResult.url
            })
            .eq('id', savedTask.id)
          
          if (updateError) {
            console.error('Error updating task with PDF info:', updateError)
          } else {
            // Update the returned task with PDF info
            savedTask.pdf_job_order = uploadResult.name
            savedTask.pdf_job_order_path = uploadResult.path
            savedTask.pdf_job_order_url = uploadResult.url
          }
        }
      }

      return savedTask
    } catch (error: any) {
      console.error('💥 saveTaskToDatabase error:', error)
      throw error
    }
  }

  const handleAddTask = async (newTask: UnscheduledTask) => {
    console.log('🚀 handleAddTask called with:', newTask)
    setSaving(true)
    
    try {
      if (!newTask.runningNumber) {
        console.error('❌ No running number generated')
        throw new Error('Failed to generate running number')
      }

      console.log('💾 Saving to database...')
      const savedTask = await saveTaskToDatabase(newTask, true, null)

      console.log('✅ Task saved, updating state...')
      const finalTask: UnscheduledTask = {
        ...newTask,
        id: savedTask.id,
        runningNumber: savedTask.running_number,
        pdfJobOrderPath: savedTask.pdf_job_order_path,
        pdfJobOrderUrl: savedTask.pdf_job_order_url
      }

      setTasks([finalTask, ...tasks])
      
      toast({
        title: "Success",
        description: "Task created successfully",
      })
      
      onTaskSaved?.()
    } catch (error: any) {
      console.error('❌ Error in handleAddTask:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to create task. Please check console for details.",
        variant: "destructive",
      })
      throw error
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateTask = async (updatedTask: UnscheduledTask) => {
    console.log('✏️ handleUpdateTask called:', updatedTask)
    
    // Find the edit modal data to get the PDF file if any
    // For now, we'll update without PDF
    try {
      const savedTask = await saveTaskToDatabase(updatedTask, false, null)
      
      const finalTask: UnscheduledTask = {
        ...updatedTask,
        pdfJobOrderPath: savedTask.pdf_job_order_path,
        pdfJobOrderUrl: savedTask.pdf_job_order_url
      }
      
      setTasks(tasks.map(t => t.id === finalTask.id ? finalTask : t))
      
      toast({
        title: "Success",
        description: "Task updated successfully",
      })
      
      onTaskSaved?.()
    } catch (error: any) {
      console.error('❌ Error updating task:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to update task",
        variant: "destructive",
      })
      throw error
    }
  }

  const handleDeleteTask = async (id: string) => {
    console.log('🗑️ handleDeleteTask called for ID:', id)
    
    // Find the task to get PDF path for deletion
    const taskToDelete = tasks.find(t => t.id === id)
    
    setDeletingId(id)
    try {
      // Delete PDF from storage if exists
      if (taskToDelete?.pdfJobOrderPath) {
        await deletePDF(taskToDelete.pdfJobOrderPath)
      }
      
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('❌ Delete error:', error)
        throw error
      }

      setTasks(tasks.filter(t => t.id !== id))
      
      toast({
        title: "Success",
        description: "Task deleted successfully",
      })
      
      onTaskSaved?.()
    } catch (error: any) {
      console.error('❌ Error deleting task:', error)
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
                         task.jobTask.toLowerCase().includes(filter.toLowerCase())
    return matchesSearch
  })

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg h-full flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="mt-2 text-sm text-gray-500">Loading tasks...</p>
      </div>
    )
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-lg h-full flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Briefcase className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">Task Inbox</h3>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                {tasks.length}
              </span>
              <span className="text-xs text-gray-500">unscheduled</span>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by client or job task..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-8 text-sm"
            />
          </div>
        </div>

        {/* Task List - Scrollable */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={filteredTasks.map(t => t.id)}
              strategy={verticalListSortingStrategy}
            >
              {filteredTasks.map((task) => (
                <SortableTaskItem 
                  key={task.id} 
                  task={task} 
                  onTaskClick={onTaskClick}
                  onEdit={setEditingTask}
                  onDelete={handleDeleteTask}
                  isDeleting={deletingId === task.id}
                />
              ))}
            </SortableContext>
          </DndContext>

          {filteredTasks.length === 0 && (
            <div className="text-center py-8 text-gray-500 text-sm">
              <Briefcase className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No unscheduled tasks found</p>
              <p className="text-xs mt-1">Click "New Task" to create one</p>
            </div>
          )}
        </div>

        {/* Add Task Button */}
        <div className="p-3 border-t border-gray-200">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full"
            onClick={() => setShowAddModal(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Unscheduled Task
          </Button>
        </div>

        {/* Drag Hint */}
        <div className="px-3 pb-2 text-[10px] text-gray-400 flex items-center">
          <GripVertical className="h-3 w-3 mr-1" />
          <Calendar className="h-3 w-3 mr-1" />
          Drag tasks to calendar to schedule
        </div>
      </div>

      {/* Add Task Modal */}
      <AddTaskModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddTask}
      />

      {/* Edit Task Modal */}
      <EditTaskModal
        task={editingTask}
        isOpen={!!editingTask}
        onClose={() => setEditingTask(null)}
        onSave={handleUpdateTask}
      />
    </>
  )
}