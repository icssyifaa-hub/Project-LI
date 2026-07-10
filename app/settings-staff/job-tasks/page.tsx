'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, ListChecks, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import { getJobTaskFullName } from '@/lib/settings/job-tasks'
import { SettingsPagination, useSettingsPagination } from '@/app/settings-admin/components/SettingsPagination'

type JobTask = {
  id: string
  name: string
  full_name: string
}

const tableHeaderCellClass = 'border-r border-black px-4 py-3 text-left text-[12px] font-semibold uppercase text-gray-700 dark:text-gray-200'
const tableCellClass = 'border-r border-black px-4 py-3 text-black dark:text-gray-100'

export default function JobTasksPage() {
  const [user, setUser] = useState<any>(null)
  const [jobTasks, setJobTasks] = useState<JobTask[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const fetchJobTasks = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('job_tasks')
        .select('id, name, full_name')
        .order('name', { ascending: true })

      if (error) throw error

      const formattedTasks = (data || [])
        .map((task: { id: string; name: string; full_name?: string | null }) => ({
          id: task.id,
          name: task.name,
          full_name: task.full_name || getJobTaskFullName(task.name) || '-',
        }))
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }))

      setJobTasks(formattedTasks)
    } catch (error) {
      console.error('Error loading job tasks:', error)
      setJobTasks([])
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (!userData) {
      router.push('/login')
      return
    }

    setUser(JSON.parse(userData))
    fetchJobTasks()
  }, [fetchJobTasks, router])

  const filteredJobTasks = jobTasks.filter((task) => {
    const keyword = searchTerm.trim().toLowerCase()
    if (!keyword) return true

    return (
      task.name.toLowerCase().includes(keyword) ||
      task.full_name.toLowerCase().includes(keyword)
    )
  })
  const jobTasksPagination = useSettingsPagination(filteredJobTasks)

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50 p-2 dark:bg-gray-950 sm:p-3 lg:p-4">
      <div className="w-full max-w-none space-y-6">
        <div className="-mx-2 -mt-2 flex flex-col gap-4 border-b border-gray-200 bg-white px-2 py-4 dark:border-gray-800 dark:bg-gray-950 sm:-mx-3 sm:-mt-3 sm:flex-row sm:items-center sm:justify-between sm:px-3 lg:-mx-4 lg:-mt-4 lg:px-4">
          <div>
            <div className="flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Job Tasks</h1>
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {jobTasks.length} job tasks
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search job tasks..."
                className="w-full border-gray-300 bg-white pl-8 text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 sm:w-64"
              />
            </div>
            <Button
              variant="outline"
              onClick={fetchJobTasks}
              disabled={loading}
              className="w-full border-gray-300 text-gray-900 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-800 sm:w-auto"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-black bg-white shadow-sm ring-1 ring-black/10 dark:bg-gray-900">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead className="bg-gray-100 dark:bg-gray-800">
                <tr className="border-b border-black">
                  <th className={`${tableHeaderCellClass} w-20`}>No</th>
                  <th className={`${tableHeaderCellClass} w-40`}>Job Task</th>
                  <th className={tableHeaderCellClass}>Full Name</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black">
                {loading ? (
                  <tr>
                    <td colSpan={3} className="border-t border-black px-4 py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="mb-2 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Loading job tasks...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredJobTasks.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="border-t border-black px-4 py-12 text-center">
                      <p className="text-gray-500 dark:text-gray-300">
                        {searchTerm ? 'No job tasks match your search' : 'No job tasks found'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  jobTasksPagination.paginatedRows.map((task, index) => (
                    <tr key={task.id} className="border-b border-black bg-white transition-colors hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800">
                      <td className={tableCellClass}>{jobTasksPagination.pageStart + index + 1}</td>
                      <td className={`${tableCellClass} font-semibold`}>{task.name}</td>
                      <td className={tableCellClass}>{task.full_name}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <SettingsPagination
            currentPage={jobTasksPagination.currentPage}
            rowsPerPage={jobTasksPagination.rowsPerPage}
            totalItems={filteredJobTasks.length}
            totalPages={jobTasksPagination.totalPages}
            showingStart={jobTasksPagination.showingStart}
            showingEnd={jobTasksPagination.showingEnd}
            onPageChange={jobTasksPagination.setCurrentPage}
            onRowsPerPageChange={jobTasksPagination.setRowsPerPage}
          />
        </div>
      </div>
    </div>
  )
}
