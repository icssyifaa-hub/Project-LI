'use client'

import { useState } from 'react'
import { useUsers } from '../hooks/useUsers'
import { User } from '../types'
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
import { Plus, Edit, Trash2, Loader2, Save, UserCog } from 'lucide-react'

export function StaffTab() {
  const { users, loading, addUser, updateUser, deleteUser } = useUsers()
  const { toast } = useToast()
  
  // Filter hanya staff (bukan admin)
  const staff = users.filter(user => user.role === 'staff')
  
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingStaff, setEditingStaff] = useState<User | null>(null)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    user_id: '',
    name: '',
    email: '',
    password: '',
    role: 'staff' as const
  })

  // Generate random 4-character ID
  const generateUserId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = ''
    for (let i = 0; i < 4; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setFormData({ ...formData, user_id: result })
  }

  const handleAdd = () => {
    setEditingStaff(null)
    setFormData({
      user_id: '',
      name: '',
      email: '',
      password: '',
      role: 'staff'
    })
    generateUserId()
    setIsDialogOpen(true)
  }

  const handleEdit = (staff: User) => {
    setEditingStaff(staff)
    setFormData({
      user_id: staff.user_id,
      name: staff.name,
      email: staff.email,
      password: staff.password,
      role: 'staff'
    })
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    // Validation
    if (!formData.user_id) {
      toast({ 
        title: "Error", 
        description: "Staff ID is required", 
        variant: "destructive" 
      })
      return
    }
    if (!formData.name) {
      toast({ 
        title: "Error", 
        description: "Name is required", 
        variant: "destructive" 
      })
      return
    }
    if (!formData.email) {
      toast({ 
        title: "Error", 
        description: "Email is required", 
        variant: "destructive" 
      })
      return
    }
    if (!formData.password) {
      toast({ 
        title: "Error", 
        description: "Password is required", 
        variant: "destructive" 
      })
      return
    }

    // Check for duplicate user_id (only for new staff)
    if (!editingStaff) {
      const existingUser = users.find(u => u.user_id === formData.user_id)
      if (existingUser) {
        toast({ 
          title: "Error", 
          description: "Staff ID already exists. Please generate a new one.", 
          variant: "destructive" 
        })
        return
      }
    }

    // Check for duplicate email (only for new staff)
    if (!editingStaff) {
      const existingEmail = users.find(u => u.email === formData.email)
      if (existingEmail) {
        toast({ 
          title: "Error", 
          description: "Email already exists", 
          variant: "destructive" 
        })
        return
      }
    }

    setSaving(true)
    try {
      if (editingStaff) {
        await updateUser(editingStaff.id, {
          user_id: formData.user_id,
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: 'staff'
        })
        toast({ title: "Staff updated successfully" })
      } else {
        await addUser({
          user_id: formData.user_id,
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: 'staff'
        })
        toast({ title: "Staff added successfully" })
      }
      setIsDialogOpen(false)
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to save staff", 
        variant: "destructive" 
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this staff member?')) return
    
    try {
      await deleteUser(id)
      toast({ title: "Staff deleted successfully" })
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to delete staff", 
        variant: "destructive" 
      })
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
        <CardHeader className="border-b border-gray-200 bg-gray-50/50">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-gray-900">ICS Consulting Staff</CardTitle>
              <CardDescription className="text-gray-500">
                Manage staff members - They can login to the system
              </CardDescription>
            </div>
            <Button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Add Staff
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="rounded-lg border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-16">No</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Staff ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {staff.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      No staff members found. Click "Add Staff" to create one.
                    </td>
                  </tr>
                ) : (
                  staff.map((member, index) => (
                    <tr key={member.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-600">{index + 1}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{member.user_id}</td>
                      <td className="px-4 py-3 text-gray-900">{member.name}</td>
                      <td className="px-4 py-3 text-gray-600">{member.email}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            onClick={() => handleEdit(member)}
                            title="Edit staff"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDelete(member.id)}
                            title="Delete staff"
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
          
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start space-x-3">
              <UserCog className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-blue-800">About Staff Management</h4>
                <p className="text-sm text-blue-700 mt-1">
                  Staff members are users with role 'staff'. They can:
                </p>
                <ul className="text-sm text-blue-700 list-disc list-inside mt-1 space-y-1">
                  <li>Login to the system using their email and password</li>
                  <li>Be assigned to jobs and appear in dropdowns</li>
                  <li>View calendar and their assignments</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-gray-900">
              {editingStaff ? 'Edit Staff Member' : 'Add New Staff Member'}
            </DialogTitle>
            <DialogDescription className="text-gray-500">
              {editingStaff 
                ? 'Edit staff information below. They will use email and password to login.'
                : 'Fill in the details to create a new staff member. They can login immediately.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="user_id" className="text-gray-700">
                Staff ID <span className="text-red-500">*</span>
              </Label>
              <div className="flex space-x-2">
                <Input
                  id="user_id"
                  value={formData.user_id}
                  onChange={(e) => setFormData({...formData, user_id: e.target.value.toUpperCase()})}
                  placeholder="e.g., MAMJ"
                  className="flex-1 border-gray-300 font-mono uppercase"
                  maxLength={4}
                  required
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={generateUserId}
                  className="whitespace-nowrap"
                >
                  Generate ID
                </Button>
              </div>
              <p className="text-xs text-gray-500">4-character unique ID</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name" className="text-gray-700">
                Full Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="e.g., Ahmad Hanafi"
                className="border-gray-300"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="staff@icsconsulting.com"
                className="border-gray-300"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700">
                Password <span className="text-red-500">*</span>
              </Label>
              <Input
                id="password"
                type="text"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                placeholder="Enter password"
                className="border-gray-300"
                required
              />
              <p className="text-xs text-gray-500">
                {editingStaff 
                  ? 'Leave unchanged to keep current password' 
                  : 'Staff will use this password to login'}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              className="bg-blue-600 hover:bg-blue-700" 
              onClick={handleSave}
              disabled={saving}
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Save className="h-4 w-4 mr-2" />
              {editingStaff ? 'Update' : 'Add'} Staff
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}