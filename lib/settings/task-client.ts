export const TASK_CLIENT_SELECT =
  '*, client:client!tasks_client_id_fkey(id, client_name, location, address)'

export type TaskClientRecord = {
  id?: string | null
  client_name?: string | null
  location?: string | null
  address?: string | null
}

type TaskWithClient = {
  client?: TaskClientRecord | TaskClientRecord[] | null
  client_id?: string | null
  client_name?: string | null
  location?: string | null
  address?: string | null
}

export function getTaskClient(task: TaskWithClient): TaskClientRecord {
  const relatedClient = Array.isArray(task.client) ? task.client[0] : task.client

  return {
    id: relatedClient?.id || task.client_id || null,
    client_name: relatedClient?.client_name || task.client_name || null,
    location: relatedClient?.location || task.location || null,
    address: relatedClient?.address || task.address || null,
  }
}
