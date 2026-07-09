import type { SupabaseClient } from '@supabase/supabase-js'

export const CLIENT_SETUP_MESSAGE =
  'Client table is not set up yet. Run scripts/database/setup-clients.sql in Supabase SQL Editor.'

export type Client = {
  id: string
  client_name: string
  location: string
  address?: string | null
  created_at?: string
  updated_at?: string
}

const normalizeText = (value: unknown) => String(value || '').trim()

export const sortClients = (items: Client[]) =>
  [...items].sort((a, b) => {
    const clientCompare = normalizeText(a.client_name).localeCompare(
      normalizeText(b.client_name),
      undefined,
      { numeric: true, sensitivity: 'base' }
    )

    if (clientCompare !== 0) return clientCompare

    return normalizeText(a.location).localeCompare(
      normalizeText(b.location),
      undefined,
      { numeric: true, sensitivity: 'base' }
    )
  })

export const getUniqueClientNames = (items: Client[]) =>
  Array.from(new Set(items.map((item) => normalizeText(item.client_name)).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
  )

export const getLocationsForClient = (items: Client[], clientName: string) => {
  const normalizedClientName = normalizeText(clientName).toLowerCase()
  if (!normalizedClientName) return []

  return sortClients(
    items.filter((item) => normalizeText(item.client_name).toLowerCase() === normalizedClientName)
  )
}

export const findClient = (
  items: Client[],
  value: { id?: string | null; clientName?: string | null; location?: string | null }
) => {
  const id = normalizeText(value.id)
  if (id) {
    const byId = items.find((item) => item.id === id)
    if (byId) return byId
  }

  const clientName = normalizeText(value.clientName).toLowerCase()
  const location = normalizeText(value.location).toLowerCase()
  if (!clientName || !location) return undefined

  return items.find(
    (item) =>
      normalizeText(item.client_name).toLowerCase() === clientName &&
      normalizeText(item.location).toLowerCase() === location
  )
}

export const isMissingClientTableError = (error: unknown) => {
  if (!error || typeof error !== 'object') return false

  const maybeError = error as { code?: string; message?: string }
  return (
    maybeError.code === 'PGRST205' &&
    String(maybeError.message || '').includes('client')
  )
}

export async function fetchClients(supabase: SupabaseClient): Promise<Client[]> {
  const { data, error } = await supabase
    .from('client')
    .select('id, client_name, location, address, created_at, updated_at')
    .order('client_name', { ascending: true })
    .order('location', { ascending: true })

  if (error) throw error
  return sortClients(data || [])
}
