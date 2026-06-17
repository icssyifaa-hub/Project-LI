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
import { Loader2 } from 'lucide-react'

type TaskNumberRow = {
  id: string
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

export function NumberFieldsTab() {
  const supabase = useMemo(() => createClient(), [])
  const [rows, setRows] = useState<TaskNumberRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const fetchTaskNumbers = async () => {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('tasks')
        .select('id, client_name, job_task, job_order_number, final_report_number, date_start')
        .or('job_order_number.not.is.null,final_report_number.not.is.null')
        .order('date_start', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })

      if (!isMounted) return

      if (error) {
        setError(error.message)
        setRows([])
      } else {
        setRows(data || [])
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
    <Card className="border border-gray-200">
      <CardHeader>
        <CardTitle className="text-gray-900">Number Fields</CardTitle>
        <CardDescription className="text-gray-500">
          Job Order Number and Final Report Number
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="border-b border-gray-200 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">Field</th>
                <th className="px-4 py-3">Fill In</th>
                <th className="px-4 py-3">Example</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="px-4 py-3 font-medium text-gray-900">Job Order Number</td>
                <td className="px-4 py-3 text-gray-600">Job order reference</td>
                <td className="px-4 py-3">
                  <span className="rounded bg-blue-50 px-2 py-1 font-medium text-blue-700">JO-2026-001</span>
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium text-gray-900">Final Report Number</td>
                <td className="px-4 py-3 text-gray-600">Final report reference</td>
                <td className="px-4 py-3">
                  <span className="rounded bg-emerald-50 px-2 py-1 font-medium text-emerald-700">FR-2026-001</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <h3 className="font-medium text-gray-900">Existing Numbers</h3>
            <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
              {rows.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-gray-50">
                <tr className="border-b border-gray-200 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Job Task</th>
                  <th className="px-4 py-3">Job Order Number</th>
                  <th className="px-4 py-3">Final Report Number</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-gray-500" colSpan={5}>
                      No numbers found.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {row.client_name || 'Unknown Client'}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{row.job_task || '-'}</td>
                      <td className="px-4 py-3">
                        {row.job_order_number ? (
                          <span className="rounded bg-blue-50 px-2 py-1 font-medium text-blue-700">
                            {row.job_order_number}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {row.final_report_number ? (
                          <span className="rounded bg-emerald-50 px-2 py-1 font-medium text-emerald-700">
                            {row.final_report_number}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(row.date_start)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
