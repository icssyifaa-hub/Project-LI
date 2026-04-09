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

export function JobTasksTab() {
  const { jobTasks, loading, addJobTask, updateJobTask, deleteJobTask } = useJobTasks()
  const { toast } = useToast()
  
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<JobTask | null>(null)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    code: '',
    name: ''
  })

  const handleAdd = () => {
    setEditingTask(null)
    setFormData({ code: '', name: '' })
    setIsDialogOpen(true)
  }

  const handleEdit = (task: JobTask) => {
    setEditingTask(task)
    setFormData({
      code: task.code,
      name: task.name
    })
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formData.code || !formData.name) {
      toast({ 
        title: "Error", 
        description: "Code and name are required", 
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
      // Error already handled in hook
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this job task?')) return
    try {
      await deleteJobTask(id)
    } catch (error) {
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
      <Card className="border border-gray-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-gray-900">Job Tasks</CardTitle>
              <CardDescription className="text-gray-500">
                Manage job tasks list - All tasks will appear in calendar form dropdown
              </CardDescription>
            </div>
            <Button onClick={handleAdd} className="bg-blue-300 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Add Task
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-16">No</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-24">Code</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {jobTasks.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                      No job tasks found
                    </td>
                  </tr>
                ) : (
                  jobTasks.map((task, index) => (
                    <tr key={task.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-600">{index + 1}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{task.code}</td>
                      <td className="px-4 py-3 text-gray-900">{task.name}</td>
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
          <p className="text-xs text-gray-500 mt-4 flex items-center">
            <Briefcase className="h-3 w-3 mr-1" />
            Tasks added here will appear in the dropdown when adding/editing calendar events.
          </p>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-gray-900">
              {editingTask ? 'Edit Job Task' : 'Add New Job Task'}
            </DialogTitle>
            <DialogDescription className="text-gray-500">
              {editingTask ? 'Edit job task details below' : 'Fill in the details to create a new job task'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="code" className="text-gray-700">Task Code *</Label>
              <div className="flex space-x-2">
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                  placeholder="e.g., CHRA"
                  className="flex-1 border-gray-300 uppercase"
                  maxLength={10}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name" className="text-gray-700">Task Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="e.g., Chemical Health Risk Assessment"
                className="border-gray-300"
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
              className="bg-blue-500 hover:bg-blue-700" 
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