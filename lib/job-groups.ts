export const createJobGroupId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `job-group-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export const getTaskJobGroupId = (task: {
  id?: string | null
  job_group_id?: string | null
  jobGroupId?: string | null
  job_order_number?: string | null
  jobOrderNumber?: string | null
}) => {
  const explicitGroupId = String(task.job_group_id || task.jobGroupId || '').trim()
  if (explicitGroupId) return explicitGroupId

  const jobOrderNumber = String(task.job_order_number || task.jobOrderNumber || '').trim()
  if (jobOrderNumber) return `jo:${jobOrderNumber}`

  return `task:${task.id || createJobGroupId()}`
}

export const isSameJobOrderFollowUp = (
  value: string | null | undefined,
  followUpJobOrderNumber: string | null | undefined
) => {
  return (
    String(value || '').trim().toLowerCase() !== '' &&
    String(value || '').trim().toLowerCase() ===
      String(followUpJobOrderNumber || '').trim().toLowerCase()
  )
}
