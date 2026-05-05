// app/hooks/useUsers.ts
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, UserFormData } from '../types'
import { useToast } from '@/components/ui/use-toast'

export function useUsers() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const supabase = createClient()
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  // Get current logged in user
  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      const user = JSON.parse(userData)
      setCurrentUserId(user.id)
    }
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      toast({ 
        title: "Error", 
        description: "Failed to fetch users", 
        variant: "destructive" 
      })
    } finally {
      setLoading(false)
    }
  }

  const addUser = async (userData: UserFormData) => {
    try {
      const newUser = {
        name: userData.name,
        email: userData.email,
        password: userData.password,
        role: userData.role,
        is_active: true,
        created_at: new Date().toISOString()
      }
      
      const { data, error } = await supabase
        .from('users')
        .insert([newUser])
        .select()
        .single()

      if (error) throw error
      setUsers([data, ...users])
      toast({ title: "User added successfully" })
      return data
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to add user", 
        variant: "destructive" 
      })
      throw error
    }
  }

  const updateUser = async (id: string, userData: Partial<UserFormData>) => {
    try {
      const updateData: any = {
        name: userData.name,
        email: userData.email,
        role: userData.role,
        updated_at: new Date().toISOString()
      }
      
      // Only update password if provided
      if (userData.password && userData.password.trim() !== '') {
        updateData.password = userData.password
      }
      
      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', id)

      if (error) throw error
      
      setUsers(users.map(u => u.id === id ? { ...u, ...updateData } : u))
      
      toast({ title: "User updated successfully" })
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update user", 
        variant: "destructive" 
      })
      throw error
    }
  }

  // Toggle user active status
  const toggleUserStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          is_active: !currentStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) throw error
      
      setUsers(users.map(u => u.id === id ? { ...u, is_active: !currentStatus } : u))
      
      toast({ 
        title: "Success", 
        description: `User ${!currentStatus ? 'activated' : 'deactivated'} successfully` 
      })
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update user status", 
        variant: "destructive" 
      })
      throw error
    }
  }

  const getUserByEmail = async (email: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single()
      
      if (error) throw error
      return data
    } catch (error) {
      return null
    }
  }

  const getUserById = (id: string) => {
    return users.find(u => u.id === id)
  }

  const getUsersByRole = (role: 'admin' | 'staff') => {
    return users.filter(u => u.role === role)
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  return {
    users,
    loading,
    addUser,
    updateUser,
    toggleUserStatus,
    getUserById,
    getUsersByRole,
    getUserByEmail,
    refresh: fetchUsers,
    currentUserId
  }
}