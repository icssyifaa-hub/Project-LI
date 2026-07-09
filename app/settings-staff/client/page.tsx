'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, Loader2, RefreshCw, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import type { AppUser } from '@/lib/auth/client'
import {
  CLIENT_SETUP_MESSAGE,
  Client,
  fetchClients,
  isMissingClientTableError,
} from '@/lib/settings/clients'
import { SettingsPagination, useSettingsPagination } from '@/app/settings-admin/components/SettingsPagination'

const tableHeaderCellClass = 'border-r border-black px-4 py-3 text-left text-[11px] font-semibold uppercase text-gray-700 dark:text-gray-200'
const tableCellClass = 'border-r border-black px-4 py-3 text-black dark:text-gray-100'

export default function ClientPage() {
  const [user, setUser] = useState<AppUser | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const loadClients = useCallback(async () => {
    setLoading(true)
    setErrorMessage('')
    try {
      const data = await fetchClients(supabase)
      setClients(data)
    } catch (error) {
      setClients([])
      setErrorMessage(
        isMissingClientTableError(error)
          ? CLIENT_SETUP_MESSAGE
          : 'Failed to load client list'
      )
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
    loadClients()
  }, [loadClients, router])

  const filteredClients = clients.filter((client) => {
    const keyword = searchTerm.toLowerCase()
    return (
      client.client_name.toLowerCase().includes(keyword) ||
      client.location.toLowerCase().includes(keyword) ||
      (client.address || '').toLowerCase().includes(keyword)
    )
  })
  const clientsPagination = useSettingsPagination(filteredClients)

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50 p-2 dark:bg-gray-950 sm:p-3 lg:p-4">
      <div className="w-full max-w-none space-y-6">
        <div className="-mx-2 -mt-2 flex flex-col gap-4 border-b border-gray-200 bg-white px-2 py-4 dark:border-gray-800 dark:bg-gray-950 sm:-mx-3 sm:-mt-3 sm:flex-row sm:items-center sm:justify-between sm:px-3 lg:-mx-4 lg:-mt-4 lg:px-4">
          <div>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Client</h1>
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {clients.length} clients
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search client..."
                className="w-full border-gray-300 bg-white pl-8 text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 sm:w-64"
              />
            </div>
            <Button
              variant="outline"
              onClick={loadClients}
              disabled={loading}
              className="w-full border-gray-300 text-gray-900 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-800 sm:w-auto"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {errorMessage && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
            {errorMessage}
          </div>
        )}

        <div className="overflow-hidden rounded-lg border border-black bg-white shadow-sm ring-1 ring-black/10 dark:bg-gray-900">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead className="bg-gray-100 dark:bg-gray-800">
                <tr className="border-b border-black">
                  <th className={`${tableHeaderCellClass} w-20`}>No</th>
                  <th className={tableHeaderCellClass}>Client Name</th>
                  <th className={tableHeaderCellClass}>Location</th>
                  <th className={tableHeaderCellClass}>Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="border-t border-black px-4 py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <Loader2 className="mb-2 h-8 w-8 animate-spin text-blue-600" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">Loading clients...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredClients.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="border-t border-black px-4 py-12 text-center">
                      <p className="text-gray-500 dark:text-gray-300">No clients found</p>
                    </td>
                  </tr>
                ) : (
                  clientsPagination.paginatedRows.map((client, index) => (
                    <tr key={client.id} className="border-b border-black bg-white transition-colors hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800">
                      <td className={tableCellClass}>{clientsPagination.pageStart + index + 1}</td>
                      <td className={`${tableCellClass} font-semibold`}>{client.client_name}</td>
                      <td className={tableCellClass}>{client.location}</td>
                      <td className={tableCellClass}>{client.address || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <SettingsPagination
            currentPage={clientsPagination.currentPage}
            rowsPerPage={clientsPagination.rowsPerPage}
            totalItems={filteredClients.length}
            totalPages={clientsPagination.totalPages}
            showingStart={clientsPagination.showingStart}
            showingEnd={clientsPagination.showingEnd}
            onPageChange={clientsPagination.setCurrentPage}
            onRowsPerPageChange={clientsPagination.setRowsPerPage}
          />
        </div>
      </div>
    </div>
  )
}
