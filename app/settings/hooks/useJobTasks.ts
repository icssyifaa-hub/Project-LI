'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { JobTask, JobTaskFormData } from '../types'
import { useToast } from '@/components/ui/use-toast'

export function useJobTasks() {
  const [jobTasks, setJobTasks] = useState<JobTask[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const supabase = createClient()

  const fetchJobTasks = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('job_tasks')
        .select('*')
        .order('name', { ascending: true })
      
      if (error) throw error
      setJobTasks(data || [])
    } catch (error: any) {
      console.error('Fetch error:', error)
      toast({ 
        title: "Error", 
        description: error.message || "Failed to fetch job tasks", 
        variant: "destructive" 
      })
    } finally {
      setLoading(false)
    }
  }

  const addJobTask = async (taskData: JobTaskFormData) => {
    try {
      const { data, error } = await supabase
        .from('job_tasks')
        .insert([{
          name: taskData.name.trim(),
          created_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (error) throw error
      
      // Update state with new task
      setJobTasks(prevTasks => [...prevTasks, data].sort((a, b) => a.name.localeCompare(b.name)))
      
      toast({ 
        title: "Success", 
        description: "Job task added successfully" 
      })
      
      return data
    } catch (error: any) {
      console.error('Add error:', error)
      toast({ 
        title: "Error", 
        description: error.message || "Failed to add job task", 
        variant: "destructive" 
      })
      throw error // Important: Re-throw so component knows it failed
    }
  }

  const updateJobTask = async (id: string, taskData: JobTaskFormData) => {
    try {
      const { error } = await supabase
        .from('job_tasks')
        .update({
          name: taskData.name.trim()
        })
        .eq('id', id)

      if (error) throw error
      
      // Update state
      setJobTasks(prevTasks => 
        prevTasks.map(t => t.id === id ? { ...t, name: taskData.name.trim() } : t)
          .sort((a, b) => a.name.localeCompare(b.name))
      )
      
      toast({ 
        title: "Success", 
        description: "Job task updated successfully" 
      })
      
    } catch (error: any) {
      console.error('Update error:', error)
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update job task", 
        variant: "destructive" 
      })
      throw error // Important: Re-throw so component knows it failed
    }
  }

  const deleteJobTask = async (id: string) => {
    try {
      const { error } = await supabase
        .from('job_tasks')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      // Update state
      setJobTasks(prevTasks => prevTasks.filter(t => t.id !== id))
      
      toast({ 
        title: "Success", 
        description: "Job task deleted successfully" 
      })
      
    } catch (error: any) {
      console.error('Delete error:', error)
      toast({ 
        title: "Error", 
        description: error.message || "Failed to delete job task", 
        variant: "destructive" 
      })
      throw error // Important: Re-throw so component knows it failed
    }
  }

  useEffect(() => {
    fetchJobTasks()
  }, [])

  return {
    jobTasks,
    loading,
    addJobTask,
    updateJobTask,
    deleteJobTask,
    refresh: fetchJobTasks
  }
}