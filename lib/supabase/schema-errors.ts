const TASK_CLIENT_ID_FIX =
  'Database missing tasks.client_id. Run scripts/database/fix-tasks-client-id.sql in Supabase SQL Editor, then refresh the app.'

export function getSupabaseSchemaErrorMessage(error: unknown) {
  if (!error || typeof error !== 'object') return null

  const maybeError = error as { code?: string; message?: string }
  const message = maybeError.message || ''

  if (
    maybeError.code === 'PGRST204' &&
    message.includes('client_id') &&
    message.includes('tasks')
  ) {
    return TASK_CLIENT_ID_FIX
  }

  return null
}

export function getMissingSchemaColumn(error: unknown) {
  if (!error || typeof error !== 'object') return null

  const maybeError = error as { code?: string; message?: string }
  if (maybeError.code !== 'PGRST204' || !maybeError.message) return null

  const match = maybeError.message.match(/Could not find the '([^']+)' column of '([^']+)'/)
  if (!match) return null

  return {
    column: match[1],
    table: match[2],
  }
}
