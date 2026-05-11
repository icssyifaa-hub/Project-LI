// app/components/UsersTab.tsx (Updated)
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { Plus, Edit, Eye, EyeOff, Loader2, Save, Power, PowerOff } from 'lucide-react'

export function UsersTab() {
  const { users, loading, addUser, updateUser, toggleUserStatus, currentUserId } = useUsers()
  const { toast } = useToast()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [saving, setSaving] = useState(false)
  const [showPassword, setShowPassword] = useState<{[key: string]: boolean}>({})
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'staff' as 'admin' | 'staff'
  })

  const handleAdd = () => {
    setEditingUser(null)
    setFormData({ name: '', email: '', password: '', role: 'staff' })
    setIsDialogOpen(true)
  }

  const handleEdit = (user: User) => {
    setEditingUser(user)
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role
    })
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formData.name || !formData.email) {
      toast({ 
        title: "Error", 
        description: "Name and email are required", 
        variant: "destructive" 
      })
      return
    }

    // For new users, password is required
    if (!editingUser && !formData.password) {
      toast({ 
        title: "Error", 
        description: "Password is required for new users", 
        variant: "destructive" 
      })
      return
    }

    setSaving(true)
    try {
      const updateData: any = {
        name: formData.name,
        email: formData.email,
        role: formData.role
      }
      
      // Only include password if it's provided
      if (formData.password && formData.password.trim() !== '') {
        updateData.password = formData.password
      }
      
      if (editingUser) {
        await updateUser(editingUser.id, updateData)
      } else {
        await addUser(formData)
      }
      setIsDialogOpen(false)
    } catch (error) {
      console.error('Save error:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleToggleStatus = async (user: User) => {
    // Don't allow deactivating yourself
    if (user.id === currentUserId) {
      toast({ 
        title: "Error", 
        description: "You cannot deactivate your own account", 
        variant: "destructive" 
      })
      return
    }
    
    // Don't allow deactivating admin accounts
    if (user.role === 'admin') {
      toast({ 
        title: "Error", 
        description: "Cannot deactivate admin accounts. Only staff accounts can be deactivated.", 
        variant: "destructive" 
      })
      return
    }

    await toggleUserStatus(user.id, user.is_active)
  }

  const togglePassword = (userId: string) => {
    setShowPassword(prev => ({ ...prev, [userId]: !prev[userId] }))
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
              <CardTitle className="text-gray-900">User Management</CardTitle>
              <CardDescription className="text-gray-500">
                Manage system users - All changes saved to database
              </CardDescription>
            </div>
            <Button onClick={handleAdd} className="bg-blue-300 hover:bg-blue-300">
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <div className="rounded-lg border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-16">No</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Password</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map((user, index) => (
                    <tr key={user.id} className={`hover:bg-gray-50 ${!user.is_active && user.role === 'staff' ? 'bg-red-50/30' : ''}`}>
                      <td className="px-4 py-3 text-gray-600">{index + 1}</td>
                      <td className="px-4 py-3">
                        <span className={`font-medium ${!user.is_active && user.role === 'staff' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                          {user.name}
                        </span>
                        {user.id === currentUserId && (
                          <span className="ml-2 text-xs text-blue-600">(You)</span>
                        )}
                      </td>
                      <td className={`px-4 py-3 ${!user.is_active && user.role === 'staff' ? 'text-gray-400' : 'text-gray-600'}`}>
                        {user.email}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-2">
                          <span className={`font-mono ${!user.is_active && user.role === 'staff' ? 'text-gray-400' : 'text-gray-600'}`}>
                            {showPassword[user.id] ? user.password : '••••••••'}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => togglePassword(user.id)}
                          >
                            {showPassword[user.id] ? 
                              <EyeOff className="h-3 w-3" /> : 
                              <Eye className="h-3 w-3" />
                            }
                          </Button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          user.role === 'admin' 
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-blue-100 text-blue-700'
                        } ${!user.is_active && user.role === 'staff' ? 'opacity-50' : ''}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          user.role === 'admin' 
                            ? 'bg-purple-100 text-purple-700'
                            : user.is_active 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-red-100 text-red-700'
                        }`}>
                          {user.role === 'admin' ? 'Admin' : (user.is_active ? 'Active' : 'Inactive')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            onClick={() => handleEdit(user)}
                            title="Edit user"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {/* Only show active/deactive button for staff accounts */}
                          {user.role === 'staff' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className={`h-8 w-8 ${
                                user.is_active 
                                  ? 'text-orange-600 hover:text-orange-700 hover:bg-orange-50' 
                                  : 'text-green-600 hover:text-green-700 hover:bg-green-50'
                              }`}
                              onClick={() => handleToggleStatus(user)}
                              title={user.is_active ? 'Deactivate user' : 'Activate user'}
                              disabled={user.id === currentUserId}
                            >
                              {user.is_active ? 
                                <PowerOff className="h-4 w-4" /> : 
                                <Power className="h-4 w-4" />
                              }
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-gray-900">
              {editingUser ? 'Edit User' : 'Add New User'}
            </DialogTitle>
            <DialogDescription className="text-gray-500">
              {editingUser ? 'Edit user information below. Leave password empty to keep current password.' : 'Fill in the details to create a new user'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-gray-700">Full Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="John Doe"
                className="border-gray-300"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="user@icsconsulting.com"
                className="border-gray-300"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700">
                Password {!editingUser && '*'}
              </Label>
              <Input
                id="password"
                type="text"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                placeholder={editingUser ? "Leave empty to keep current password" : "Enter password"}
                className="border-gray-300"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role" className="text-gray-700">Role *</Label>
              <Select
                value={formData.role}
                onValueChange={(value: 'admin' | 'staff') => setFormData({...formData, role: value})}
              >
                <SelectTrigger className="border-gray-300 bg-white">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 shadow-lg max-h-80">
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="button" 
              className="bg-blue-300 hover:bg-blue-300"
              onClick={handleSave}
              disabled={saving}
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Save className="h-4 w-4 mr-2" />
              {editingUser ? 'Update' : 'Create'} User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}