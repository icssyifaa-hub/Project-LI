'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Hash, Loader2, Search } from 'lucide-react'
import { getTaskClient, type TaskClientRecord } from '@/lib/settings/task-client'
import {
  settingsCardClass,
  settingsContentClass,
  settingsDescriptionClass,
  settingsEmptyCellClass,
  settingsHeaderCellClass,
  settingsHeaderClass,
  settingsMutedCellClass,
  settingsStrongCellClass,
  settingsTableBodyClass,
  settingsTableClass,
  settingsTableHeaderClass,
  settingsTableRowClass,
  settingsTableWrapperClass,
  settingsTitleClass,
  settingsInputClass,
} from './settings-styles'
import { SettingsPagination, useSettingsPagination } from './SettingsPagination'

type TaskNumberRow = {
  id: string
  client?: TaskClientRecord | TaskClientRecord[] | null
  client_id?: string | null
  client_name: string | null
  job_task: string | null
  job_order_number: string | null
  final_report_number: string | null
  date_start: string | null
}

function formatDate(date: string | null) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('en-GB')
}

export function NumberFileTab() {
  const supabase = useMemo(() => createClient(), [])
  const [rows, setRows] = useState<TaskNumberRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const filteredRows = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    if (!query) return rows

    return rows.filter((row) => {
      return [
        row.client_name,
        row.job_task,
        row.job_order_number,
        row.final_report_number,
        formatDate(row.date_start),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    })
  }, [rows, searchTerm])

  const numberPagination = useSettingsPagination(filteredRows)

  useEffect(() => {
    let isMounted = true

    const fetchTaskNumbers = async () => {
      setLoading(true)
      setError(null)

      const relationResult: any = await supabase
        .from('tasks')
        .select('id, client_name, client_id, job_task, job_order_number, final_report_number, date_start, client:client!tasks_client_id_fkey(id, client_name, location, address)')
        .or('job_order_number.not.is.null,final_report_number.not.is.null')
        .order('date_start', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })

      let data: TaskNumberRow[] | null = relationResult.data
      let error = relationResult.error

      if (error) {
        const fallback: any = await supabase
          .from('tasks')
          .select('id, client_name, job_task, job_order_number, final_report_number, date_start')
          .or('job_order_number.not.is.null,final_report_number.not.is.null')
          .order('date_start', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false })

        data = fallback.data
        error = fallback.error
      }

      if (!isMounted) return

      if (error) {
        setError(error.message)
        setRows([])
      } else {
        setRows((data || []).map((row) => ({
          ...row,
          client_name: getTaskClient(row).client_name || null,
        })))
      }

      setLoading(false)
    }

    fetchTaskNumbers()

    return () => {
      isMounted = false
    }
  }, [supabase])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <Card className={settingsCardClass}>
      <CardHeader className={settingsHeaderClass}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className={settingsTitleClass}>
              <Hash className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Number File
            </CardTitle>
            <CardDescription className={settingsDescriptionClass}>
              Job Order Number and Final Report Number
            </CardDescription>
          </div>
          <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/50 dark:text-blue-300">
            {rows.length} records
          </span>
        </div>
      </CardHeader>
      <CardContent className={settingsContentClass}>
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-gray-50/70 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800 dark:bg-gray-950/40">
          <div className="flex w-full flex-col gap-2 sm:max-w-xl sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search client, task, JO number, FR number..."
                className={`pl-9 ${settingsInputClass}`}
              />
            </div>
          </div>
        </div>

        <div className={settingsTableWrapperClass}>
          <div className="overflow-x-auto">
            <table className={`${settingsTableClass} min-w-[840px]`}>
              <thead className={settingsTableHeaderClass}>
                <tr>
                  <th className={`${settingsHeaderCellClass} w-16`}>No</th>
                  <th className={settingsHeaderCellClass}>Client</th>
                  <th className={settingsHeaderCellClass}>Job Task</th>
                  <th className={settingsHeaderCellClass}>Job Order Number</th>
                  <th className={settingsHeaderCellClass}>Final Report Number</th>
                  <th className={settingsHeaderCellClass}>Date</th>
                </tr>
              </thead>
              <tbody className={settingsTableBodyClass}>
                {numberPagination.paginatedRows.length === 0 ? (
                  <tr>
                    <td className={settingsEmptyCellClass} colSpan={6}>
                      {searchTerm ? 'No numbers match your search.' : 'No numbers found.'}
                    </td>
                  </tr>
                ) : (
                  numberPagination.paginatedRows.map((row, index) => (
                    <tr key={row.id} className={settingsTableRowClass}>
                      <td className={settingsMutedCellClass}>{numberPagination.pageStart + index + 1}</td>
                      <td className={settingsStrongCellClass}>
                        {row.client_name || 'Unknown Client'}
                      </td>
                      <td className={settingsMutedCellClass}>{row.job_task || '-'}</td>
                      <td className="px-4 py-3">
                        {row.job_order_number ? (
                          <span className="rounded bg-blue-50 px-2 py-1 font-medium text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                            {row.job_order_number}
                          </span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {row.final_report_number ? (
                          <span className="rounded bg-emerald-50 px-2 py-1 font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                            {row.final_report_number}
                          </span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">-</span>
                        )}
                      </td>
                      <td className={settingsMutedCellClass}>{formatDate(row.date_start)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <SettingsPagination
            currentPage={numberPagination.currentPage}
            rowsPerPage={numberPagination.rowsPerPage}
            totalItems={filteredRows.length}
            totalPages={numberPagination.totalPages}
            showingStart={numberPagination.showingStart}
            showingEnd={numberPagination.showingEnd}
            onPageChange={numberPagination.setCurrentPage}
            onRowsPerPageChange={numberPagination.setRowsPerPage}
          />
        </div>
      </CardContent>
    </Card>
  )
}
