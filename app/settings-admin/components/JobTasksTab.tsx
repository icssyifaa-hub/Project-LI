// File: components/JobTasksTab.tsx (sama je, confirmkan warna button)

'use client'

import { useState } from 'react'
import { useJobTasks } from '../hooks/useJobTasks'
import { JobTask } from '../types'
import { getJobTaskFullName } from '@/lib/settings/job-tasks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { useToast } from '@/components/ui/use-toast'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Loader2, 
  Save,
  Briefcase,
  Search
} from 'lucide-react'
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

export function JobTasksTab() {
  const { jobTasks, addJobTask, updateJobTask, deleteJobTask } = useJobTasks()
  const { toast } = useToast()
  
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<JobTask | null>(null)
  const [pendingDeleteTask, setPendingDeleteTask] = useState<JobTask | null>(null)
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    full_name: '',
  })

  const handleAdd = () => {
    setEditingTask(null)
    setFormData({ name: '', full_name: '' })
    setIsDialogOpen(true)
  }

  const handleEdit = (task: JobTask) => {
    setEditingTask(task)
    setFormData({
      name: task.name,
      full_name: task.full_name || getJobTaskFullName(task.name),
    })
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formData.name) {
      toast({ 
        title: "Error", 
        description: "Task name is required", 
        variant: "destructive" 
      })
      return
    }

    if (!formData.full_name) {
      toast({
        title: "Error",
        description: "Full name is required",
        variant: "destructive"
      })
      return
    }

    setSaving(true)
    try {
      if (editingTask) {
        await updateJobTask(editingTask.id, formData)
      } else {
        await addJobTask(formData)
      }
      setIsDialogOpen(false)
    } catch {
      // Error dah handle dalam hook
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!pendingDeleteTask) return
    try {
      await deleteJobTask(pendingDeleteTask.id)
      setPendingDeleteTask(null)
    } catch {
      // Error dah handle dalam hook
    }
  }

  const filteredJobTasks = jobTasks.filter((task) => {
    const keyword = searchTerm.trim().toLowerCase()
    if (!keyword) return true

    return (
      task.name.toLowerCase().includes(keyword) ||
      (task.full_name || getJobTaskFullName(task.name) || '').toLowerCase().includes(keyword)
    )
  })
  const jobTasksPagination = useSettingsPagination(filteredJobTasks)

  return (
    <>
      <Card className={settingsCardClass}>
        <CardHeader className={settingsHeaderClass}>
          <div className={settingsHeaderRowClass}>
            <div>
              
              <CardTitle className={settingsTitleClass}>
                <Briefcase className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                Job Tasks
              </CardTitle>
              <CardDescription className={settingsDescriptionClass}>
                Manage job tasks list - All tasks will appear in calendar form dropdown
              </CardDescription>
            </div>
            <Button onClick={handleAdd} className={settingsPrimaryButtonClass}>
              <Plus className="h-4 w-4 mr-2" />
              Add Task
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
                placeholder="Search job tasks..."
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
                  <th className={`${settingsHeaderCellClass} w-40`}>Job Task</th>
                  <th className={settingsHeaderCellClass}>Full Name</th>
                  <th className={`${settingsHeaderCellClass} w-24`}>Actions</th>
                </tr>
              </thead>
              <tbody className={settingsTableBodyClass}>
                {filteredJobTasks.length === 0 ? (
                  <tr>
                    <td colSpan={4} className={settingsEmptyCellClass}>
                      {searchTerm ? 'No job tasks match your search.' : 'No job tasks found'}
                    </td>
                  </tr>
                ) : (
                  jobTasksPagination.paginatedRows.map((task, index) => (
                    <tr key={task.id} className={settingsTableRowClass}>
                      <td className={settingsMutedCellClass}>{jobTasksPagination.pageStart + index + 1}</td>
                      <td className={settingsStrongCellClass}>{task.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                        {task.full_name || getJobTaskFullName(task.name) || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            onClick={() => handleEdit(task)}
                            title="Edit task"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => setPendingDeleteTask(task)}
                            title="Delete task"
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
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className={`sm:max-w-md ${settingsDialogContentClass}`}>
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-gray-100">
              {editingTask ? 'Edit Job Task' : 'Add New Job Task'}
            </DialogTitle>
            <DialogDescription className="text-gray-500 dark:text-gray-400">
              {editingTask ? 'Edit job task details below' : 'Fill in the details to create a new job task'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name" className={settingsLabelClass}>Job Task *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => {
                  const name = e.target.value
                  const suggestedFullName = getJobTaskFullName(name)
                  setFormData((current) => ({
                    ...current,
                    name,
                    full_name: !current.full_name || current.full_name === getJobTaskFullName(current.name)
                      ? suggestedFullName
                      : current.full_name,
                  }))
                }}
                placeholder="e.g., CHRA"
                className={settingsInputClass}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="full_name" className={settingsLabelClass}>Full Name *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                placeholder="e.g., Chemical Health Risk Assessment"
                className={settingsInputClass}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="button" 
              className={settingsPrimaryButtonClass} 
              onClick={handleSave}
              disabled={saving}
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Save className="h-4 w-4 mr-2" />
              {editingTask ? 'Update' : 'Create'} Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingDeleteTask} onOpenChange={(open) => !open && setPendingDeleteTask(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Job Task?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{pendingDeleteTask?.name}&quot;? This action cannot be undone.
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
