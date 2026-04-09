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
  CheckCircle,
  XCircle,
  Eye
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

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
  task_support_staff?: string
  task_support_name?: string
  task_support_color?: string
  pdf_final_report?: string
  final_report_staff?: string
  job_status: 'in-progress' | 'completed' | 'incompleted'
  created_by?: string
  created_at?: string
  updated_at?: string
}

// ==================== HELPER FUNCTIONS ====================
const getStatusColor = (status: string) => {
  switch(status) {
    case 'completed':
      return 'bg-green-100 text-green-700'
    case 'in-progress':
      return 'bg-yellow-100 text-yellow-700'
    case 'incompleted':
      return 'bg-red-100 text-red-700'
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
    case 'incompleted':
      return 'Incompleted'
    default:
      return status
  }
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

  // ==================== FETCH REAL DATA FROM DATABASE ====================
  const fetchJobOrders = async () => {
    setLoading(true)
    try {
      console.log('📋 Fetching job orders from database...')
      
      // 1. First, get all staff for colors and names
      const { data: staffData, error: staffError } = await supabase
        .from('users')
        .select('id, name, user_id, color')
        .eq('role', 'staff')
        .not('color', 'is', null)
      
      if (staffError) throw staffError
      
      // Create staff color map
      const staffColorMap: {[key: string]: {name: string, color: string}} = {}
      staffData?.forEach(staff => {
        if (staff.user_id) {
          staffColorMap[staff.user_id] = {
            name: staff.name,
            color: staff.color || 'blue'
          }
        }
      })
      
      console.log('🎨 Staff colors loaded:', staffColorMap)
      
      // 2. Fetch ALL tasks (no date filter - get everything)
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .order('date_start', { ascending: false })
      
      if (tasksError) throw tasksError
      
      console.log(`📊 Found ${tasksData?.length || 0} tasks in database`)
      
      // 3. Format tasks with staff info
      const formattedTasks: JobOrder[] = (tasksData || []).map((task: any) => {
        const picStaffCode = task.task_pic_staff || ''
        const supportStaffCode = task.task_support_staff || ''
        
        const picInfo = staffColorMap[picStaffCode]
        const supportInfo = supportStaffCode ? staffColorMap[supportStaffCode] : null
        
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
          pdf_job_order: task.pdf_job_order,
          task_pic_staff: picStaffCode,
          task_pic_name: picInfo?.name || picStaffCode || 'Unknown',
          task_pic_color: picInfo?.color || 'blue',
          task_support_staff: supportStaffCode,
          task_support_name: supportInfo?.name || supportStaffCode || null,
          task_support_color: supportInfo?.color || null,
          pdf_final_report: task.pdf_final_report,
          final_report_staff: task.final_report_staff,
          job_status: task.job_status || 'in-progress',
          created_by: task.created_by,
          created_at: task.created_at,
          updated_at: task.updated_at
        }
      })
      
      // 4. Extract unique staff names for filter dropdown
      const staffNames = new Set<string>()
      formattedTasks.forEach(task => {
        if (task.task_pic_name) staffNames.add(task.task_pic_name)
        if (task.task_support_name) staffNames.add(task.task_support_name)
      })
      
      setStaffList(Array.from(staffNames).sort())
      setJobOrders(formattedTasks)
      
      toast({
        title: "Success",
        description: `Loaded ${formattedTasks.length} job orders`,
      })
      
    } catch (error: any) {
      console.error('❌ Error fetching job orders:', error)
      toast({
        title: "Error",
        description: error?.message || "Failed to fetch job orders",
        variant: "destructive",
      })
      
      // Fallback to empty array
      setJobOrders([])
      
    } finally {
      setLoading(false)
    }
  }

  // Fetch on mount and when user changes
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

  // ==================== PULL FROM CALENDAR ====================
  const handlePullFromCalendar = (date: string) => {
    router.push(`/calendar?date=${date}`)
  }

  // ==================== CALCULATE DUE DATE STATUS ====================
  const getDueDateStatus = (dateStop: string, hasFinalReport: boolean) => {
    const due = new Date(dateStop)
    const today = new Date()
    const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    
    if (hasFinalReport) {
      return {
        color: 'text-green-600',
        icon: CheckCircle,
        text: 'Report Submitted'
      }
    } else if (diffDays < 0) {
      return {
        color: 'text-red-600',
        icon: XCircle,
        text: `Overdue by ${Math.abs(diffDays)} days`
      }
    } else if (diffDays <= 7) {
      return {
        color: 'text-orange-600',
        icon: CalendarIcon,
        text: `${diffDays} days left (Urgent)`
      }
    } else {
      return {
        color: 'text-yellow-600',
        icon: CalendarIcon,
        text: `${diffDays} days left`
      }
    }
  }

  // ==================== FILTER AND SORT ====================
  const filteredAndSortedJobs = jobOrders
    .filter(job => {
      const matchesSearch = 
        (job.client_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (job.running_number?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (job.job_task?.toLowerCase() || '').includes(searchTerm.toLowerCase())
      
      const matchesStaff = filterStaff === 'all' || 
        job.task_pic_name === filterStaff || 
        job.task_support_name === filterStaff
      
      const matchesStatus = filterStatus === 'all' || job.job_status === filterStatus
      
      return matchesSearch && matchesStaff && matchesStatus
    })
    .sort((a, b) => {
      let aValue = a[sortField]
      let bValue = b[sortField]
      
      // Handle undefined values
      if (aValue === undefined) aValue = ''
      if (bValue === undefined) bValue = ''
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }
      return 0
    })

  // ==================== PAGINATION ====================
  const totalPages = Math.ceil(filteredAndSortedJobs.length / itemsPerPage)
  const paginatedJobs = filteredAndSortedJobs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Job Order List</h1>
            <p className="text-sm text-gray-500 mt-1">
              Total: {jobOrders.length} job orders
            </p>
          </div>
          
          <div className="flex gap-2">
            {/* Refresh Button */}
            <Button 
              variant="outline" 
              onClick={fetchJobOrders}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Refresh'}
            </Button>
            
            {/* Export Button */}
            <Button 
              variant="outline" 
              className="border-gray-300"
              onClick={() => {
                // Export logic here
                const headers = ['Running Number', 'Client Name', 'Job Task', 'Date Start', 'Date End', 'Status', 'PIC', 'Support Staff']
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
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Filters Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <Input
            placeholder="Search by client, running num, or task..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setCurrentPage(1)
            }}
            className="bg-white border-gray-300"
          />

          {/* Filter by Staff */}
          <Select value={filterStaff} onValueChange={(value) => {
            setFilterStaff(value)
            setCurrentPage(1)
          }}>
            <SelectTrigger className="bg-white border-gray-300">
              <SelectValue placeholder="Filter by Staff" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Staff</SelectItem>
              {staffList.map(staff => (
                <SelectItem key={staff} value={staff}>{staff}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Filter by Status */}
          <Select value={filterStatus} onValueChange={(value) => {
            setFilterStatus(value)
            setCurrentPage(1)
          }}>
            <SelectTrigger className="bg-white border-gray-300">
              <SelectValue placeholder="Filter by Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="incompleted">Incompleted</SelectItem>
            </SelectContent>
          </Select>

          {/* Pull from Calendar Button */}
          <Button 
            variant="outline" 
            className="border-gray-300"
            onClick={() => router.push('/calendar')}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Go to Calendar
          </Button>
        </div>

        {/* Active Filters Summary */}
        {(searchTerm || filterStaff !== 'all' || filterStatus !== 'all') && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">Filters active:</span>
            {searchTerm && (
              <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                Search: {searchTerm}
              </span>
            )}
            {filterStaff !== 'all' && (
              <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                Staff: {filterStaff}
              </span>
            )}
            {filterStatus !== 'all' && (
              <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                Status: {filterStatus}
              </span>
            )}
            <Button 
              variant="ghost" 
              size="sm"
              className="text-xs"
              onClick={() => {
                setSearchTerm('')
                setFilterStaff('all')
                setFilterStatus('all')
              }}
            >
              Clear all
            </Button>
          </div>
        )}

        {/* Job Orders Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-16">No</th>
                
                {/* Sortable Headers */}
                {[
                  { key: 'running_number', label: 'Running Num' },
                  { key: 'client_name', label: 'Client Name' },
                  { key: 'job_task', label: 'Job Task' },
                  { key: 'date_start', label: 'Date Start' },
                  { key: 'date_stop', label: 'Date End' },
                  { key: 'time_start', label: 'Time' }
                ].map(column => (
                  <th 
                    key={column.key}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort(column.key as keyof JobOrder)}
                  >
                    <div className="flex items-center space-x-1">
                      <span>{column.label}</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                ))}
                
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">PIC</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Support Staff</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Job Order</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Final Report</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={12} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                      <p className="text-sm text-gray-500">Loading job orders...</p>
                    </div>
                  </td>
                </tr>
              ) : paginatedJobs.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-12 text-center">
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
                  const dueStatus = getDueDateStatus(job.date_stop, !!job.pdf_final_report)
                  const DueIcon = dueStatus.icon
                  
                  return (
                    <tr 
                      key={job.id} 
                      className="hover:bg-gray-50 transition-colors group"
                    >
                      <td className="px-4 py-3 text-gray-600">
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </td>
                      
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {job.running_number}
                      </td>
                      
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600 max-w-xs truncate">
                            {job.client_name}
                          </span>
                          <button 
                            onClick={() => handlePullFromCalendar(job.date_start)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-500 hover:text-blue-700"
                            title="View in calendar"
                          >
                            <Calendar className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                      
                      <td className="px-4 py-3">
                        <span className="bg-gray-100 px-2 py-1 rounded text-xs text-gray-700">
                          {job.job_task}
                        </span>
                      </td>
                      
                      <td className="px-4 py-3 text-gray-600">
                        {new Date(job.date_start).toLocaleDateString('en-GB')}
                      </td>
                      
                      <td className="px-4 py-3">
                        <div className="text-gray-600">
                          {new Date(job.date_stop).toLocaleDateString('en-GB')}
                        </div>
                        <div className="text-xs mt-1">
                          <span className={`${dueStatus.color} flex items-center`}>
                            <DueIcon className="h-3 w-3 mr-1" />
                            {dueStatus.text}
                          </span>
                        </div>
                      </td>
                      
                      <td className="px-4 py-3 text-gray-600">
                        {job.time_start ? (job.time_start + (job.time_stop ? ` - ${job.time_stop}` : '')) : '-'}
                      </td>
                      
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          {/* PIC Staff */}
                          <div className="flex items-center">
                            <span 
                              className="w-2 h-2 rounded-full mr-1.5"
                              style={{ backgroundColor: job.task_pic_color || 'blue' }}
                            ></span>
                            <span className="text-sm">{job.task_pic_name || 'Unassigned'}</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          {/* Support Staff if exists */}
                          {job.task_support_name && (
                            <div className="flex items-center text-gray-500 text-xs">
                              <span 
                                className="w-2 h-2 rounded-full mr-1.5"
                                style={{ backgroundColor: job.task_support_color || 'gray' }}
                              ></span>
                              <span>{job.task_support_name}</span>
                            </div>
                          )}
                          {!job.task_support_name && (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </div>
                      </td>
                      
                      <td className="px-4 py-3">
                        {job.pdf_job_order ? (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-green-600 hover:text-green-700"
                            title="View Job Order PDF"
                            onClick={() => window.open(job.pdf_job_order, '_blank')}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        ) : (
                          <span className="text-gray-300" title="No PDF">-</span>
                        )}
                      </td>
                      
                      <td className="px-4 py-3">
                        {job.pdf_final_report ? (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-green-600 hover:text-green-700"
                            title="View Final Report"
                            onClick={() => window.open(job.pdf_final_report, '_blank')}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        ) : (
                          <span className="text-gray-300" title="No Final Report">-</span>
                        )}
                      </td>
                      
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(job.job_status)}`}>
                            {getStatusText(job.job_status)}
                          </span>
                          
                          {/* Show remark if exists */}
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
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
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
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? 'default' : 'outline'}
                      size="sm"
                      className="w-8 h-8"
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  )
                })}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Info Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-white rounded-lg border border-gray-200">
          {/* PDF Info */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">📄 PDF Indicators:</h4>
            <div className="space-y-1 text-xs">
              <div className="flex items-center">
                <FileText className="h-4 w-4 text-green-600 mr-2" />
                <span className="text-gray-600">= PDF Available (click to view)</span>
              </div>
              <div className="flex items-center">
                <span className="w-4 h-4 mr-2 text-gray-300">-</span>
                <span className="text-gray-600">= No PDF / Not Uploaded</span>
              </div>
            </div>
          </div>

          {/* Status Info */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">📊 Status Legend:</h4>
            <div className="space-y-1 text-xs">
              <div className="flex items-center">
                <span className="w-3 h-3 rounded-full bg-green-500 mr-2"></span>
                <span className="text-gray-600">Completed</span>
              </div>
              <div className="flex items-center">
                <span className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></span>
                <span className="text-gray-600">In Progress</span>
              </div>
              <div className="flex items-center">
                <span className="w-3 h-3 rounded-full bg-red-500 mr-2"></span>
                <span className="text-gray-600">Incompleted</span>
              </div>
            </div>
          </div>

          {/* Due Date Info */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">⏰ Due Date Status:</h4>
            <div className="space-y-1 text-xs">
              <div className="flex items-center text-green-600">
                <CheckCircle className="h-4 w-4 mr-2" />
                <span>Report Submitted</span>
              </div>
              <div className="flex items-center text-red-600">
                <XCircle className="h-4 w-4 mr-2" />
                <span>Overdue</span>
              </div>
              <div className="flex items-center text-orange-600">
                <CalendarIcon className="h-4 w-4 mr-2" />
                <span>Urgent (≤ 7 days)</span>
              </div>
              <div className="flex items-center text-yellow-600">
                <CalendarIcon className="h-4 w-4 mr-2" />
                <span>Upcoming</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}