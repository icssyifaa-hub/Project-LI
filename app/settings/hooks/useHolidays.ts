'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Holiday, HolidayFormData } from '../types'
import { useToast } from '@/components/ui/use-toast'

export function useHolidays() {
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const supabase = createClient()

  const fetchHolidays = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('holidays')
        .select('*')
        .order('date', { ascending: true })
      
      if (error) throw error
      setHolidays(data || [])
    } catch (error) {
      toast({ 
        title: "Error", 
        description: "Failed to fetch holidays", 
        variant: "destructive" 
      })
    } finally {
      setLoading(false)
    }
  }

  const addHoliday = async (holidayData: HolidayFormData) => {
    try {
      const { data, error } = await supabase
        .from('holidays')
        .insert([{
          name: holidayData.name,
          date: holidayData.date,
          states: holidayData.states.length === 0 ? null : holidayData.states,
          created_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (error) throw error
      setHolidays([...holidays, data].sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      ))
      toast({ title: "Holiday added successfully" })
      return data
    } catch (error) {
      toast({ 
        title: "Error", 
        description: "Failed to add holiday", 
        variant: "destructive" 
      })
      throw error
    }
  }

  const updateHoliday = async (id: string, holidayData: HolidayFormData) => {
    try {
      const updateData = {
        name: holidayData.name,
        date: holidayData.date,
        states: holidayData.states.length === 0 ? null : holidayData.states
      }

      const { error } = await supabase
        .from('holidays')
        .update(updateData)
        .eq('id', id)

      if (error) throw error
      setHolidays(holidays.map(h => 
        h.id === id ? { ...h, ...updateData } : h
      ))
      toast({ title: "Holiday updated successfully" })
    } catch (error) {
      toast({ 
        title: "Error", 
        description: "Failed to update holiday", 
        variant: "destructive" 
      })
      throw error
    }
  }

  const deleteHoliday = async (id: string) => {
    try {
      const { error } = await supabase
        .from('holidays')
        .delete()
        .eq('id', id)

      if (error) throw error
      setHolidays(holidays.filter(h => h.id !== id))
      toast({ title: "Holiday deleted successfully" })
    } catch (error) {
      toast({ 
        title: "Error", 
        description: "Failed to delete holiday", 
        variant: "destructive" 
      })
      throw error
    }
  }

  useEffect(() => {
    fetchHolidays()
  }, [])

  return {
    holidays,
    loading,
    addHoliday,
    updateHoliday,
    deleteHoliday,
    refresh: fetchHolidays
  }
}