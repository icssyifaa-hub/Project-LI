'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, Edit, Loader2, Plus, RefreshCw, Save, Search, Trash2 } from 'lucide-react'
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
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { createClient } from '@/lib/supabase/client'
import type { AppUser } from '@/lib/auth/client'
import {
  CLIENT_SETUP_MESSAGE,
  Client,
  fetchClients,
  getClientTableRows,
  isMissingClientTableError,
} from '@/lib/settings/clients'
import { SettingsPagination, useSettingsPagination } from '@/app/settings-admin/components/SettingsPagination'

const tableHeaderCellClass = 'border-r border-black px-4 py-3 text-left text-[12px] font-semibold uppercase text-gray-700 dark:text-gray-200'
const tableCellClass = 'border-r border-black px-4 py-3 text-black dark:text-gray-100'
const inputClass = 'border-gray-300 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100'

type ClientFormData = {
  client_name: string
  location: string
  address: string
}

const initialFormData: ClientFormData = {
  client_name: '',
  location: '',
  address: '',
}

const getErrorMessage = (error: unknown) =>
  error instanceof Error
    ? error.message
    : error && typeof error === 'object' && 'message' in error
      ? String((error as { message?: unknown }).message || '')
      : undefined

const getClientErrorMessage = (error: unknown, fallback: string) => {
  if (isMissingClientTableError(error)) return CLIENT_SETUP_MESSAGE

  const message = getErrorMessage(error)
  if (message?.includes('row-level security') || message?.includes('permission denied')) {
    return `${message}. Re-run scripts/database/setup-clients.sql in Supabase SQL Editor to update table permissions.`
  }

  return message || fallback
}

export default function ClientPage() {
  const [user, setUser] = useState<AppUser | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [pendingDeleteClient, setPendingDeleteClient] = useState<Client | null>(null)
  const [formData, setFormData] = useState<ClientFormData>(initialFormData)
  const router = useRouter()
  const { toast } = useToast()
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
  const clientTableRows = getClientTableRows(
    clientsPagination.paginatedRows,
    clientsPagination.pageStart
  )

  const handleAdd = () => {
    setEditingClient(null)
    setFormData(initialFormData)
    setIsDialogOpen(true)
  }

  const handleEdit = (client: Client) => {
    setEditingClient(client)
    setFormData({
      client_name: client.client_name,
      location: client.location,
      address: client.address || '',
    })
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formData.client_name.trim() || !formData.location.trim()) {
      toast({
        title: 'Error',
        description: 'Client name and location are required',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      const payload = {
        client_name: formData.client_name.trim(),
        location: formData.location.trim(),
        address: formData.address.trim() || null,
        updated_at: new Date().toISOString(),
      }

      if (editingClient) {
        const { error } = await supabase
          .from('client')
          .update(payload)
          .eq('id', editingClient.id)

        if (error) throw error
        toast({ title: 'Success', description: 'Client updated successfully' })
      } else {
        const { error } = await supabase
          .from('client')
          .insert([{ ...payload, created_at: new Date().toISOString() }])

        if (error) throw error
        toast({ title: 'Success', description: 'Client added successfully' })
      }

      setIsDialogOpen(false)
      await loadClients()
    } catch (error) {
      toast({
        title: isMissingClientTableError(error) ? 'Setup Required' : 'Error',
        description: getClientErrorMessage(error, editingClient ? 'Failed to update client' : 'Failed to add client'),
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!pendingDeleteClient) return

    try {
      const { error } = await supabase
        .from('client')
        .delete()
        .eq('id', pendingDeleteClient.id)

      if (error) throw error

      setPendingDeleteClient(null)
      toast({ title: 'Success', description: 'Client location deleted successfully' })
      await loadClients()
    } catch (error) {
      toast({
        title: isMissingClientTableError(error) ? 'Setup Required' : 'Error',
        description: getClientErrorMessage(error, 'Failed to delete client'),
        variant: 'destructive',
      })
    }
  }

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
              onClick={handleAdd}
              className="w-full bg-blue-600 text-white hover:bg-blue-700 sm:w-auto"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Client
            </Button>
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
                  <th className={`${tableHeaderCellClass} w-28`}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="border-t border-black px-4 py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <Loader2 className="mb-2 h-8 w-8 animate-spin text-blue-600" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">Loading clients...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredClients.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="border-t border-black px-4 py-12 text-center">
                      <p className="text-gray-500 dark:text-gray-300">No clients found</p>
                    </td>
                  </tr>
                ) : (
                  clientTableRows.map((client) => (
                    <tr key={client.id} className="border-b border-black bg-white transition-colors hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800">
                      <td className={tableCellClass}>{client.displayIndex}</td>
                      {client.isFirstClientRow && (
                        <td
                          rowSpan={client.clientNameRowSpan}
                          className={`${tableCellClass} align-middle font-semibold`}
                        >
                          {client.client_name}
                        </td>
                      )}
                      <td className={tableCellClass}>{client.location}</td>
                      <td className={tableCellClass}>{client.address || '-'}</td>
                      <td className={tableCellClass}>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-950/50"
                            onClick={() => handleEdit(client)}
                            title="Edit client"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/50"
                            onClick={() => setPendingDeleteClient(client)}
                            title="Delete client"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-white dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingClient ? 'Edit Client Location' : 'New Client Location'}</DialogTitle>
            <DialogDescription className="text-gray-500 dark:text-gray-400">
              Add or update a client and one of its available locations.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="staff-client-name">Client Name *</Label>
              <Input
                id="staff-client-name"
                value={formData.client_name}
                onChange={(event) => setFormData({ ...formData, client_name: event.target.value })}
                placeholder="e.g., Shell Berhad"
                className={inputClass}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-client-location">Location *</Label>
              <Input
                id="staff-client-location"
                value={formData.location}
                onChange={(event) => setFormData({ ...formData, location: event.target.value })}
                placeholder="e.g., Perai"
                className={inputClass}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-client-address">Address</Label>
              <Input
                id="staff-client-address"
                value={formData.address}
                onChange={(event) => setFormData({ ...formData, address: event.target.value })}
                placeholder="e.g., Lot 12, Kawasan Perindustrian"
                className={inputClass}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" className="bg-blue-600 text-white hover:bg-blue-700" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              {editingClient ? 'Update' : 'Create'} Client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!pendingDeleteClient}
        onOpenChange={(open) => !open && setPendingDeleteClient(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Client Location?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{pendingDeleteClient?.client_name}&quot; at &quot;{pendingDeleteClient?.location}&quot;?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 text-white hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
