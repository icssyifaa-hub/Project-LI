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
import { Plus, Edit, Eye, EyeOff, Loader2, Save, Power, PowerOff, Users as UsersIcon } from 'lucide-react'
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
  settingsSelectContentClass,
  settingsTableBodyClass,
  settingsTableClass,
  settingsTableHeaderClass,
  settingsTableRowClass,
  settingsTableWrapperClass,
  settingsTitleClass,
} from './settings-styles'

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
      <Card className={settingsCardClass}>
        <CardHeader className={settingsHeaderClass}>
          <div className={settingsHeaderRowClass}>
            <div>
              <CardTitle className={settingsTitleClass}>
                <UsersIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                User Management
              </CardTitle>
              <CardDescription className={settingsDescriptionClass}>
                Manage system users - All changes saved to database
              </CardDescription>
            </div>
            <Button onClick={handleAdd} className={settingsPrimaryButtonClass}>
              <Plus className="h-4 w-4 mr-2" />
              Add User
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
                  <th className={settingsHeaderCellClass}>Name</th>
                  <th className={settingsHeaderCellClass}>Email</th>
                  <th className={settingsHeaderCellClass}>Password</th>
                  <th className={settingsHeaderCellClass}>Role</th>
                  <th className={settingsHeaderCellClass}>Status</th>
                  <th className={`${settingsHeaderCellClass} w-24`}>Actions</th>
                </tr>
              </thead>
              <tbody className={settingsTableBodyClass}>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className={settingsEmptyCellClass}>
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map((user, index) => (
                    <tr key={user.id} className={`${settingsTableRowClass} ${!user.is_active && user.role === 'staff' ? 'bg-gray-100 dark:bg-gray-800/70' : ''}`}>
                      <td className={settingsMutedCellClass}>{index + 1}</td>
                      <td className="px-4 py-3">
                        <span className={`font-medium ${!user.is_active && user.role === 'staff' ? 'text-gray-400 line-through dark:text-gray-500' : 'text-gray-900 dark:text-gray-100'}`}>
                          {user.name}
                        </span>
                        {user.id === currentUserId && (
                          <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">(You)</span>
                        )}
                      </td>
                      <td className={`px-4 py-3 ${!user.is_active && user.role === 'staff' ? 'text-gray-400 dark:text-gray-500' : 'text-gray-600 dark:text-gray-300'}`}>
                        {user.email}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-2">
                          <span className={`font-mono ${!user.is_active && user.role === 'staff' ? 'text-gray-400 dark:text-gray-500' : 'text-gray-600 dark:text-gray-300'}`}>
                            {showPassword[user.id] ? user.password : '••••••••'}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
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
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                        } ${!user.is_active && user.role === 'staff' ? 'opacity-50' : ''}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          user.role === 'admin'
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300'
                            : user.is_active
                              ? 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300'
                              : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-100'
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
                                  ? 'text-orange-600 hover:bg-orange-50 dark:text-orange-300 dark:hover:bg-orange-950/40'
                                  : 'text-green-600 hover:bg-green-50 dark:text-green-300 dark:hover:bg-green-950/40'
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
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className={`sm:max-w-md ${settingsDialogContentClass}`}>
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-gray-100">
              {editingUser ? 'Edit User' : 'Add New User'}
            </DialogTitle>
            <DialogDescription className="text-gray-500 dark:text-gray-400">
              {editingUser ? 'Edit user information below. Leave password empty to keep current password.' : 'Fill in the details to create a new user'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name" className={settingsLabelClass}>Full Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="John Doe"
                className={settingsInputClass}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className={settingsLabelClass}>Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="ics.user@gmail.com"
                className={settingsInputClass}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className={settingsLabelClass}>
                Password {!editingUser && '*'}
              </Label>
              <Input
                id="password"
                type="text"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                placeholder={editingUser ? "Leave empty to keep current password" : "Enter password"}
                className={settingsInputClass}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role" className={settingsLabelClass}>Role *</Label>
              <Select
                value={formData.role}
                onValueChange={(value: 'admin' | 'staff') => setFormData({...formData, role: value})}
              >
                <SelectTrigger className={settingsInputClass}>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent className={`${settingsSelectContentClass} max-h-80`}>
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
              className={settingsPrimaryButtonClass}
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
