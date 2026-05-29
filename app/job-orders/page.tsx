'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import {
  Calendar,
  FileText,
  ArrowUpDown,
  Download,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getDotClass } from '@/lib/colors'

interface JobOrder {
  id: string
  client_name: string
  running_number: string
  job_task: string
  date_start: string
  date_stop: string
  time_start?: string
  time_stop?: string
  additional_remark?: string
  pdf_job_order?: string
  task_pic_staff: string
  task_pic_name?: string
  task_pic_color?: string
  task_support_name?: string
  task_support_color?: string
  task_support_names_array?: string[]
  task_support_colors_array?: string[]
  pdf_final_report?: string
  job_status: 'completed' | 'in-progress' | 'incomplete' | 'onhold'
  created_by?: string
  created_at?: string
  updated_at?: string
}

// ========== STATUS HELPER FUNCTIONS ==========
const getStatusColor = (status: string) => {
  switch(status) {
    case 'completed':
      return 'bg-green-100 text-green-700'
    case 'in-progress':
      return 'bg-yellow-100 text-yellow-700'
    case 'incomplete':
      return 'bg-red-100 text-red-700'
    case 'onhold':
      return 'bg-gray-100 text-gray-600'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

const getStatusText = (status: string) => {
  switch(status) {
    case 'completed':
      return 'Completed'
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

// ========== REMINDER FUNCTION (25 DAYS FROM DATE_STOP OR DATE_START) ==========
const getReminderText = (dateStart: string, dateStop: string, hasFinalReport: boolean): string | null => {
  if (hasFinalReport) return null
  
  const baseDateStr = (dateStop && dateStop.trim() !== '') ? dateStop : dateStart
  if (!baseDateStr) return null
  
  const baseDate = new Date(baseDateStr)
  baseDate.setHours(0, 0, 0, 0)
  
  const reminderDate = new Date(baseDate)
  reminderDate.setDate(reminderDate.getDate() + 25)
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const diffDays = Math.ceil((reminderDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) {
    return 'Due today!'
  }
  
  if (diffDays < 0) {
    return `Overdue by ${Math.abs(diffDays)}d`
  }
  
  return `${diffDays}d left`
}

// ========== AUTO-COMPUTE STATUS FALLBACK ==========
const computeTaskStatus = (data: {
  date_start: string | null
  date_stop: string | null
  pdf_job_order_path: string | null
  pdf_final_report_path: string | null
}) => {
  if (!data.date_start) return 'onhold'
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dueDate = data.date_stop ? new Date(data.date_stop) : new Date(data.date_start)
  dueDate.setHours(0, 0, 0, 0)
  
  const isDueDatePassed = dueDate < today
  const hasJobOrder = !!data.pdf_job_order_path
  const hasFinalReport = !!data.pdf_final_report_path
  
  if (hasJobOrder && hasFinalReport) return 'completed'
  if (isDueDatePassed && (!hasJobOrder || !hasFinalReport)) return 'incomplete'
  return 'in-progress'
}

export default function JobOrdersPage() {
  const [user, setUser] = useState<any>(null)
  const [jobOrders, setJobOrders] = useState<JobOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [sortField, setSortField] = useState<keyof JobOrder>('running_number')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [filterStaff, setFilterStaff] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [staffList, setStaffList] = useState<string[]>([])
  const [staffStatusMap, setStaffStatusMap] = useState<Map<string, boolean>>(new Map())
  const itemsPerPage = 10
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

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
      
      // STEP 2: Create staff mapping (by id and by name)
      const staffMap: {[key: string]: {name: string, color: string, id: string, is_active: boolean}} = {}
      const staffNamesForFilter: string[] = []
      const statusMap = new Map<string, boolean>()
      
      staffData?.forEach((staff: { id: string; name: string; color?: string; role?: string; is_active?: boolean }) => {
        if (staff.id) {
          staffMap[staff.id] = {
            name: staff.name,
            color: staff.color || 'blue',
            id: staff.id,
            is_active: staff.is_active ?? true
          }
          if (staff.name) {
            staffMap[staff.name] = {
              name: staff.name,
              color: staff.color || 'blue',
              id: staff.id,
              is_active: staff.is_active ?? true
            }
          }
        }
        
        // Add ALL staff to filter list (including inactive)
        if (staff.role === 'staff' && staff.name) {
          staffNamesForFilter.push(staff.name)
          statusMap.set(staff.name, staff.is_active ?? true)
        }
      })
      
      // Sort staff names alphabetically
      staffNamesForFilter.sort()
      setStaffList(staffNamesForFilter)
      setStaffStatusMap(statusMap)
      
      console.log(`📋 Found ${staffNamesForFilter.length} staff members for filter (including inactive)`)
      
      // STEP 3: Fetch tasks from database
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .order('date_start', { ascending: false })
      
      if (tasksError) throw tasksError
      
      // STEP 4: Format tasks with staff information
      const formattedTasks: JobOrder[] = (tasksData || []).map((task: any) => {
        let picInfo = null
        const picId = task.task_pic_id
        const picName = task.task_pic_name
        
        if (picId && staffMap[picId]) {
          picInfo = staffMap[picId]
        } else if (picName && staffMap[picName]) {
          picInfo = staffMap[picName]
        }
        
        let supportNamesArray: string[] = []
        let supportColorsArray: string[] = []
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
          pdf_job_order_path: task.pdf_job_order_path,
          pdf_final_report_path: task.pdf_final_report_path,
        })
        
        return {
          id: task.id,
          client_name: task.client_name || 'No Client',
          running_number: task.running_number || 'No Running Num',
          job_task: task.job_task || 'General Task',
          date_start: task.date_start,
          date_stop: task.date_stop || task.date_start,
          time_start: task.time_start,
          time_stop: task.time_stop,
          additional_remark: task.additional_remark,
          pdf_job_order: task.pdf_job_order_url || task.pdf_job_order,
          task_pic_staff: picId || picName || '',
          task_pic_name: picInfo?.name || picName || task.task_pic_name || 'Unassigned',
          task_pic_color: picInfo?.color || task.task_pic_color || 'blue',
          task_support_name: supportDisplayName || undefined,
          task_support_color: supportDisplayColor || 'gray',
          task_support_names_array: supportNamesArray,
          task_support_colors_array: supportColorsArray,
          pdf_final_report: task.pdf_final_report_url || task.pdf_final_report,
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

  const handleSort = (field: keyof JobOrder) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const handleDateClick = (date: string) => {
    const formattedDate = date.split('T')[0]
    router.push(`/calendar?date=${formattedDate}&view=day`)
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
        (job.running_number?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (job.job_task?.toLowerCase() || '').includes(searchTerm.toLowerCase())
      const matchesStaff = matchesStaffFilter(job, filterStaff)
      const matchesStatus = filterStatus === 'all' || job.job_status === filterStatus
      return matchesSearch && matchesStaff && matchesStatus
    })
    .sort((a, b) => {
      let aValue = a[sortField]
      let bValue = b[sortField]
      if (aValue === undefined) aValue = ''
      if (bValue === undefined) bValue = ''
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }
      return 0
    })

  const totalPages = Math.ceil(filteredAndSortedJobs.length / itemsPerPage)
  const paginatedJobs = filteredAndSortedJobs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  if (!user) return null

  // Get count of active vs inactive staff
  const activeStaffCount = Array.from(staffStatusMap.values()).filter(isActive => isActive === true).length
  const inactiveStaffCount = staffList.length - activeStaffCount

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-6">
      <div className="max-w-[95%] mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Job Order List</h1>
            <p className="text-sm text-gray-500 mt-1">
              Total: {jobOrders.length} job orders | Staff: {staffList.length} total 
              {inactiveStaffCount > 0 && ` (${activeStaffCount} active, ${inactiveStaffCount} inactive)`}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchJobOrders} disabled={loading}>
              {loading ? 'Loading...' : 'Refresh'}
            </Button>
            <Button 
              variant="outline" 
              className="border-gray-300"
              onClick={() => {
                const headers = ['Running Number', 'Client Name', 'Job Task', 'Start Date', 'End Date', 'Status', 'PIC', 'Support Staff']
                const csvRows = [headers]
                filteredAndSortedJobs.forEach(job => {
                  const row = [
                    job.running_number,
                    job.client_name,
                    job.job_task,
                    new Date(job.date_start).toLocaleDateString('en-GB'),
                    new Date(job.date_stop).toLocaleDateString('en-GB'),
                    getStatusText(job.job_status),
                    job.task_pic_name || '',
                    job.task_support_name || ''
                  ]
                  csvRows.push(row)
                })
                const csvContent = csvRows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `job-orders-${new Date().toISOString().split('T')[0]}.csv`
                a.click()
                window.URL.revokeObjectURL(url)
                toast({ title: "Report exported successfully" })
              }}
            >
              <Download className="h-4 w-4 mr-2" /> Export Report
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Input
            placeholder="Search by client, running num, or task..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1) }}
            className="bg-white border-gray-300"
          />
          <Select value={filterStaff} onValueChange={(value) => { setFilterStaff(value); setCurrentPage(1) }}>
            <SelectTrigger className="bg-white border-gray-300">
              <SelectValue placeholder="Filter by Staff" />
            </SelectTrigger>
            <SelectContent className="bg-white border border-gray-200 shadow-lg max-h-80">
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
            <SelectTrigger className="bg-white border-gray-300">
              <SelectValue placeholder="Filter by Status" />
            </SelectTrigger>
            <SelectContent className="bg-white border border-gray-200 shadow-lg max-h-80">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="incomplete">Incomplete</SelectItem>
              <SelectItem value="onhold">On Hold</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="border-gray-300" onClick={() => router.push('/calendar')}>
            <Calendar className="h-4 w-4 mr-2" /> Go to Calendar
          </Button>
        </div>

        {/* Active Filters Summary */}
        {(searchTerm || filterStaff !== 'all' || filterStatus !== 'all') && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">Filters active:</span>
            {searchTerm && <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">Search: {searchTerm}</span>}
            {filterStaff !== 'all' && (
              <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                Staff: {filterStaff} {!staffStatusMap.get(filterStaff) && '(inactive)'}
              </span>
            )}
            {filterStatus !== 'all' && <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full">Status: {filterStatus}</span>}
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setSearchTerm(''); setFilterStaff('all'); setFilterStatus('all') }}>
              Clear all
            </Button>
          </div>
        )}

        {/* Table */}
        <div className="border-2 border-gray-300 rounded-lg overflow-x-auto shadow-sm bg-white">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-gray-100">
              <tr className="border-b-2 border-gray-300">
                <th className="border-r border-gray-300 px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase w-12">No</th>
                <th className="border-r border-gray-300 px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase cursor-pointer hover:bg-gray-200" onClick={() => handleSort('running_number')}>
                  <div className="flex items-center space-x-1">Running Num <ArrowUpDown className="h-3 w-3" /></div>
                </th>
                <th className="border-r border-gray-300 px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase cursor-pointer hover:bg-gray-200" onClick={() => handleSort('client_name')}>
                  <div className="flex items-center space-x-1">Client Name <ArrowUpDown className="h-3 w-3" /></div>
                </th>
                <th className="border-r border-gray-300 px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase cursor-pointer hover:bg-gray-200" onClick={() => handleSort('job_task')}>
                  <div className="flex items-center space-x-1">Job Task <ArrowUpDown className="h-3 w-3" /></div>
                </th>
                <th className="border-r border-gray-300 px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase cursor-pointer hover:bg-gray-200" onClick={() => handleSort('date_start')}>
                  <div className="flex items-center space-x-1">Start Date <ArrowUpDown className="h-3 w-3" /></div>
                </th>
                <th className="border-r border-gray-300 px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase cursor-pointer hover:bg-gray-200" onClick={() => handleSort('date_stop')}>
                  <div className="flex items-center space-x-1">End Date <ArrowUpDown className="h-3 w-3" /></div>
                </th>
                <th className="border-r border-gray-300 px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Reminder (25d)</th>
                <th className="border-r border-gray-300 px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">PIC</th>
                <th className="border-r border-gray-300 px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Support Staff</th>
                <th className="border-r border-gray-300 px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Job Order</th>
                <th className="border-r border-gray-300 px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Final Report</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={12} className="px-4 py-12 text-center border-t border-gray-300">
                    <div className="flex flex-col items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                      <p className="text-sm text-gray-500">Loading job orders...</p>
                    </div>
                  </td>
                </tr>
              ) : paginatedJobs.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-12 text-center border-t border-gray-300">
                    <div className="text-gray-400 text-4xl mb-2">📋</div>
                    <p className="text-gray-500">No job orders found</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {searchTerm || filterStaff !== 'all' || filterStatus !== 'all' 
                        ? 'Try clearing your filters' 
                        : 'Add tasks in calendar to see them here'}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedJobs.map((job, index) => {
                  const reminderText = getReminderText(job.date_start, job.date_stop, !!job.pdf_final_report)
                  const isOverdue = reminderText?.startsWith('Overdue') || false
                  const isDueToday = reminderText === 'Due today!'
                  
                  return (
                    <tr key={job.id} className="hover:bg-gray-50 transition-colors group border-b border-gray-200">
                      <td className="border-r border-gray-200 px-4 py-3 text-gray-600">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                      <td className="border-r border-gray-200 px-4 py-3 font-medium text-gray-900">{job.running_number}</td>
                      <td className="border-r border-gray-200 px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600 max-w-xs truncate">{job.client_name}</span>
                          <button onClick={() => handleDateClick(job.date_start)} className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-500 hover:text-blue-700">
                            <CalendarIcon className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                      <td className="border-r border-gray-200 px-4 py-3">
                        <span className="bg-gray-100 px-2 py-1 rounded text-xs text-gray-700">{job.job_task}</span>
                      </td>
                      <td className="border-r border-gray-200 px-4 py-3">
                        <button onClick={() => handleDateClick(job.date_start)} className="text-blue-600 hover:text-blue-800 hover:underline">
                          {new Date(job.date_start).toLocaleDateString('en-GB')}
                        </button>
                      </td>
                      <td className="border-r border-gray-200 px-4 py-3">
                        <button onClick={() => handleDateClick(job.date_stop)} className="text-blue-600 hover:text-blue-800 hover:underline">
                          {new Date(job.date_stop).toLocaleDateString('en-GB')}
                        </button>
                      </td>
                      <td className="border-r border-gray-200 px-4 py-3">
                        {reminderText ? (
                          <span className={`font-medium ${
                            isOverdue ? 'text-red-600' : 
                            isDueToday ? 'text-orange-600 font-bold' : 
                            'text-orange-600'
                          }`}>
                            {reminderText}
                          </span>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                      <td className="border-r border-gray-200 px-4 py-3">
                        <div className="flex items-center">
                          <span className={`w-3 h-3 rounded-full mr-2 flex-shrink-0 ${getDotClass(job.task_pic_color)}`}></span>
                          <span className="text-sm font-medium">
                            {job.task_pic_name || 'Unassigned'}
                          </span>
                        </div>
                      </td>
                      <td className="border-r border-gray-200 px-4 py-3">
                        {job.task_support_names_array && job.task_support_names_array.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {job.task_support_names_array.map((name, idx) => (
                              <div key={idx} className="flex items-center">
                                <span className={`w-3 h-3 rounded-full mr-1 flex-shrink-0 ${getDotClass(job.task_support_colors_array?.[idx])}`}></span>
                                <span className="text-sm">
                                  {name}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : <span className="text-gray-400 text-sm">-</span>}
                      </td>
                      <td className="border-r border-gray-200 px-4 py-3">
                        {job.pdf_job_order ? (
                          <Button variant="ghost" size="icon" className="text-green-600 hover:text-green-700" onClick={() => window.open(job.pdf_job_order, '_blank')}>
                            <FileText className="h-4 w-4" />
                          </Button>
                        ) : <span className="text-gray-300">-</span>}
                      </td>
                      <td className="border-r border-gray-200 px-4 py-3">
                        {job.pdf_final_report ? (
                          <Button variant="ghost" size="icon" className="text-green-600 hover:text-green-700" onClick={() => window.open(job.pdf_final_report, '_blank')}>
                            <FileText className="h-4 w-4" />
                          </Button>
                        ) : <span className="text-gray-300">-</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(job.job_status)}`}>
                            {getStatusText(job.job_status)}
                          </span>
                          {job.additional_remark && (
                            <div className="text-xs text-gray-400 truncate max-w-[100px]" title={job.additional_remark}>
                              📝 {job.additional_remark.substring(0, 15)}...
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredAndSortedJobs.length > 0 && !loading && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredAndSortedJobs.length)} of {filteredAndSortedJobs.length} entries
            </p>
            <div className="flex space-x-2">
              <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center space-x-1">
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
                    <Button key={pageNum} variant={currentPage === pageNum ? 'default' : 'outline'} size="sm" className="w-8 h-8" onClick={() => setCurrentPage(pageNum)}>
                      {pageNum}
                    </Button>
                  )
                })}
              </div>
              <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Info Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-white rounded-lg border-2 border-gray-300">
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">📄 PDF Indicators:</h4>
            <div className="space-y-1 text-xs">
              <div className="flex items-center"><FileText className="h-4 w-4 text-green-600 mr-2" /><span className="text-gray-600">= PDF Available (click to view)</span></div>
              <div className="flex items-center"><span className="w-4 h-4 mr-2 text-gray-300">-</span><span className="text-gray-600">= No PDF / Not Uploaded</span></div>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">📊 Status Legend:</h4>
            <div className="space-y-1 text-xs">
              <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-green-500 mr-2"></span><span className="text-gray-600">Completed</span></div>
              <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></span><span className="text-gray-600">In Progress</span></div>
              <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-red-500 mr-2"></span><span className="text-gray-600">Incomplete</span></div>
              <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-gray-400 mr-2"></span><span className="text-gray-600">On Hold (Inbox)</span></div>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">⏰ Reminder Format (25 days):</h4>
            <div className="space-y-1 text-xs">
              <div className="flex items-center"><span className="text-orange-600 mr-2">14d left</span><span className="text-gray-600">= 14 days until reminder</span></div>
              <div className="flex items-center"><span className="text-orange-600 font-bold mr-2">Due today!</span><span className="text-gray-600">= Reminder day</span></div>
              <div className="flex items-center"><span className="text-red-600 font-medium mr-2">Overdue by 4d</span><span className="text-gray-600">= Past reminder date</span></div>
              <div className="flex items-center"><span className="text-gray-300 mr-2">-</span><span className="text-gray-600">= Final report submitted</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}