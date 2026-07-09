'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/use-toast'
import type { ClientFormData } from '../types'
import {
  Client,
  CLIENT_SETUP_MESSAGE,
  fetchClients as fetchClientsFromDb,
  isMissingClientTableError,
  sortClients,
} from '@/lib/settings/clients'

const getErrorMessage = (error: unknown) =>
  error instanceof Error
    ? error.message
    : error && typeof error === 'object' && 'message' in error
      ? String((error as { message?: unknown }).message || '')
      : undefined

const getClientErrorMessage = (error: unknown, fallback: string) => {
  if (isMissingClientTableError(error)) return CLIENT_SETUP_MESSAGE

  const message = getErrorMessage(error)
  if (message?.includes('row-level security') || message?.includes('permission denied')) {
    return `${message}. Re-run scripts/database/setup-clients.sql in Supabase SQL Editor to update table permissions.`
  }

  return message || fallback
}

export function useClients() {
  const [client, setClient] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const supabase = createClient()

  const fetchClients = async () => {
    setLoading(true)
    try {
      const data = await fetchClientsFromDb(supabase)
      setClient(data)
    } catch (error: unknown) {
      if (isMissingClientTableError(error)) {
        setClient([])
        toast({
          title: 'Setup Required',
          description: CLIENT_SETUP_MESSAGE,
          variant: 'destructive',
        })
        return
      }
      toast({
        title: 'Error',
        description: getClientErrorMessage(error, 'Failed to fetch client list'),
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const addClient = async (formData: ClientFormData) => {
    try {
      const payload = {
        client_name: formData.client_name.trim(),
        location: formData.location.trim(),
        address: formData.address?.trim() || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const { data, error } = await supabase
        .from('client')
        .insert([payload])
        .select()
        .single()

      if (error) throw error

      setClient((current) => sortClients([...current, data]))
      toast({ title: 'Success', description: 'Client added successfully' })
      return data
    } catch (error: unknown) {
      toast({
        title: isMissingClientTableError(error) ? 'Setup Required' : 'Error',
        description: getClientErrorMessage(error, 'Failed to add client'),
        variant: 'destructive',
      })
      throw error
    }
  }

  const updateClient = async (id: string, formData: ClientFormData) => {
    try {
      const payload = {
        client_name: formData.client_name.trim(),
        location: formData.location.trim(),
        address: formData.address?.trim() || null,
        updated_at: new Date().toISOString(),
      }

      const { data, error } = await supabase
        .from('client')
        .update(payload)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      setClient((current) =>
        sortClients(current.map((item) => (item.id === id ? data : item)))
      )
      toast({ title: 'Success', description: 'Client updated successfully' })
      return data
    } catch (error: unknown) {
      toast({
        title: isMissingClientTableError(error) ? 'Setup Required' : 'Error',
        description: getClientErrorMessage(error, 'Failed to update client'),
        variant: 'destructive',
      })
      throw error
    }
  }

  const deleteClient = async (id: string) => {
    try {
      const { error } = await supabase
        .from('client')
        .delete()
        .eq('id', id)

      if (error) throw error

      setClient((current) => current.filter((item) => item.id !== id))
      toast({ title: 'Success', description: 'Client location deleted successfully' })
    } catch (error: unknown) {
      toast({
        title: isMissingClientTableError(error) ? 'Setup Required' : 'Error',
        description: getClientErrorMessage(error, 'Failed to delete client'),
        variant: 'destructive',
      })
      throw error
    }
  }

  useEffect(() => {
    fetchClients()
  }, [])

  return {
    client,
    loading,
    addClient,
    updateClient,
    deleteClient,
    refresh: fetchClients,
  }
}
