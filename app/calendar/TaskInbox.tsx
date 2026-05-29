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
import { getDotClass } from '@/lib/colors'

export interface UnscheduledTask {
  id: string
  clientName: string
  jobTask: string
  task_pic_id: string
  task_pic_name?: string
  task_pic_color?: string
  pdfJobOrderPath?: string
  pdfJobOrderUrl?: string
  pdfFinalReportPath?: string
  pdfFinalReportUrl?: string
  runningNumber?: string
  createdAt: Date
  notes?: string
}

interface TaskInboxProps {
  onDragStart: (task: UnscheduledTask) => void
  onDragEnd: (taskId: string, date: Date | null) => void
  onTaskClick?: (task: UnscheduledTask) => void
  onTaskSaved?: () => void
  onUnreadCountChange?: (count: number) => void
}

interface JobTask {
  id: string
  name: string
}

interface Staff {
  id: string
  name: string
  color?: string
}

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
          <div 
            {...listeners} 
            className="cursor-grab hover:text-blue-600 mt-1 flex-shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-4 w-4 text-gray-400" />
          </div>

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
              {task.jobTask && <span className="font-mono bg-gray-100 px-1 rounded mr-1">{task.jobTask}</span>}
            </p>
            
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
              <span className="flex items-center">
                <div className={`w-2 h-2 rounded-full mr-1 ${getDotClass(task.task_pic_color)}`}></div>
                <span className="truncate">{task.task_pic_name || 'No PIC'}</span>
              </span>
              {task.pdfJobOrderUrl && (
                <span className="flex items-center">
                  <FileText className="h-3 w-3 mr-1" />
                  <span className="truncate">PDF</span>
                </span>
              )}
            </div>
          </div>

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

      {showPDF && task.pdfJobOrderUrl && (
        <PDFViewerModal
          url={task.pdfJobOrderUrl}
          fileName="Job Order Document.pdf"
          isOpen={showPDF}
          onClose={() => setShowPDF(false)}
        />
      )}
    </>
  )
}

