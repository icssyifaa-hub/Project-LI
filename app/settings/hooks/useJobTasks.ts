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
        .order('code', { ascending: true })
      
      if (error) throw error
      setJobTasks(data || [])
    } catch (error) {
      toast({ 
        title: "Error", 
        description: "Failed to fetch job tasks", 
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
          code: taskData.code,
          name: taskData.name,
          created_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (error) throw error
      setJobTasks([...jobTasks, data].sort((a, b) => a.code.localeCompare(b.code)))
      toast({ title: "Job task added successfully" })
      return data
    } catch (error) {
      toast({ 
        title: "Error", 
        description: "Failed to add job task", 
        variant: "destructive" 
      })
      throw error
    }
  }

  const updateJobTask = async (id: string, taskData: JobTaskFormData) => {
    try {
      const { error } = await supabase
        .from('job_tasks')
        .update({
          code: taskData.code,
          name: taskData.name
        })
        .eq('id', id)

      if (error) throw error
      setJobTasks(jobTasks.map(t => t.id === id ? { ...t, ...taskData } : t))
      toast({ title: "Job task updated successfully" })
    } catch (error) {
      toast({ 
        title: "Error", 
        description: "Failed to update job task", 
        variant: "destructive" 
      })
      throw error
    }
  }

  const deleteJobTask = async (id: string) => {
    try {
      const { error } = await supabase
        .from('job_tasks')
        .delete()
        .eq('id', id)

      if (error) throw error
      setJobTasks(jobTasks.filter(t => t.id !== id))
      toast({ title: "Job task deleted successfully" })
    } catch (error) {
      toast({ 
        title: "Error", 
        description: "Failed to delete job task", 
        variant: "destructive" 
      })
      throw error
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