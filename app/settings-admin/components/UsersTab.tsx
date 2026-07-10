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
import { Check, Copy, Edit, KeyRound, Loader2, Plus, Power, PowerOff, Save, Search, Users as UsersIcon } from 'lucide-react'
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
import { SettingsPagination, useSettingsPagination } from './SettingsPagination'

export function UsersTab() {
  const { users, addUser, updateUser, resetUserPassword, toggleUserStatus, currentUserId } = useUsers({ admin: true })
  const { toast } = useToast()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [saving, setSaving] = useState(false)
  const [resettingUserId, setResettingUserId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [temporaryCredentials, setTemporaryCredentials] = useState<{
    email: string
    password: string
  } | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'staff' as 'admin' | 'staff'
  })

  const handleAdd = () => {
    setEditingUser(null)
    setFormData({ name: '', email: '', role: 'staff' })
    setIsDialogOpen(true)
  }

  const handleEdit = (user: User) => {
    setEditingUser(user)
    setFormData({
      name: user.name,
      email: user.email,
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

    setSaving(true)
    try {
      const updateData = {
        name: formData.name,
        email: formData.email,
        role: formData.role
      }

      if (editingUser) {
        await updateUser(editingUser.id, updateData)
      } else {
        const result = await addUser(formData)
        setTemporaryCredentials({
          email: result.user.email,
          password: result.temporaryPassword,
        })
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

  const handleResetPassword = async (user: User) => {
    setResettingUserId(user.id)
    try {
      const temporaryPassword = await resetUserPassword(user.id)
      setTemporaryCredentials({
        email: user.email,
        password: temporaryPassword,
      })
    } finally {
      setResettingUserId(null)
    }
  }

  const copyTemporaryCredentials = async () => {
    if (!temporaryCredentials) return

    await navigator.clipboard.writeText(
      `ICS CMS\nUsername: ${temporaryCredentials.email}\nTemporary password: ${temporaryCredentials.password}`
    )
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  const filteredUsers = users.filter((user) => {
    const keyword = searchTerm.trim().toLowerCase()
    if (!keyword) return true

    return (
      user.name.toLowerCase().includes(keyword) ||
      user.email.toLowerCase().includes(keyword) ||
      user.role.toLowerCase().includes(keyword) ||
      (user.auth_status || '').toLowerCase().includes(keyword) ||
      (user.is_active ? 'active' : 'inactive').includes(keyword)
    )
  })
  const usersPagination = useSettingsPagination(filteredUsers)

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
          <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-gray-50/70 p-3 dark:border-gray-800 dark:bg-gray-950/40 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search users..."
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
                  <th className={settingsHeaderCellClass}>Name</th>
                  <th className={settingsHeaderCellClass}>Email</th>
                  <th className={settingsHeaderCellClass}>Account</th>
                  <th className={settingsHeaderCellClass}>Role</th>
                  <th className={settingsHeaderCellClass}>Status</th>
                  <th className={`${settingsHeaderCellClass} w-24`}>Actions</th>
                </tr>
              </thead>
              <tbody className={settingsTableBodyClass}>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className={settingsEmptyCellClass}>
                      {searchTerm ? 'No users match your search.' : 'No users found'}
                    </td>
                  </tr>
                ) : (
                  usersPagination.paginatedRows.map((user, index) => (
                    <tr key={user.id} className={`${settingsTableRowClass} ${!user.is_active && user.role === 'staff' ? 'bg-gray-100 dark:bg-gray-800/70' : ''}`}>
                      <td className={settingsMutedCellClass}>{usersPagination.pageStart + index + 1}</td>
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
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                          user.auth_status === 'active'
                            ? 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300'
                            : user.auth_status === 'password_change_required'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                        }`}>
                          {user.auth_status === 'active'
                            ? 'Password set'
                            : user.auth_status === 'password_change_required'
                              ? 'Must change password'
                              : 'Legacy account'}
                        </span>
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
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-violet-600 hover:bg-violet-50 hover:text-violet-700 dark:text-violet-300 dark:hover:bg-violet-950/40"
                            onClick={() => handleResetPassword(user)}
                            title="Generate temporary password"
                            disabled={
                              resettingUserId === user.id ||
                              user.auth_status === 'legacy' ||
                              user.id === currentUserId
                            }
                          >
                            {resettingUserId === user.id
                              ? <Loader2 className="h-4 w-4 animate-spin" />
                              : <KeyRound className="h-4 w-4" />}
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
            <SettingsPagination
              currentPage={usersPagination.currentPage}
              rowsPerPage={usersPagination.rowsPerPage}
              totalItems={filteredUsers.length}
              totalPages={usersPagination.totalPages}
              showingStart={usersPagination.showingStart}
              showingEnd={usersPagination.showingEnd}
              onPageChange={usersPagination.setCurrentPage}
              onRowsPerPageChange={usersPagination.setRowsPerPage}
            />
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
              {editingUser
                ? 'Edit the user details.'
                : 'A temporary password will be generated. Give it to the user privately.'}
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
              {editingUser ? <Save className="h-4 w-4 mr-2" /> : <KeyRound className="h-4 w-4 mr-2" />}
              {editingUser ? 'Update User' : 'Create User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(temporaryCredentials)}
        onOpenChange={(open) => {
          if (!open) {
            setTemporaryCredentials(null)
            setCopied(false)
          }
        }}
      >
        <DialogContent className={`sm:max-w-md ${settingsDialogContentClass}`}>
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-gray-100">
              Temporary password
            </DialogTitle>
            <DialogDescription className="text-gray-500 dark:text-gray-400">
              This password is shown once.
            </DialogDescription>
          </DialogHeader>

          {temporaryCredentials && (
            <div className="space-y-4 py-3">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950">
                <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Username</p>
                <p className="mt-1 break-all font-medium text-gray-900 dark:text-gray-100">
                  {temporaryCredentials.email}
                </p>
                <p className="mt-4 text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                  Temporary password
                </p>
                <p className="mt-1 break-all font-mono text-lg font-semibold text-blue-700 dark:text-blue-300">
                  {temporaryCredentials.password}
                </p>
              </div>

              <p className="text-sm text-amber-700 dark:text-amber-300">
                The user must create a new password immediately after signing in.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={copyTemporaryCredentials}>
              {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
              {copied ? 'Copied' : 'Copy details'}
            </Button>
            <Button onClick={() => setTemporaryCredentials(null)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
