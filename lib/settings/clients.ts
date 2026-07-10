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

export type ClientTableRow = Client & {
  displayIndex: number
  isFirstClientRow: boolean
  clientNameRowSpan: number
}

const normalizeText = (value: unknown) => String(value || '').replace(/\s+/g, ' ').trim()

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

export const getClientTableRows = (items: Client[], startIndex = 0): ClientTableRow[] => {
  const rows = items.map((item, index) => ({
    ...item,
    displayIndex: startIndex + index + 1,
    isFirstClientRow: false,
    clientNameRowSpan: 0,
  }))

  let index = 0
  while (index < rows.length) {
    const clientName = normalizeText(rows[index].client_name).toLowerCase()
    let span = 1

    while (
      index + span < rows.length &&
      normalizeText(rows[index + span].client_name).toLowerCase() === clientName
    ) {
      span += 1
    }

    rows[index].isFirstClientRow = true
    rows[index].clientNameRowSpan = span
    index += span
  }

  return rows
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
