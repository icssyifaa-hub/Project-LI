import { useCallback, useEffect, useState } from 'react'
import { User, UserFormData } from '../types'
import { useToast } from '@/components/ui/use-toast'
import { createClient } from '@/lib/supabase/client'

type UseUsersOptions = {
  admin?: boolean
}

const withAuthStatus = (user: User): User => ({
  ...user,
  auth_status: user.auth_user_id
    ? user.must_change_password
      ? 'password_change_required'
      : 'active'
    : 'legacy',
})

export function useUsers({ admin = false }: UseUsersOptions = {}) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (!admin) return

    const userData = localStorage.getItem('user')
    if (userData) {
      const user = JSON.parse(userData)
      setCurrentUserId(user.id)
    }
  }, [admin])

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      if (admin) {
        const response = await fetch('/api/admin/users', { cache: 'no-store' })
        const result = await response.json()

        if (response.ok) {
          setUsers(result.users || [])
          return
        }

        if (response.status !== 401) {
          throw new Error(result.error || 'Failed to fetch users')
        }
      }

      const supabase = createClient()
      const { data, error } = await supabase
        .from('users')
        .select('id, auth_user_id, name, email, role, is_active, must_change_password, created_at, updated_at, phone, color')
        .order('created_at', { ascending: false })

      if (error) throw error
      setUsers((data || []).map((user) => withAuthStatus(user as User)))
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to fetch users',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [admin, toast])

  const addUser = async (userData: UserFormData) => {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      })
      const result = await response.json()

      if (!response.ok) throw new Error(result.error || 'Failed to create user')
      setUsers((current) => [result.user, ...current])
      toast({
        title: 'User created',
        description: 'Give the temporary password to the user privately.',
      })
      return {
        user: result.user as User,
        temporaryPassword: String(result.temporary_password || ''),
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create user',
        variant: 'destructive',
      })
      throw error
    }
  }

  const resetUserPassword = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset_password' }),
      })
      const result = await response.json()

      if (!response.ok) throw new Error(result.error || 'Failed to reset password')
      setUsers((current) =>
        current.map((user) => user.id === id ? { ...user, ...result.user } : user)
      )
      toast({
        title: 'Temporary password generated',
        description: 'Give it to the user privately. It is only shown once.',
      })
      return String(result.temporary_password || '')
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to reset password',
        variant: 'destructive',
      })
      throw error
    }
  }

  const updateUser = async (id: string, userData: Partial<UserFormData>) => {
    try {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      })
      const result = await response.json()

      if (!response.ok) throw new Error(result.error || 'Failed to update user')
      setUsers((current) =>
        current.map((user) => user.id === id ? { ...user, ...result.user } : user)
      )
      toast({ title: 'User updated successfully' })
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update user',
        variant: 'destructive',
      })
      throw error
    }
  }

  const toggleUserStatus = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus }),
      })
      const result = await response.json()

      if (!response.ok) throw new Error(result.error || 'Failed to update user status')
      setUsers((current) =>
        current.map((user) => user.id === id ? { ...user, ...result.user } : user)
      )
      toast({
        title: 'Success',
        description: `User ${!currentStatus ? 'activated' : 'deactivated'} successfully`,
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update user status',
        variant: 'destructive',
      })
      throw error
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  return {
    users,
    loading,
    addUser,
    updateUser,
    resetUserPassword,
    toggleUserStatus,
    currentUserId,
  }
}
