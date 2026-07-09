// File: hooks/useJobTasks.ts

'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { JobTask, JobTaskFormData } from '../types'
import { useToast } from '@/components/ui/use-toast'
import { getJobTaskFullName } from '@/lib/settings/job-tasks'

const sortJobTasks = (tasks: JobTask[]) =>
  [...tasks].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
  )

export function useJobTasks() {
  const [jobTasks, setJobTasks] = useState<JobTask[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const supabase = createClient()

  const fetchJobTasks = async () => {
    setLoading(true)
    try {
      console.log('Fetching job tasks...')

      const { data, error } = await supabase
        .from('job_tasks')
        .select('*')
        .order('name', { ascending: true })

      if (error) {
        console.error('Error fetching job tasks:', error)
        throw error
      }

      console.log(`Job tasks fetched: ${data?.length || 0} items`)
      setJobTasks(sortJobTasks((data || []).map((task) => ({
        ...task,
        full_name: task.full_name || getJobTaskFullName(task.name),
      }))))
    } catch (error: any) {
      console.error('Failed to fetch job tasks:', error)
      toast({
        title: 'Error',
        description: error?.message || 'Failed to fetch job tasks',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const addJobTask = async (taskData: JobTaskFormData) => {
    try {
      console.log('Adding job task:', taskData)

      const insertData: any = {
        name: taskData.name,
        full_name: taskData.full_name || getJobTaskFullName(taskData.name) || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const { data, error } = await supabase
        .from('job_tasks')
        .insert([insertData])
        .select()
        .single()

      if (error) {
        console.error('Error adding job task:', error)
        throw error
      }

      console.log('Job task added:', data)

      const updatedTasks = sortJobTasks([...jobTasks, {
        ...data,
        full_name: data.full_name || getJobTaskFullName(data.name),
      }])
      setJobTasks(updatedTasks)

      toast({
        title: 'Success',
        description: 'Job task added successfully',
      })

      return data
    } catch (error: any) {
      console.error('Failed to add job task:', error)
      toast({
        title: 'Error',
        description: error?.message || 'Failed to add job task',
        variant: 'destructive',
      })
      throw error
    }
  }

  const updateJobTask = async (id: string, taskData: JobTaskFormData) => {
    try {
      console.log('Updating job task:', { id, taskData })

      const { error } = await supabase
        .from('job_tasks')
        .update({
          name: taskData.name,
          full_name: taskData.full_name || getJobTaskFullName(taskData.name) || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (error) {
        console.error('Error updating job task:', error)
        throw error
      }

      const updatedTasks = sortJobTasks(jobTasks.map(task =>
        task.id === id
          ? {
              ...task,
              name: taskData.name,
              full_name: taskData.full_name || getJobTaskFullName(taskData.name),
            }
          : task
      ))

      setJobTasks(updatedTasks)

      console.log('Job task updated:', id)

      toast({
        title: 'Success',
        description: 'Job task updated successfully',
      })
    } catch (error: any) {
      console.error('Failed to update job task:', error)
      toast({
        title: 'Error',
        description: error?.message || 'Failed to update job task',
        variant: 'destructive',
      })
      throw error
    }
  }

  const deleteJobTask = async (id: string) => {
    try {
      console.log('Deleting job task:', id)

      const { error } = await supabase
        .from('job_tasks')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting job task:', error)
        throw error
      }

      const updatedTasks = jobTasks.filter(task => task.id !== id)
      setJobTasks(updatedTasks)

      console.log('Job task deleted:', id)

      toast({
        title: 'Success',
        description: 'Job task deleted successfully',
      })
    } catch (error: any) {
      console.error('Failed to delete job task:', error)
      toast({
        title: 'Error',
        description: error?.message || 'Failed to delete job task',
        variant: 'destructive',
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
    refresh: fetchJobTasks,
  }
}