function AddTaskModal({ 
  isOpen, 
  onClose, 
  onAdd,
  staffList,
  jobTasks
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  onAdd: (task: UnscheduledTask) => Promise<void>,
  staffList: Staff[],
  jobTasks: JobTask[]
}) {
  const [formData, setFormData] = useState({
    clientName: '',
    jobTask: '',
    task_pic_id: '',
    pdfFile: null as File | null,
  })
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    if (isOpen) {
      setFormData({
        clientName: '',
        jobTask: '',
        task_pic_id: '',
        pdfFile: null,
      })
    }
  }, [isOpen])

  const generateRunningNumber = async (date: Date) => {
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
      
      if (error) {
        console.error('Error fetching last running number:', error)
        return `${prefix}001`
      }
      
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
      console.error('Error in generateRunningNumber:', error)
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
      setFormData({ ...formData, pdfFile: file })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.clientName || !formData.jobTask || !formData.task_pic_id) {
      toast({
        title: "Validation Error",
        description: "Client Name, Job Task, and PIC are required",
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    try {
      const selectedStaff = staffList.find(s => s.id === formData.task_pic_id)
      const runningNumber = await generateRunningNumber(new Date())

      const newTask: UnscheduledTask = {
        id: `temp-${Date.now()}`,
        clientName: formData.clientName,
        jobTask: formData.jobTask,
        task_pic_id: formData.task_pic_id,
        task_pic_name: selectedStaff?.name,
        task_pic_color: selectedStaff?.color || 'blue',
        runningNumber: runningNumber,
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
          <div className="space-y-2">
            <Label className="text-gray-700 font-medium">
              Client Name <span className="text-red-500">*</span>
            </Label>
            <Input
              value={formData.clientName}
              onChange={(e) => setFormData({...formData, clientName: e.target.value})}
              placeholder="Enter client name"
              className="border-gray-300 bg-white"
              required
              autoFocus
            />
          </div>

          {/* Job Task - SEARCHABLE COMBOBOX */}
          <div className="space-y-2">
            <Label className="text-gray-700 font-medium">
              Job Task <span className="text-red-500">*</span>
            </Label>
            <Combobox
              options={jobTasks.map(jt => ({ value: jt.name, label: jt.name }))}
              value={formData.jobTask}
              onValueChange={(value) => setFormData({...formData, jobTask: value})}
              placeholder="Select job task"
              emptyMessage="No job tasks found."
              disabled={saving}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-700 font-medium">
              PIC (Person In Charge) <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.task_pic_id}
              onValueChange={(value) => setFormData({...formData, task_pic_id: value})}
            >
              <SelectTrigger className="bg-white border-gray-300">
                <SelectValue placeholder="Select PIC" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-gray-200 shadow-lg max-h-80">
                {staffList.map((staff) => (
                  <SelectItem key={staff.id} value={staff.id}>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${getDotClass(staff.color)}`}></div>
                      <span>{staff.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-gray-700 font-medium">PDF Job Order (Optional)</Label>
            <Input type="file" accept=".pdf" onChange={handleFileChange} className="border-gray-300 bg-white" />
            <p className="text-xs text-gray-500">Upload job order PDF (max 10MB)</p>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={saving} className="flex-1 bg-blue-300 hover:bg-blue-300">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Create Task
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
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
  jobTasks
}: { 
  task: UnscheduledTask | null, 
  isOpen: boolean, 
  onClose: () => void, 
  onSave: (task: UnscheduledTask) => Promise<void>,
  staffList: Staff[],
  jobTasks: JobTask[]
}) {
  const [formData, setFormData] = useState({
    clientName: '',
    jobTask: '',
    task_pic_id: '',
    pdfFile: null as File | null,
  })
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (task && isOpen) {
      let picId = task.task_pic_id || ''
      
      if (!picId && task.task_pic_name) {
        const foundStaff = staffList.find(s => s.name === task.task_pic_name)
        if (foundStaff) {
          picId = foundStaff.id
        }
      }
      
      let jobTaskValue = task.jobTask || ''
      
      setFormData({
        clientName: task.clientName || '',
        jobTask: jobTaskValue,
        task_pic_id: picId,
        pdfFile: null,
      })
    }
  }, [task, isOpen, staffList])

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
      setFormData({ ...formData, pdfFile: file })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.clientName || !formData.jobTask || !formData.task_pic_id) {
      toast({
        title: "Validation Error",
        description: "Client Name, Job Task, and PIC are required",
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    try {
      const selectedStaff = staffList.find(s => s.id === formData.task_pic_id)

      const updatedTask: UnscheduledTask = {
        ...task!,
        clientName: formData.clientName,
        jobTask: formData.jobTask,
        task_pic_id: formData.task_pic_id,
        task_pic_name: selectedStaff?.name,
        task_pic_color: selectedStaff?.color || 'blue',
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
          <div className="space-y-2">
            <Label className="text-gray-700 font-medium">Client Name <span className="text-red-500">*</span></Label>
            <Input
              value={formData.clientName}
              onChange={(e) => setFormData({...formData, clientName: e.target.value})}
              placeholder="Enter client name"
              className="border-gray-300 bg-white"
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-700 font-medium">Job Task <span className="text-red-500">*</span></Label>
            <Combobox
              options={jobTasks.map(jt => ({ value: jt.name, label: jt.name }))}
              value={formData.jobTask}
              onValueChange={(value) => setFormData({...formData, jobTask: value})}
              placeholder="Select job task"
              emptyMessage="No job tasks found."
              disabled={saving}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-700 font-medium">PIC (Person In Charge) <span className="text-red-500">*</span></Label>
            <Select
              value={formData.task_pic_id}
              onValueChange={(value) => setFormData({...formData, task_pic_id: value})}
            >
              <SelectTrigger className="bg-white border-gray-300">
                <SelectValue placeholder="Select PIC" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-gray-200 shadow-lg max-h-80">
                {staffList.map((staff) => (
                  <SelectItem key={staff.id} value={staff.id}>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${getDotClass(staff.color)}`}></div>
                      <span>{staff.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formData.task_pic_id && (
              <div className="mt-1 text-xs text-green-600">
                Selected: {staffList.find(s => s.id === formData.task_pic_id)?.name || 'Unknown'}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-gray-700 font-medium">PDF Job Order (Optional)</Label>
            {task.pdfJobOrderUrl && (
              <div className="mb-2 p-2 bg-blue-50 rounded border border-blue-200 text-sm">
                <p className="text-blue-700 flex items-center justify-between">
                  <span className="flex items-center">
                    <FileText className="h-4 w-4 mr-2" />
                    Current PDF attached
                  </span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => window.open(task.pdfJobOrderUrl!, '_blank')} className="text-blue-600">
                    <Eye className="h-3 w-3 mr-1" /> View
                  </Button>
                </p>
              </div>
            )}
            <Input type="file" accept=".pdf" onChange={handleFileChange} className="border-gray-300 bg-white" />
            <p className="text-xs text-gray-500">
              {task.pdfJobOrderUrl ? 'Upload new PDF to replace existing file' : 'Upload job order PDF (max 10MB)'}
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={saving} className="flex-1 bg-blue-300 hover:bg-blue-300">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save Changes
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function TaskInbox({ onDragStart, onDragEnd, onTaskClick, onTaskSaved, onUnreadCountChange }: TaskInboxProps) {
  const [tasks, setTasks] = useState<UnscheduledTask[]>([])
  const [filter, setFilter] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingTask, setEditingTask] = useState<UnscheduledTask | null>(null)
  const [staffList, setStaffList] = useState<Staff[]>([])
  const [jobTasks, setJobTasks] = useState<JobTask[]>([])
  const [loadingData, setLoadingData] = useState(true)

  const { toast } = useToast()
  const supabase = createClient()

  const fetchAllData = async () => {
    setLoadingData(true)
    try {
      const { data: staffData, error: staffError } = await supabase
        .from('users')
        .select('id, name, color, is_active')
        .eq('is_active', true) 
        .order('name')
      
      if (staffError) throw staffError
      
      const formattedStaff: Staff[] = (staffData || []).map((user: {id: string; name:string; color?: string})=> ({
        id: user.id,
        name: user.name,
        color: user.color || 'blue'
      }))
      setStaffList(formattedStaff)
      
      const { data: jobTasksData, error: jobTasksError } = await supabase
        .from('job_tasks')
        .select('*')
        .order('name')
      
      if (jobTasksError) throw jobTasksError
      setJobTasks(jobTasksData || [])
      
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .is('date_start', null)
        .order('created_at', { ascending: false })
      
      if (tasksError) throw tasksError
      
      const formattedTasks: UnscheduledTask[] = (tasksData || []).map((task: {
        id: string;
        client_name: string;
        job_task: string;
        task_pic_id: string;
        task_pic_name: string;
        task_pic_color: string;
        pdf_job_order_path: string;
        pdf_job_order_url: string;
        pdf_final_report_path: string;
        pdf_final_report_url: string;
        running_number: string;
        created_at: string;
        additional_remark: string;
      }) => {
        let staffInfo = formattedStaff.find(s => s.id === task.task_pic_id)
        
        if (!staffInfo && task.task_pic_name) {
          staffInfo = formattedStaff.find(s => s.name === task.task_pic_name)
        }
        
        return {
          id: task.id,
          clientName: task.client_name || 'Unknown Client',
          jobTask: task.job_task || '',
          task_pic_id: staffInfo?.id || task.task_pic_id || '',
          task_pic_name: staffInfo?.name || task.task_pic_name,
          task_pic_color: staffInfo?.color || task.task_pic_color || 'blue',
          pdfJobOrderPath: task.pdf_job_order_path,
          pdfJobOrderUrl: task.pdf_job_order_url,
          pdfFinalReportPath: task.pdf_final_report_path,
          pdfFinalReportUrl: task.pdf_final_report_url,
          runningNumber: task.running_number,
          createdAt: new Date(task.created_at),
          notes: task.additional_remark
        }
      })
      setTasks(formattedTasks)
      
      onUnreadCountChange?.(formattedTasks.length)
      
    } catch (error: any) {
      console.error('Error fetching data:', error)
      toast({
        title: "Error",
        description: error?.message || "Failed to load data",
        variant: "destructive",
      })
    } finally {
      setLoadingData(false)
    }
  }

  useEffect(() => {
    fetchAllData()
  }, [])

  useEffect(() => {
    onUnreadCountChange?.(tasks.length)
  }, [tasks.length, onUnreadCountChange])

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

  const uploadTaskPDF = async (file: File, taskId: string): Promise<{ path: string, url: string } | null> => {
    try {
      const result = await uploadPDF(file, taskId, 'job_order')
      if (!result) return null
      return {
        path: result.path,
        url: result.publicUrl
      }
    } catch (error) {
      console.error('Error uploading PDF:', error)
      return null
    }
  }

  const saveTaskToDatabase = async (taskData: UnscheduledTask, isNew: boolean = true, pdfFile?: File | null) => {
    const userData = localStorage.getItem('user')
    const currentUser = userData ? JSON.parse(userData) : null
    
    const selectedStaff = staffList.find(s => s.id === taskData.task_pic_id)

    const baseData = {
      client_name: taskData.clientName,
      running_number: taskData.runningNumber,
      job_task: taskData.jobTask,
      task_pic_id: taskData.task_pic_id,
      task_pic_name: selectedStaff?.name || taskData.task_pic_name,
      task_pic_color: selectedStaff?.color || taskData.task_pic_color || 'blue',
      pdf_job_order_path: taskData.pdfJobOrderPath || null,
      pdf_job_order_url: taskData.pdfJobOrderUrl || null,
      pdf_final_report_path: taskData.pdfFinalReportPath || null,
      pdf_final_report_url: taskData.pdfFinalReportUrl || null,
      job_status: 'onhold',
      date_start: null,
      date_stop: null,
      created_by: currentUser?.id || null,
      updated_at: new Date().toISOString()
    }

    const dataToSave = isNew 
      ? { ...baseData, created_at: new Date().toISOString() }
      : baseData

    try {
      let savedTask
      
      if (isNew) {
        const { data, error } = await supabase
          .from('tasks')
          .insert(dataToSave)
          .select()
          .single()
        if (error) throw error
        savedTask = data
      } else {
        const { data, error } = await supabase
          .from('tasks')
          .update(dataToSave)
          .eq('id', taskData.id)
          .select()
          .single()
        if (error) throw error
        savedTask = data
      }

      if (pdfFile && savedTask?.id) {
        if (taskData.pdfJobOrderPath) {
          await deletePDF(taskData.pdfJobOrderPath)
        }
        
        const uploadResult = await uploadTaskPDF(pdfFile, savedTask.id)
        
        if (uploadResult) {
          await supabase
            .from('tasks')
            .update({
              pdf_job_order_path: uploadResult.path,
              pdf_job_order_url: uploadResult.url
            })
            .eq('id', savedTask.id)
          
          savedTask.pdf_job_order_path = uploadResult.path
          savedTask.pdf_job_order_url = uploadResult.url
        }
      }

      return savedTask
    } catch (error: any) {
      console.error('saveTaskToDatabase error:', error)
      throw error
    }
  }

  const handleAddTask = async (newTask: UnscheduledTask) => {
    setSaving(true)
    
    try {
      if (!newTask.runningNumber) {
        throw new Error('Failed to generate running number')
      }

      const savedTask = await saveTaskToDatabase(newTask, true, null)

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
      console.error('Error in handleAddTask:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to create task",
        variant: "destructive",
      })
      throw error
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateTask = async (updatedTask: UnscheduledTask) => {
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
      console.error('Error updating task:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to update task",
        variant: "destructive",
      })
      throw error
    }
  }

  const handleDeleteTask = async (id: string) => {
    const taskToDelete = tasks.find(t => t.id === id)
    
    setDeletingId(id)
    try {
      if (taskToDelete?.pdfJobOrderPath) {
        await deletePDF(taskToDelete.pdfJobOrderPath)
      }
      
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
                         task.jobTask.toLowerCase().includes(filter.toLowerCase())
    return matchesSearch
  })

  if (loadingData) {
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

          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by client or job task..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-8 text-sm bg-white"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStartEvent}
            onDragEnd={handleDragEndEvent}
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

        <div className="p-3 border-t border-gray-200">
          <Button variant="outline" size="sm" className="w-full" onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Unscheduled Task
          </Button>
        </div>

        <div className="px-3 pb-2 text-[10px] text-gray-400 flex items-center">
          <GripVertical className="h-3 w-3 mr-1" />
          <Calendar className="h-3 w-3 mr-1" />
          Drag tasks to calendar to schedule
        </div>
      </div>

      <AddTaskModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddTask}
        staffList={staffList}
        jobTasks={jobTasks}
      />

      <EditTaskModal
        task={editingTask}
        isOpen={!!editingTask}
        onClose={() => setEditingTask(null)}
        onSave={handleUpdateTask}
        staffList={staffList}
        jobTasks={jobTasks}
      />
    </>
  )
}