import { createClient } from './client'

const supabase = createClient()

// Get holidays between dates
export async function getHolidays(startDate: string, endDate: string) {
  try {
    const { data, error } = await supabase
      .from('holidays')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching holidays:', error)
    return []
  }
}

// Get all holidays for a year
export async function getHolidaysByYear(year: number) {
  try {
    const startDate = `${year}-01-01`
    const endDate = `${year}-12-31`
    
    const { data, error } = await supabase
      .from('holidays')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching holidays:', error)
    return []
  }
}

// Get all holidays (unfiltered)
export async function getAllHolidays() {
  try {
    const { data, error } = await supabase
      .from('holidays')
      .select('*')
      .order('date', { ascending: true })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching all holidays:', error)
    return []
  }
}