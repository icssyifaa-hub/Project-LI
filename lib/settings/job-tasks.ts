const normalizeJobTaskName = (value: unknown) => String(value || '').trim()

export const JOB_TASK_FULL_NAMES: Record<string, string> = {
  CHRA: 'Chemical Health Risk Assessment',
  SIRAC: 'Simple Risk Assessment and Control',
  BM: 'Biological Monitoring',
  CEM: 'Chemical Exposure Monitoring',
  MS: 'Medical Surveillance',
  GEV: 'General Exhaust Ventilation',
  LEV: 'Local Exhaust Ventilation',
  NRA: 'Noise Risk Assessment',
  AUD: 'Audiometric Testing',
  IAQ: 'Indoor Air Quality',
  IERA: 'Initial Ergonomics Risk Assessment',
  AERA: 'Advanced Ergonomics Risk Assessment',
  HIRARC: 'Hazard Identification, Risk Assessment and Risk Control',
  LIGHT: 'Lighting / Illumination Assessment',
  HEAT: 'Heat Stress Assessment',
  CLASS: 'Classification, Labelling and Safety Data Sheet of Hazardous',
  SDS: 'Safety Data Sheet',
  SRA: 'Safety Risk Assessment',
  TRA: 'Task Risk Assessment',
  BNM: 'Boundary Noise Monitoring',
}

export function getJobTaskFullName(name: unknown): string {
  const taskName = normalizeJobTaskName(name)
  return JOB_TASK_FULL_NAMES[taskName.toUpperCase()] || ''
}

export async function fetchJobTaskNames(supabase: any): Promise<string[]> {
  const names = new Map<string, string>()

  const addName = (value: unknown) => {
    const name = normalizeJobTaskName(value)
    if (!name) return

    const key = name.toLowerCase()
    if (!names.has(key)) {
      names.set(key, name)
    }
  }

  const masterTasks = await supabase
    .from('job_tasks')
    .select('name')
    .order('name', { ascending: true })

  if (masterTasks.error) throw masterTasks.error

  ;(masterTasks.data || []).forEach((task: { name?: unknown }) => {
    addName(task.name)
  })

  return Array.from(names.values()).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
  )
}
