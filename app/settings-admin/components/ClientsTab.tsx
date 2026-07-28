'use client'
import { useState } from 'react'
import { Building2, Edit, Loader2, Plus, Save, Search, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { useClients } from '../hooks/useClients'
import { getClientTableRows, type Client } from '@/lib/settings/clients'
import type { ClientFormData } from '../types'
import {
  settingsCardClass,
  settingsContentClass,
  settingsDescriptionClass,
  settingsDialogContentClass,
  settingsEmptyCellClass,
  settingsHeaderCellClass,
  settingsHeaderClass,
  settingsHeaderRowClass,
  settingsInputClass,
  settingsLabelClass,
  settingsMutedCellClass,
  settingsPrimaryButtonClass,
  settingsStrongCellClass,
  settingsTableBodyClass,
  settingsTableClass,
  settingsTableHeaderClass,
  settingsTableRowClass,
  settingsTableWrapperClass,
  settingsTitleClass,
} from './settings-styles'
import { SettingsPagination, useSettingsPagination } from './SettingsPagination'

const initialFormData: ClientFormData = {
  client_name: '',
  location: '',
  address: '',
}

export function ClientsTab() {
  const {
    client,
    addClient,
    updateClient,
    deleteClient,
  } = useClients()
  const { toast } = useToast()

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [pendingDeleteClient, setPendingDeleteClient] = useState<Client | null>(null)
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState<ClientFormData>(initialFormData)

  const filteredClient = client.filter((item) => {
    const keyword = searchTerm.trim().toLowerCase()
    if (!keyword) return true

    return (
      item.client_name.toLowerCase().includes(keyword) ||
      item.location.toLowerCase().includes(keyword) ||
      (item.address || '').toLowerCase().includes(keyword)
    )
  })
  const clientPagination = useSettingsPagination(filteredClient)
  const clientTableRows = getClientTableRows(
    clientPagination.paginatedRows,
    clientPagination.pageStart
  )

  const handleAdd = () => {
    setEditingClient(null)
    setFormData(initialFormData)
    setIsDialogOpen(true)
  }

  const handleEdit = (item: Client) => {
    setEditingClient(item)
    setFormData({
      client_name: item.client_name,
      location: item.location,
      address: item.address || '',
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
      if (editingClient) {
        await updateClient(editingClient.id, formData)
      } else {
        await addClient(formData)
      }
      setIsDialogOpen(false)
    } catch {
      //The hook shows the correct toast , including setup-required messages.
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!pendingDeleteClient) return
    try {
      await deleteClient(pendingDeleteClient.id)
      setPendingDeleteClient(null)
    } catch {
      // The hook shows the error toast. 
    }
  }

  return (
    <>
      <Card className={settingsCardClass}>
        <CardHeader className={settingsHeaderClass}>
          <div className={settingsHeaderRowClass}>
            <div>
              <CardTitle className={settingsTitleClass}>
                <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                Client 
              </CardTitle>
              <CardDescription className={settingsDescriptionClass}>
                Manage client names and locations for task dropdowns
              </CardDescription>
            </div>
            <Button onClick={handleAdd} className={settingsPrimaryButtonClass}>
              <Plus className="mr-2 h-4 w-4" />
              New Client
            </Button>
          </div>
        </CardHeader>

        <CardContent className={settingsContentClass}>
          <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-gray-50/70 p-3 dark:border-gray-800 dark:bg-gray-950/40 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search client, location, address..."
                className={`pl-9 ${settingsInputClass}`}
              />
            </div>
          </div>

          <div className={settingsTableWrapperClass}>
            <div className="overflow-x-auto">
              <table className={settingsTableClass}>
                <thead className={settingsTableHeaderClass}>
                  <tr>
                    <th className={`${settingsHeaderCellClass} w-16`}>No</th>
                    <th className={settingsHeaderCellClass}>Client Name</th>
                    <th className={settingsHeaderCellClass}>Location</th>
                    <th className={settingsHeaderCellClass}>Address</th>
                    <th className={`${settingsHeaderCellClass} w-24`}>Actions</th>
                  </tr>
                </thead>
                <tbody className={settingsTableBodyClass}>
                  {filteredClient.length === 0 ? (
                    <tr>
                      <td colSpan={5} className={settingsEmptyCellClass}>
                        {searchTerm ? 'No clients match your search.' : 'No clients found'}
                      </td>
                    </tr>
                  ) : (
                    clientTableRows.map((item) => (
                      <tr key={item.id} className={settingsTableRowClass}>
                        <td className={settingsMutedCellClass}>{item.displayIndex}</td>
                        {item.isFirstClientRow && (
                          <td
                            rowSpan={item.clientNameRowSpan}
                            className={`${settingsStrongCellClass} align-middle`}
                          >
                            {item.client_name}
                          </td>
                        )}
                        <td className={settingsMutedCellClass}>{item.location}</td>
                        <td className={settingsMutedCellClass}>{item.address || '-'}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-950/50"
                              onClick={() => handleEdit(item)}
                              title="Edit client"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/50"
                              onClick={() => setPendingDeleteClient(item)}
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
              currentPage={clientPagination.currentPage}
              rowsPerPage={clientPagination.rowsPerPage}
              totalItems={filteredClient.length}
              totalPages={clientPagination.totalPages}
              showingStart={clientPagination.showingStart}
              showingEnd={clientPagination.showingEnd}
              onPageChange={clientPagination.setCurrentPage}
              onRowsPerPageChange={clientPagination.setRowsPerPage}
            />
          </div>

        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className={`sm:max-w-md ${settingsDialogContentClass}`}>
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-gray-100">
              {editingClient ? 'Edit Client Location' : 'New Client Location'}
            </DialogTitle>
            <DialogDescription className="text-gray-500 dark:text-gray-400">
              Add a client and one of its available locations
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="client_name" className={settingsLabelClass}>Client Name *</Label>
              <Input
                id="client_name"
                value={formData.client_name}
                onChange={(event) => setFormData({ ...formData, client_name: event.target.value })}
                placeholder="e.g., PSJ Feed Sdn Bhd"
                className={settingsInputClass}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location" className={settingsLabelClass}>Location *</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(event) => setFormData({ ...formData, location: event.target.value })}
                placeholder="e.g., Tasek Gelugor"
                className={settingsInputClass}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address" className={settingsLabelClass}>Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(event) => setFormData({ ...formData, address: event.target.value })}
                placeholder="e.g., Lot 12, Kawasan Perindustrian"
                className={settingsInputClass}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" className={settingsPrimaryButtonClass} onClick={handleSave} disabled={saving}>
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
    </>
  )
}
