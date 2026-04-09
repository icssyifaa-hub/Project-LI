// /types/index.ts

export type User = {
  id: string
  user_id: string
  name: string
  email: string
  password: string
  role: 'admin' | 'staff'
  created_at: string
}

export type Staff = {
  id: string
  name: string
  position: string
  created_at: string
}

export type JobTask = {
  id: string
  code: string
  name: string
  created_at: string
}

export type JobTaskFormData = {
  code: string
  name: string
}

export type PDFTemplate = {
  id: string
  name: string
  file_url: string | null
  file_name: string | null
  type: 'job-order' | 'final-report'
  uploaded_at: string
}

export type Holiday = {
  id: string
  name: string
  date: string
  states: string[] | null
  created_at: string
}

export type HolidayFormData = {
  name: string
  date: string
  states: string[]
}

export type UserFormData = {
  user_id: string
  name: string
  email: string
  password: string
  role: 'admin' | 'staff'
}

export type StaffFormData = {
  name: string
  position: string
}

export type State = {
  value: string
  label: string
}

export const MALAYSIA_STATES: State[] = [
  { value: 'JHR', label: 'Johor' },
  { value: 'KDH', label: 'Kedah' },
  { value: 'KTN', label: 'Kelantan' },
  { value: 'MLK', label: 'Melaka' },
  { value: 'NSN', label: 'Negeri Sembilan' },
  { value: 'PHG', label: 'Pahang' },
  { value: 'PRK', label: 'Perak' },
  { value: 'PLS', label: 'Perlis' },
  { value: 'PNG', label: 'Penang' },
  { value: 'SBH', label: 'Sabah' },
  { value: 'SWK', label: 'Sarawak' },
  { value: 'SGR', label: 'Selangor' },
  { value: 'TRG', label: 'Terengganu' },
  { value: 'KUL', label: 'Kuala Lumpur' },
  { value: 'LBN', label: 'Labuan' },
  { value: 'PJY', label: 'Putrajaya' },
]