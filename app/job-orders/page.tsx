'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import {
  Calendar,
  ArrowUpDown,
  Download,
  FileText,
  Info,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { getDotClass } from '@/lib/colors'
import { downloadExcelReport, downloadPdfReport } from '@/lib/reports/report-export'
import { FINAL_REPORT_NUMBER_EXAMPLE, JOB_ORDER_NUMBER_EXAMPLE } from '@/lib/reports/number-formats'
import { getTaskClient, TASK_CLIENT_SELECT } from '@/lib/settings/task-client'

interface JobOrder {
  id: string
  client_name: string
  location?: string | null
  address?: string | null
  job_task: string
  date_start: string | null
  date_stop: string | null
  time_start?: string
  time_stop?: string
  additional_remark?: string
  job_order_number?: string | null
  task_pic_staff: string
  task_pic_name?: string
  task_pic_color?: string
  task_support_name?: string
  task_support_color?: string
  task_support_names_array?: string[]
  task_support_colors_array?: string[]
  final_report_number?: string | null
  delivery_order: boolean
  invoice: boolean
  job_status: 'completed' | 'in-progress' | 'incomplete' | 'onhold' | 'ongoing' | 'upcoming'
  created_by?: string
  created_at?: string
  updated_at?: string
}

type JobOrderSortField = keyof JobOrder | 'reminder' | 'support_staff'

const getStatusColor = (status: string) => {
  switch(status) {
    case 'completed':
      return 'border [border-color:#16a34a] [background-color:#f0fdf4] [color:#15803d]'
    case 'ongoing':
      return 'border [border-color:#16a34a] [background-color:#dcfce7] [color:#15803d]'
    case 'upcoming':
      return 'border [border-color:#2563eb] [background-color:#dbeafe] [color:#1d4ed8]'
    case 'in-progress':
      return 'border [border-color:#eab308] [background-color:#fef08a] [color:#854d0e]'
    case 'incomplete':
      return 'border [border-color:#ef4444] [background-color:#fecaca] [color:#b91c1c]'
    case 'onhold':
      return 'border [border-color:#4b5563] [background-color:#f9fafb] [color:#374151]'
    default:
      return 'border [border-color:#4b5563] [background-color:#f9fafb] [color:#374151]'
  }
}

const getStatusText = (status: string) => {
  switch(status) {
    case 'completed':
      return 'Completed'
    case 'ongoing':
      return 'Ongoing'
    case 'upcoming':
      return 'Upcoming'
    case 'in-progress':
      return 'In Progress'
    case 'incomplete':
      return 'Incomplete'
    case 'onhold':
      return 'On Hold'
    default:
      return status
  }
}

