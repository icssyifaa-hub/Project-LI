import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, UserFormData } from '../types'
import { useToast } from '@/components/ui/use-toast'

export function useUsers() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const supabase = createClient()

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
      // Ensure color is included if provided
      const newUser = {
        ...userData,
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
    } catch (error) {
      toast({ 
        title: "Error", 
        description: "Failed to add user", 
        variant: "destructive" 
      })
      throw error
    }
  }

  const updateUser = async (id: string, userData: Partial<UserFormData>) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          ...userData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) throw error
      
      // Update local state - important untuk color updates
      setUsers(users.map(u => u.id === id ? { ...u, ...userData } : u))
      
      toast({ title: "User updated successfully" })
    } catch (error) {
      toast({ 
        title: "Error", 
        description: "Failed to update user", 
        variant: "destructive" 
      })
      throw error
    }
  }

  const deleteUser = async (id: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id)

      if (error) throw error
      setUsers(users.filter(u => u.id !== id))
      toast({ title: "User deleted successfully" })
    } catch (error) {
      toast({ 
        title: "Error", 
        description: "Failed to delete user", 
        variant: "destructive" 
      })
      throw error
    }
  }

  // Optional: Function to get user by ID
  const getUserById = (id: string) => {
    return users.find(u => u.id === id)
  }

  // Optional: Function to get users by role
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
    deleteUser,
    getUserById,
    getUsersByRole,
    refresh: fetchUsers
  }
}