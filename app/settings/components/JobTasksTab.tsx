// File: components/JobTasksTab.tsx (sama je, confirmkan warna button)

'use client'

import { useState } from 'react'
import { useJobTasks } from '../hooks/useJobTasks'
import { JobTask } from '../types'
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
import { useToast } from '@/components/ui/use-toast'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Loader2, 
  Save,
  Briefcase
} from 'lucide-react'
import {
  settingsCardClass,
  settingsContentClass,
  settingsDescriptionClass,
  settingsDialogContentClass,
  settingsEmptyCellClass,
  settingsFooterNoteClass,
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

export function JobTasksTab() {
  const { jobTasks, loading, addJobTask, updateJobTask, deleteJobTask } = useJobTasks()
  const { toast } = useToast()
  
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<JobTask | null>(null)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: ''
  })

  const handleAdd = () => {
    setEditingTask(null)
    setFormData({ name: '' })
    setIsDialogOpen(true)
  }

  const handleEdit = (task: JobTask) => {
    setEditingTask(task)
    setFormData({
      name: task.name
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

    setSaving(true)
    try {
      if (editingTask) {
        await updateJobTask(editingTask.id, formData)
      } else {
        await addJobTask(formData)
      }
      setIsDialogOpen(false)
    } catch (error) {
      // Error dah handle dalam hook
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this job task?')) return
    try {
      await deleteJobTask(id)
    } catch (error) {
      // Error dah handle dalam hook
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

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
          <div className={settingsTableWrapperClass}>
            <div className="overflow-x-auto">
            <table className={settingsTableClass}>
              <thead className={settingsTableHeaderClass}>
                <tr>
                  <th className={`${settingsHeaderCellClass} w-16`}>No</th>
                  <th className={settingsHeaderCellClass}>Task Name</th>
                  <th className={`${settingsHeaderCellClass} w-24`}>Actions</th>
                </tr>
              </thead>
              <tbody className={settingsTableBodyClass}>
                {jobTasks.length === 0 ? (
                  <tr>
                    <td colSpan={3} className={settingsEmptyCellClass}>
                      No job tasks found
                    </td>
                  </tr>
                ) : (
                  jobTasks.map((task, index) => (
                    <tr key={task.id} className={settingsTableRowClass}>
                      <td className={settingsMutedCellClass}>{index + 1}</td>
                      <td className={settingsStrongCellClass}>{task.name}</td>
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
                            onClick={() => handleDelete(task.id)}
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
          </div>
          <p className={settingsFooterNoteClass}>
            <Briefcase className="h-3 w-3 mr-1" />
            Tasks added here will appear in the dropdown when adding/editing calendar events.
          </p>
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
              <Label htmlFor="name" className={settingsLabelClass}>Task Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="e.g., CHRA"
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
    </>
  )
}