const getReminderText = (dateStart: string | null, dateStop: string | null, hasFinalReport: boolean): string => {
  if (hasFinalReport) return 'N/A'
  
  const baseDateStr = (dateStop && dateStop.trim() !== '') ? dateStop : dateStart
  if (!baseDateStr) return 'N/A'
  
  const baseDate = new Date(baseDateStr)
  baseDate.setHours(0, 0, 0, 0)
  
  const reminderDate = new Date(baseDate)
  reminderDate.setDate(reminderDate.getDate() + 25)
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const diffDays = Math.ceil((reminderDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  
  if (diffDays < 0) return `${diffDays}d`
  return `${diffDays}d`
}

const getReminderUrgency = (reminderText: string): 'overdue' | 'soon' | 'none' => {
  if (reminderText === 'N/A') return 'none'

  const overdueDays = Number(reminderText.match(/^-\d+d$/)?.[0]?.replace('d', ''))
  if (Number.isFinite(overdueDays)) return 'overdue'

  const daysLeft = Number(reminderText.match(/^(\d+)d$/)?.[1])
  if (Number.isFinite(daysLeft) && daysLeft <= 7) return 'soon'

  return 'none'
}

const getReminderRowClass = (reminderText: string, status?: string) => {
  const urgency = getReminderUrgency(reminderText)

  if (urgency === 'overdue') {
    return 'bg-red-400 text-black hover:bg-red-500 [&_td]:border-black [&_td]:text-black [&_button]:text-black'
  }

  if (urgency === 'soon') {
    return 'bg-yellow-300 text-black hover:bg-yellow-400 [&_td]:border-black [&_td]:text-black [&_button]:text-black'
  }

  if (status === 'ongoing') {
    return 'bg-green-200 text-black hover:bg-green-300 [&_td]:border-black [&_td]:text-black [&_button]:text-black'
  }

  if (status === 'upcoming') {
    return 'bg-blue-200 text-black hover:bg-blue-300 [&_td]:border-black [&_td]:text-black [&_button]:text-black'
  }

  return '[background-color:white] text-black hover:[background-color:#f9fafb] [&_td]:border-black [&_td]:text-black [&_button]:text-black'
}

const tableHeaderCellClass = 'border-r border-black px-4 py-3 text-left text-[12px] font-semibold uppercase text-gray-700 dark:text-gray-200'
const sortableHeaderCellClass = `${tableHeaderCellClass} cursor-pointer transition-colors hover:bg-gray-200/80 dark:hover:bg-gray-700/70`
const tableCellClass = 'border-r border-black px-4 py-3'
const tableMinWidthClass = 'min-w-[1380px]'
const paginationButtonClass = 'border-gray-300 bg-white text-gray-900 shadow-sm hover:bg-gray-100 disabled:border-gray-200 disabled:bg-gray-200 disabled:text-gray-500 disabled:opacity-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800 dark:disabled:border-gray-800 dark:disabled:bg-gray-800 dark:disabled:text-gray-500'
const activePaginationButtonClass = 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:text-white dark:hover:bg-blue-400'
const rowsPerPageOptions = ['10', '25', '50', '100', 'all']

const getSortedStaffEntries = (names?: string[], colors?: string[]) =>
  (names || [])
    .map((name, index) => ({ name, color: colors?.[index] }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))

const getReminderSortValue = (reminderText: string) => {
  if (reminderText === 'N/A') return Number.POSITIVE_INFINITY
  const days = Number(reminderText.replace('d', ''))
  return Number.isFinite(days) ? days : Number.POSITIVE_INFINITY
}

const isAdminRole = (role?: string | null) => {
  const normalizedRole = String(role || '').trim().toLowerCase().replace(/[\s-]+/g, '_')
  return normalizedRole === 'admin' || normalizedRole === 'superadmin' || normalizedRole === 'super_admin'
}

const getJobOrderSortValue = (job: JobOrder, field: JobOrderSortField) => {
  if (field === 'reminder') {
    return getReminderSortValue(getReminderText(job.date_start, job.date_stop, !!job.final_report_number))
  }

  if (field === 'support_staff') {
    return (job.task_support_names_array || []).join(', ')
  }

  const value = job[field]
  if (Array.isArray(value)) return value.join(', ')
  return value ?? ''
}

const formatListDate = (date: string | null) => {
  if (!date) return 'N/A'
  const parsedDate = new Date(date)
  if (Number.isNaN(parsedDate.getTime())) return 'N/A'
  return parsedDate.toLocaleDateString('en-GB')
}

// ========== AUTO-COMPUTE STATUS FALLBACK ==========
const computeTaskStatus = (data: {
  date_start: string | null
  date_stop: string | null
  job_order_number: string | null
  final_report_number: string | null
}) => {
  const hasJobOrder = !!data.job_order_number
  const hasFinalReport = !!data.final_report_number
  
  if (hasJobOrder && hasFinalReport) return 'completed'
  if (!data.date_start) return 'onhold'

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const startDate = new Date(data.date_start)
  startDate.setHours(0, 0, 0, 0)
  const dueDate = data.date_stop ? new Date(data.date_stop) : new Date(data.date_start)
  dueDate.setHours(0, 0, 0, 0)

  const isDueDatePassed = dueDate < today
  if (isDueDatePassed && (!hasJobOrder || !hasFinalReport)) return 'incomplete'
  if (startDate > today) return 'upcoming'
  if (startDate <= today && dueDate >= today) return 'ongoing'
  return 'in-progress'
}

export default function JobOrdersPage() {
  const [user, setUser] = useState<any>(null)
  const [jobOrders, setJobOrders] = useState<JobOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [sortField, setSortField] = useState<JobOrderSortField>('created_at')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [filterStaff, setFilterStaff] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [staffList, setStaffList] = useState<string[]>([])
  const [staffStatusMap, setStaffStatusMap] = useState<Map<string, boolean>>(new Map())
  const [unscheduledJob, setUnscheduledJob] = useState<JobOrder | null>(null)
  const [updatingDocumentStatus, setUpdatingDocumentStatus] = useState<Record<string, boolean>>({})
  const [rowsPerPage, setRowsPerPage] = useState('10')
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()
  const isAdmin = isAdminRole(user?.role)

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (!userData) {
      router.push('/login')
    } else {
      setUser(JSON.parse(userData))
    }
  }, [router])

  const fetchJobOrders = async () => {
    setLoading(true)
    try {
      console.log('📋 Fetching job orders from database...')
      
      // STEP 1: Fetch ALL users from database (including inactive/deactivated)
      const { data: staffData, error: staffError } = await supabase
        .from('users')
        .select('id, name, color, role, is_active')
      
      if (staffError) throw staffError
      
      const staffMap: {[key: string]: {name: string, color: string, id: string, is_active: boolean}} = {}
      const staffNamesForFilter: string[] = []
      const statusMap = new Map<string, boolean>()
      
      staffData?.forEach((staff: { id: string; name: string; color?: string; role?: string; is_active?: boolean }) => {
        const isActive = staff.is_active ?? true
        const displayColor = staff.color || 'blue'
        if (staff.id) {
          staffMap[staff.id] = {
            name: staff.name,
            color: displayColor,
            id: staff.id,
            is_active: isActive
          }
          if (staff.name) {
            staffMap[staff.name] = {
              name: staff.name,
              color: displayColor,
              id: staff.id,
              is_active: isActive
            }
          }
        }
        
        // Add ALL staff to filter list (including inactive)
        if (staff.role === 'staff' && staff.name) {
          staffNamesForFilter.push(staff.name)
          statusMap.set(staff.name, isActive)
        }
      })
      
      staffNamesForFilter.sort()
      setStaffList(staffNamesForFilter)
      setStaffStatusMap(statusMap)
      
      console.log(`📋 Found ${staffNamesForFilter.length} staff members for filter (including inactive)`)
      
      let { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select(TASK_CLIENT_SELECT)
        .order('created_at', { ascending: false })

      if (tasksError) {
        const fallback = await supabase
          .from('tasks')
          .select('*')
          .order('created_at', { ascending: false })

        tasksData = fallback.data
        tasksError = fallback.error
      }
      
      if (tasksError) throw tasksError
      
      // STEP 4: Format tasks with staff information
      const formattedTasks: JobOrder[] = (tasksData || []).map((task: any) => {
        const client = getTaskClient(task)
        let picInfo = null
        const picId = task.task_pic_id
        const picName = task.task_pic_name
        
        if (picId && staffMap[picId]) {
          picInfo = staffMap[picId]
        } else if (picName && staffMap[picName]) {
          picInfo = staffMap[picName]
        }
        
        const supportNamesArray: string[] = []
        const supportColorsArray: string[] = []
        let supportDisplayName = ''
        let supportDisplayColor = 'gray'
        
        let supportIdsArray: string[] = []
        if (task.task_support_ids) {
          if (typeof task.task_support_ids === 'string') {
            supportIdsArray = task.task_support_ids.split(',').filter((s: string) => s && s.trim())
          } else if (Array.isArray(task.task_support_ids)) {
            supportIdsArray = task.task_support_ids
          }
        }
        
        let supportNamesRaw: string[] = []
        if (task.task_support_names) {
          if (typeof task.task_support_names === 'string') {
            supportNamesRaw = task.task_support_names.split(',').filter((s: string) => s && s.trim())
          } else if (Array.isArray(task.task_support_names)) {
            supportNamesRaw = task.task_support_names
          }
        }
        
        let supportColorsRaw: string[] = []
        if (task.task_support_colors) {
          if (typeof task.task_support_colors === 'string') {
            supportColorsRaw = task.task_support_colors.split(',').filter((s: string) => s && s.trim())
          } else if (Array.isArray(task.task_support_colors)) {
            supportColorsRaw = task.task_support_colors
          }
        }
        
        // Map support staff from IDs
        for (const sid of supportIdsArray) {
          if (sid && staffMap[sid]) {
            supportNamesArray.push(staffMap[sid].name)
            supportColorsArray.push(staffMap[sid].color)
          }
        }
        
        // If no support from IDs, use names
        if (supportNamesArray.length === 0 && supportNamesRaw.length > 0) {
          for (let i = 0; i < supportNamesRaw.length; i++) {
            const sname = supportNamesRaw[i]
            if (sname && staffMap[sname]) {
              supportNamesArray.push(staffMap[sname].name)
              supportColorsArray.push(staffMap[sname].color)
            } else if (sname) {
              supportNamesArray.push(sname)
              if (supportColorsRaw[i]) {
                supportColorsArray.push(supportColorsRaw[i])
              } else {
                supportColorsArray.push('gray')
              }
            }
          }
        }
        
        if (supportNamesArray.length > 0) {
          supportDisplayName = supportNamesArray.join(', ')
          supportDisplayColor = supportColorsArray[0] || 'gray'
        }
        
        const computedStatus = computeTaskStatus({
          date_start: task.date_start,
          date_stop: task.date_stop,
          job_order_number: task.job_order_number,
          final_report_number: task.final_report_number,
        })
        
        return {
          id: task.id,
          client_name: client.client_name || 'No Client',
          location: client.location || null,
          address: client.address || null,
          job_task: task.job_task || 'General Task',
          date_start: task.date_start,
          date_stop: task.date_stop || task.date_start,
          time_start: task.time_start,
          time_stop: task.time_stop,
          additional_remark: task.additional_remark,
          job_order_number: task.job_order_number || task.jobOrderNumber || null,
          task_pic_staff: picId || picName || '',
          task_pic_name: picInfo?.name || picName || task.task_pic_name || 'Unassigned',
          task_pic_color: picInfo?.color || task.task_pic_color || 'blue',
          task_support_name: supportDisplayName || undefined,
          task_support_color: supportDisplayColor || 'gray',
          task_support_names_array: supportNamesArray,
          task_support_colors_array: supportColorsArray,
          final_report_number: task.final_report_number || task.finalReportNumber || null,
          delivery_order: Boolean(task.delivery_order),
          invoice: Boolean(task.invoice),
          job_status: computedStatus,
          created_by: task.created_by,
          created_at: task.created_at,
          updated_at: task.updated_at
        }
      })
      
      setJobOrders(formattedTasks)
      
      toast({
        title: "Success",
        description: `Loaded ${formattedTasks.length} job orders | ${staffNamesForFilter.length} staff members (including inactive)`,
      })
      
    } catch (error: any) {
      console.error('Error fetching job orders:', error)
      toast({
        title: "Error",
        description: error?.message || "Failed to fetch job orders",
        variant: "destructive",
      })
      setJobOrders([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchJobOrders()
    }
  }, [user])

  const handleSort = (field: JobOrderSortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const handleDateClick = (date: string | null, job?: JobOrder) => {
    if (!date) {
      if (job) {
        router.push(`/calendar?inbox=1&task=${encodeURIComponent(job.id)}`)
      }
      return
    }

    const formattedDate = date.split('T')[0]
    router.push(`/calendar?date=${formattedDate}&view=month&focus=${formattedDate}`)
  }

  const matchesStaffFilter = (job: JobOrder, filterStaffValue: string): boolean => {
    if (filterStaffValue === 'all') return true
    if (job.task_pic_name === filterStaffValue) return true
    if (job.task_support_names_array && job.task_support_names_array.includes(filterStaffValue)) return true
    if (job.task_support_name && job.task_support_name.includes(filterStaffValue)) return true
    return false
  }

  const filteredAndSortedJobs = jobOrders
    .filter(job => {
      const matchesSearch = 
        (job.client_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (job.location?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (job.address?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (job.job_task?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (job.job_order_number?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (job.final_report_number?.toLowerCase() || '').includes(searchTerm.toLowerCase())
      const matchesStaff = matchesStaffFilter(job, filterStaff)
      const matchesStatus = filterStatus === 'all' || job.job_status === filterStatus
      return matchesSearch && matchesStaff && matchesStatus
    })
    .sort((a, b) => {
      const aValue = getJobOrderSortValue(a, sortField)
      const bValue = getJobOrderSortValue(b, sortField)

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
      }

      const aText = String(aValue)
      const bText = String(bValue)
      
        return sortDirection === 'asc' 
          ? aText.localeCompare(bText, undefined, { numeric: true, sensitivity: 'base' })
          : bText.localeCompare(aText, undefined, { numeric: true, sensitivity: 'base' })
    })

  const handleDocumentStatusChange = async (job: JobOrder, field: 'delivery_order' | 'invoice', checked: boolean) => {
    if (!isAdmin) return

    setUpdatingDocumentStatus((current) => ({ ...current, [`${job.id}-${field}`]: true }))
    setJobOrders((current) =>
      current.map((item) => item.id === job.id ? { ...item, [field]: checked } : item)
    )

    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          [field]: checked,
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id)

      if (error) throw error
    } catch (error: any) {
      setJobOrders((current) =>
        current.map((item) => item.id === job.id ? { ...item, [field]: job[field] } : item)
      )
      toast({
        title: 'Error',
        description: error?.message || 'Failed to update document status',
        variant: 'destructive',
      })
    } finally {
      setUpdatingDocumentStatus((current) => {
        const next = { ...current }
        delete next[`${job.id}-${field}`]
        return next
      })
    }
  }

  const itemsPerPage = rowsPerPage === 'all' ? filteredAndSortedJobs.length || 1 : Number(rowsPerPage)
  const totalPages = rowsPerPage === 'all'
    ? 1
    : Math.max(1, Math.ceil(filteredAndSortedJobs.length / itemsPerPage))
  const paginatedJobs = rowsPerPage === 'all'
    ? filteredAndSortedJobs
    : filteredAndSortedJobs.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    )
  const showingStart = filteredAndSortedJobs.length === 0 ? 0 : ((currentPage - 1) * itemsPerPage) + 1
  const showingEnd = rowsPerPage === 'all'
    ? filteredAndSortedJobs.length
    : Math.min(currentPage * itemsPerPage, filteredAndSortedJobs.length)

  if (!user) return null

  const activeStaffCount = Array.from(staffStatusMap.values()).filter(isActive => isActive === true).length
  const inactiveStaffCount = staffList.length - activeStaffCount
  const reportHeaders = ['No', 'Client Name', 'Location', 'Job Task', 'Start Date', 'End Date', 'Job Order Number', 'Final Report Number', 'Delivery Order', 'Invoice', 'Status', 'Additional Remark', 'PIC', 'Support Staff']
  const reportRows = filteredAndSortedJobs.map((job, index) => [
    index + 1,
    job.client_name,
    job.location || '',
    job.job_task,
    formatListDate(job.date_start),
    formatListDate(job.date_stop),
    job.job_order_number || '',
    job.final_report_number || '',
    job.delivery_order ? 'Yes' : 'No',
    job.invoice ? 'Yes' : 'No',
    getStatusText(job.job_status),
    job.additional_remark || '',
    job.task_pic_name || '',
    job.task_support_name || '',
  ])
  const reportDate = new Date().toISOString().split('T')[0]
  const exportReport = (format: 'pdf' | 'excel') => {
    const options = {
      title: 'Job Task Order List',
      headers: reportHeaders,
      rows: reportRows,
      filename: `job-task-order-list-${reportDate}`,
    }

    if (format === 'pdf') {
      downloadPdfReport(options)
    } else {
      downloadExcelReport(options)
    }

    toast({ title: `Report exported as ${format === 'pdf' ? 'PDF' : 'Excel'}` })
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] max-w-full flex-col overflow-hidden bg-white p-2 dark:bg-gray-950 sm:p-3 lg:p-4">
      <div className="flex min-h-0 min-w-0 max-w-full flex-1 flex-col gap-4 overflow-hidden">
        <AlertDialog open={!!unscheduledJob} onOpenChange={(open) => !open && setUnscheduledJob(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>No Date</AlertDialogTitle>
              <AlertDialogDescription>
                {unscheduledJob?.client_name || 'This job order'} is an unscheduled task. Please assign a start date before viewing it in the calendar month view.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction
                onClick={() => setUnscheduledJob(null)}
                className="bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:text-white dark:hover:bg-blue-600"
              >
                OK
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Header */}
        <div className="-mx-2 -mt-2 flex shrink-0 flex-col gap-4 border-b border-gray-200 bg-white px-2 py-4 dark:border-gray-800 dark:bg-gray-950 sm:-mx-3 sm:-mt-3 sm:flex-row sm:items-center sm:justify-between sm:px-3 lg:-mx-4 lg:-mt-4 lg:px-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Job Task Order List</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Total: {jobOrders.length} job orders | Staff: {staffList.length} total 
              {inactiveStaffCount > 0 && ` (${activeStaffCount} active, ${inactiveStaffCount} inactive)`}
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button
              variant="outline"
              onClick={fetchJobOrders}
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

        {/* Filters */}
        <div className="grid shrink-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            placeholder="Search by client, location, contact, task, or report..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1) }}
            className="border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-900"
          />
          <Select value={filterStaff} onValueChange={(value) => { setFilterStaff(value); setCurrentPage(1) }}>
            <SelectTrigger className="border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-900">
              <SelectValue placeholder="Filter by Staff" />
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
          <Select value={filterStatus} onValueChange={(value) => { setFilterStatus(value); setCurrentPage(1) }}>
            <SelectTrigger className="border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-900">
              <SelectValue placeholder="Filter by Status" />
            </SelectTrigger>
            <SelectContent className="max-h-80 border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="ongoing">Ongoing</SelectItem>
              <SelectItem value="upcoming">Upcoming</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="incomplete">Incomplete</SelectItem>
              <SelectItem value="onhold">On Hold</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="w-full border-gray-300 dark:border-gray-700" onClick={() => router.push('/calendar')}>
            <Calendar className="h-4 w-4 mr-2" /> Go to Calendar
          </Button>
        </div>

        {/* Active Filters Summary */}
        {(searchTerm || filterStaff !== 'all' || filterStatus !== 'all') && (
          <div className="flex shrink-0 flex-wrap items-center gap-2 text-sm">
            <span className="text-gray-500 dark:text-gray-400">Filters active:</span>
            {searchTerm && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-800 dark:bg-blue-950/60 dark:text-blue-200">Search: {searchTerm}</span>}
            {filterStaff !== 'all' && (
              <span className="rounded-full bg-purple-100 px-2 py-0.5 text-purple-800 dark:bg-purple-950/60 dark:text-purple-200">
                Staff: {filterStaff} {!staffStatusMap.get(filterStaff) && '(inactive)'}
              </span>
            )}
            {filterStatus !== 'all' && <span className="rounded-full bg-green-100 px-2 py-0.5 text-green-800 dark:bg-green-950/60 dark:text-green-200">Status: {filterStatus}</span>}
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setSearchTerm(''); setFilterStaff('all'); setFilterStatus('all') }}>
              Clear all
            </Button>
          </div>
        )}

        {/* Table */}
        <div className="flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col overflow-hidden rounded-lg border border-black bg-white shadow-sm ring-1 ring-black/10 dark:bg-gray-900">
          <div className="min-h-0 w-full min-w-0 flex-1 overflow-auto">
          <table className={`w-full ${tableMinWidthClass} border-collapse text-sm`}>
            <thead className="sticky top-0 z-10 bg-gray-100 dark:bg-gray-800">
              <tr className="border-b border-black">
                <th className={`${tableHeaderCellClass} w-12`}>No</th>
                <th className={sortableHeaderCellClass} onClick={() => handleSort('client_name')}>
                  <div className="flex items-center space-x-1">Client Name <ArrowUpDown className="h-3 w-3" /></div>
                </th>
                <th className={sortableHeaderCellClass} onClick={() => handleSort('location')}>
                  <div className="flex items-center space-x-1">Location <ArrowUpDown className="h-3 w-3" /></div>
                </th>
                <th className={sortableHeaderCellClass} onClick={() => handleSort('job_task')}>
                  <div className="flex items-center space-x-1">Job Task <ArrowUpDown className="h-3 w-3" /></div>
                </th>
                <th className={sortableHeaderCellClass} onClick={() => handleSort('date_start')}>
                  <div className="flex items-center space-x-1">Start Date <ArrowUpDown className="h-3 w-3" /></div>
                </th>
                <th className={sortableHeaderCellClass} onClick={() => handleSort('date_stop')}>
                  <div className="flex items-center space-x-1">End Date <ArrowUpDown className="h-3 w-3" /></div>
                </th>
                <th className={sortableHeaderCellClass} onClick={() => handleSort('reminder')}>
                  <div className="flex items-center space-x-1">Reminder (25d) <ArrowUpDown className="h-3 w-3" /></div>
                </th>
                <th className={sortableHeaderCellClass} onClick={() => handleSort('task_pic_name')}>
                  <div className="flex items-center space-x-1">PIC <ArrowUpDown className="h-3 w-3" /></div>
                </th>
                <th className={`${sortableHeaderCellClass} min-w-[240px]`} onClick={() => handleSort('support_staff')}>
                  <div className="flex items-center space-x-1">Support Staff <ArrowUpDown className="h-3 w-3" /></div>
                </th>
                <th className={sortableHeaderCellClass} onClick={() => handleSort('job_order_number')}>
                  <div className="flex items-center space-x-1">Job Order <ArrowUpDown className="h-3 w-3" /></div>
                </th>
                <th className={sortableHeaderCellClass} onClick={() => handleSort('final_report_number')}>
                  <div className="flex items-center space-x-1">Final Report <ArrowUpDown className="h-3 w-3" /></div>
                </th>
                <th className={sortableHeaderCellClass} onClick={() => handleSort('delivery_order')}>
                  <div className="flex items-center space-x-1">Delivery Order <ArrowUpDown className="h-3 w-3" /></div>
                </th>
                <th className={sortableHeaderCellClass} onClick={() => handleSort('invoice')}>
                  <div className="flex items-center space-x-1">Invoice <ArrowUpDown className="h-3 w-3" /></div>
                </th>
                <th className={sortableHeaderCellClass} onClick={() => handleSort('job_status')}>
                  <div className="flex items-center space-x-1">Status <ArrowUpDown className="h-3 w-3" /></div>
                </th>
                <th className={`${sortableHeaderCellClass} min-w-[220px]`} onClick={() => handleSort('additional_remark')}>
                  <div className="flex items-center space-x-1">Additional Remark <ArrowUpDown className="h-3 w-3" /></div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black">
              {loading ? (
                <tr>
                  <td colSpan={16} className="border-t border-black px-4 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Loading job orders...</p>
                    </div>
                  </td>
                </tr>
              ) : paginatedJobs.length === 0 ? (
                <tr>
                  <td colSpan={16} className="border-t border-black px-4 py-12 text-center">
                    <div className="text-gray-400 text-4xl mb-2">📋</div>
                    <p className="text-gray-500 dark:text-gray-300">No job orders found</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {searchTerm || filterStaff !== 'all' || filterStatus !== 'all' 
                        ? 'Try clearing your filters' 
                        : 'Add tasks in calendar to see them here'}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedJobs.map((job, index) => {
                  const reminderText = getReminderText(job.date_start, job.date_stop, !!job.final_report_number)
                  
                  return (
                    <tr key={job.id} className={`group border-b border-black transition-colors ${getReminderRowClass(reminderText, job.job_status)}`}>
                      <td className={`${tableCellClass} text-black`}>{rowsPerPage === 'all' ? index + 1 : (currentPage - 1) * itemsPerPage + index + 1}</td>
                      <td className={tableCellClass}>
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleDateClick(job.date_start, job)} className="job-order-client-button max-w-xs truncate text-left font-bold text-blue-900 hover:text-blue-900 hover:underline">
                            {job.client_name}
                          </button>
                          <button onClick={() => handleDateClick(job.date_start, job)} className="job-order-calendar-button opacity-0 group-hover:opacity-100 transition-opacity text-blue-500 hover:text-blue-700">
                            <CalendarIcon className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                      <td className={tableCellClass}>
                        <span className="text-black">{job.location || '-'}</span>
                      </td>
                      <td className={tableCellClass}>
                        <span className="text-black">{job.job_task}</span>
                      </td>
                      <td className={tableCellClass}>
                        <span>{formatListDate(job.date_start)}</span>
                      </td>
                      <td className={tableCellClass}>
                        <span>{formatListDate(job.date_stop)}</span>
                      </td>
                      <td className={tableCellClass}>
                        <span className="font-medium text-black">
                          {reminderText}
                        </span>
                      </td>
                      <td className={tableCellClass}>
                        <div className="flex items-center">
                          <span className={`w-3 h-3 rounded-full mr-2 flex-shrink-0 ${getDotClass(job.task_pic_color)}`}></span>
                          <span className="text-sm font-medium">
                            {job.task_pic_name || 'Unassigned'}
                          </span>
                        </div>
                      </td>
                      <td className={tableCellClass}>
                        {job.task_support_names_array && job.task_support_names_array.length > 0 ? (
                          <div className="grid min-w-[208px] grid-cols-2 gap-x-4 gap-y-2">
                            {getSortedStaffEntries(job.task_support_names_array, job.task_support_colors_array).map(({ name, color }) => (
                              <div key={name} className="flex min-w-0 items-center gap-2">
                                <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${getDotClass(color)}`}></span>
                                <span className="truncate text-sm leading-tight" title={name}>
                                  {name}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : <span className="text-sm text-black">-</span>}
                      </td>
                      <td className={tableCellClass}>
                        {job.job_order_number ? (
                          <span className="inline-flex min-w-[72px] items-center justify-center rounded-md border px-2.5 py-1 font-mono text-xs font-semibold shadow-sm [border-color:#2563eb] [background-color:#eff6ff] [color:#1d4ed8]">
                            {job.job_order_number}
                          </span>
                        ) : <span className="text-black">-</span>}
                      </td>
                      <td className={tableCellClass}>
                        {job.final_report_number ? (
                          <span className="inline-flex min-w-[72px] items-center justify-center rounded-md border px-2.5 py-1 font-mono text-xs font-semibold shadow-sm [border-color:#16a34a] [background-color:#f0fdf4] [color:#15803d]">
                            {job.final_report_number}
                          </span>
                        ) : <span className="text-black">-</span>}
                      </td>
                      <td className={tableCellClass}>
                        <div className="flex items-center justify-center">
                          <Checkbox
                            checked={job.delivery_order}
                            disabled={!isAdmin || updatingDocumentStatus[`${job.id}-delivery_order`]}
                            onCheckedChange={(checked) => handleDocumentStatusChange(job, 'delivery_order', checked === true)}
                            aria-label={`Delivery order for ${job.client_name}`}
                            className="border-gray-500 bg-white dark:border-gray-300 dark:bg-white/20 data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600 dark:data-[state=checked]:border-blue-500 dark:data-[state=checked]:bg-blue-500"
                          />
                        </div>
                      </td>
                      <td className={tableCellClass}>
                        <div className="flex items-center justify-center">
                          <Checkbox
                            checked={job.invoice}
                            disabled={!isAdmin || updatingDocumentStatus[`${job.id}-invoice`]}
                            onCheckedChange={(checked) => handleDocumentStatusChange(job, 'invoice', checked === true)}
                            aria-label={`Invoice for ${job.client_name}`}
                            className="border-gray-500 bg-white dark:border-gray-300 dark:bg-white/20 data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600 dark:data-[state=checked]:border-blue-500 dark:data-[state=checked]:bg-blue-500"
                          />
                        </div>
                      </td>
                      <td className={tableCellClass}>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm ${getStatusColor(job.job_status)}`}>
                          {getStatusText(job.job_status)}
                        </span>
                      </td>
                      <td className={`${tableCellClass} min-w-[320px] max-w-[420px] align-top`}>
                        {job.additional_remark ? (
                          <span className="block whitespace-pre-wrap break-words text-black" title={job.additional_remark}>
                            {job.additional_remark}
                          </span>
                        ) : (
                          <span className="text-black">-</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
          </div>
        </div>

        {/* Pagination */}
        {filteredAndSortedJobs.length > 0 && !loading && (
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2 text-sm text-gray-500 sm:flex-row sm:items-center">
              <span>
                Showing {showingStart} to {showingEnd} of {filteredAndSortedJobs.length} entries
              </span>
              <div className="flex items-center gap-2">
                <Select value={rowsPerPage} onValueChange={(value) => {
                  setRowsPerPage(value)
                  setCurrentPage(1)
                }}>
                  <SelectTrigger className="h-9 w-[84px] border-gray-300 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
                    {rowsPerPageOptions.map(option => (
                      <SelectItem key={option} value={option}>
                        {option === 'all' ? 'All' : option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span>rows per page</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 border-gray-300 bg-white text-gray-900 shadow-sm hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800"
                    >
                      <Info className="mr-2 h-4 w-4" />
                      Notes
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="start"
                    side="bottom"
                    className="w-[720px] max-w-[calc(100vw-2rem)] border-gray-200 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                  >
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div className="rounded-md border border-gray-200 p-4 dark:border-gray-700">
                        <h4 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">Number Indicators:</h4>
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center"><span className="mr-2 rounded border border-blue-100 bg-blue-50 px-2 py-0.5 font-mono text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/50 dark:text-blue-200">{JOB_ORDER_NUMBER_EXAMPLE}</span><span className="text-gray-600 dark:text-gray-400">= Job order number</span></div>
                          <div className="flex items-center"><span className="mr-2 rounded border border-green-100 bg-green-50 px-2 py-0.5 font-mono text-green-700 dark:border-green-900/50 dark:bg-green-950/50 dark:text-green-200">{FINAL_REPORT_NUMBER_EXAMPLE}</span><span className="text-gray-600 dark:text-gray-400">= Final report number</span></div>
                          <div className="flex items-center"><span className="mr-2 h-4 w-4 text-gray-300 dark:text-gray-500">-</span><span className="text-gray-600 dark:text-gray-400">= Number not entered</span></div>
                        </div>
                      </div>
                      <div className="rounded-md border border-gray-200 p-4 dark:border-gray-700">
                        <h4 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">Status:</h4>
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center"><span className="mr-2 h-3 w-3 rounded-full bg-green-300"></span><span className="text-gray-600 dark:text-gray-400">Ongoing</span></div>
                          <div className="flex items-center"><span className="mr-2 h-3 w-3 rounded-full bg-blue-300"></span><span className="text-gray-600 dark:text-gray-400">Upcoming</span></div>
                          <div className="flex items-center"><span className="mr-2 h-3 w-3 rounded-full bg-yellow-200"></span><span className="text-gray-600 dark:text-gray-400">Due soon / In Progress</span></div>
                          <div className="flex items-center"><span className="mr-2 h-3 w-3 rounded-full bg-red-200"></span><span className="text-gray-600 dark:text-gray-400">Incomplete / Overdue</span></div>
                          <div className="flex items-center"><span className="mr-2 h-3 w-3 rounded-full border border-gray-300 bg-white"></span><span className="text-gray-600 dark:text-gray-400">Completed / Normal</span></div>
                          <div className="flex items-center"><span className="mr-2 h-3 w-3 rounded-full bg-gray-400"></span><span className="text-gray-600 dark:text-gray-400">On Hold (Inbox)</span></div>
                        </div>
                      </div>
                      <div className="rounded-md border border-gray-200 p-4 dark:border-gray-700">
                        <h4 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">Reminder Format (25 days):</h4>
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center"><span className="mr-2 text-orange-600 dark:text-orange-300">7d</span><span className="text-gray-600 dark:text-gray-400">= 7 days until reminder</span></div>
                          <div className="flex items-center"><span className="mr-2 font-bold text-orange-600 dark:text-orange-300">0d</span><span className="text-gray-600 dark:text-gray-400">= Reminder day</span></div>
                          <div className="flex items-center"><span className="mr-2 font-medium text-red-600 dark:text-red-400">-7d</span><span className="text-gray-600 dark:text-gray-400">= 7 days overdue</span></div>
                          <div className="flex items-center"><span className="mr-2 text-gray-400 dark:text-gray-500">N/A</span><span className="text-gray-600 dark:text-gray-400">= No date or completed</span></div>
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
              <Button variant="outline" size="icon" className={paginationButtonClass} onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
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
                    <Button key={pageNum} variant={currentPage === pageNum ? 'default' : 'outline'} size="sm" className={`h-8 w-8 ${currentPage === pageNum ? activePaginationButtonClass : paginationButtonClass}`} onClick={() => setCurrentPage(pageNum)}>
                      {pageNum}
                    </Button>
                  )
                })}
              </div>
              <Button variant="outline" size="icon" className={paginationButtonClass} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
