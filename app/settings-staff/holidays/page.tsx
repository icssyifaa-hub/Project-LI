'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarDays, RefreshCw, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'
import type { AppUser } from '@/lib/auth/client'
import { MALAYSIA_STATES } from '@/app/settings-admin/types'
import type { Holiday } from '@/app/settings-admin/types'
import { SettingsPagination, useSettingsPagination } from '@/app/settings-admin/components/SettingsPagination'

const tableHeaderCellClass = 'border-r border-black px-4 py-3 text-left text-[11px] font-semibold uppercase text-gray-700 dark:text-gray-200'
const tableCellClass = 'border-r border-black px-4 py-3 text-black dark:text-gray-100'
const HOLIDAY_YEAR_START = 2022
const HOLIDAY_YEAR_END = 2035
const holidayYears = Array.from(
  { length: HOLIDAY_YEAR_END - HOLIDAY_YEAR_START + 1 },
  (_, index) => HOLIDAY_YEAR_START + index
)
const holidaySelectContentClass =
  'border border-gray-200 bg-white text-gray-900 shadow-lg dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100'
const holidaySelectItemClass =
  'text-gray-900 focus:bg-gray-100 focus:text-gray-900 dark:text-gray-100 dark:focus:bg-gray-800 dark:focus:text-gray-100'

const getStatesLabel = (stateCodes?: string[] | null) => {
  if (!stateCodes || stateCodes.length === 0 || stateCodes.length === MALAYSIA_STATES.length) return 'All States'

  return stateCodes
    .map((code) => MALAYSIA_STATES.find((state) => state.value === code)?.label || code)
    .join(', ')
}

const formatHolidayDate = (date: string) =>
  new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

export default function HolidaysPage() {
  const [user, setUser] = useState<AppUser | null>(null)
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [loading, setLoading] = useState(true)
  const [filterYear, setFilterYear] = useState(new Date().getFullYear())
  const [filterState, setFilterState] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const fetchHolidays = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('holidays')
        .select('id, name, date, states, created_at')
        .order('date', { ascending: true })

      if (error) throw error
      setHolidays(data || [])
    } catch (error) {
      console.error('Error loading holidays:', error)
      setHolidays([])
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (!userData) {
      router.push('/login')
      return
    }

    setUser(JSON.parse(userData))
    fetchHolidays()
  }, [fetchHolidays, router])

  const filteredHolidays = holidays.filter((holiday) => {
    const keyword = searchTerm.trim().toLowerCase()
    const holidayYear = new Date(holiday.date).getFullYear()
    const isAllStatesHoliday = !holiday.states || holiday.states.length === 0 || holiday.states.length === MALAYSIA_STATES.length
    const stateLabel = getStatesLabel(holiday.states).toLowerCase()
    const matchesSearch =
      !keyword ||
      holiday.name.toLowerCase().includes(keyword) ||
      holiday.date.includes(keyword) ||
      formatHolidayDate(holiday.date).toLowerCase().includes(keyword) ||
      stateLabel.includes(keyword)

    if (holidayYear !== filterYear) return false
    if (!matchesSearch) return false
    if (filterState === 'all') return true
    if (filterState === 'national') return isAllStatesHoliday

    return isAllStatesHoliday || Boolean(holiday.states?.includes(filterState))
  })
  const holidaysPagination = useSettingsPagination(filteredHolidays)

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50 p-2 dark:bg-gray-950 sm:p-3 lg:p-4">
      <div className="w-full max-w-none space-y-6">
        <div className="-mx-2 -mt-2 flex flex-col gap-4 border-b border-gray-200 bg-white px-2 py-4 dark:border-gray-800 dark:bg-gray-950 sm:-mx-3 sm:-mt-3 sm:flex-row sm:items-center sm:justify-between sm:px-3 lg:-mx-4 lg:-mt-4 lg:px-4">
          <div>
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Holidays</h1>
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {holidays.length} holidays
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Select value={filterYear.toString()} onValueChange={(value) => setFilterYear(parseInt(value, 10))}>
              <SelectTrigger className="w-full border-gray-300 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 sm:w-32">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent className={holidaySelectContentClass}>
                {holidayYears.map((year) => (
                  <SelectItem key={year} value={year.toString()} className={holidaySelectItemClass}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterState} onValueChange={setFilterState}>
              <SelectTrigger className="w-full border-gray-300 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 sm:w-44">
                <SelectValue placeholder="State" />
              </SelectTrigger>
              <SelectContent className={holidaySelectContentClass}>
                <SelectItem value="all" className={holidaySelectItemClass}>All States</SelectItem>
                <SelectItem value="national" className={holidaySelectItemClass}>All States Only</SelectItem>
                {MALAYSIA_STATES.map((state) => (
                  <SelectItem key={state.value} value={state.value} className={holidaySelectItemClass}>
                    {state.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search holidays..."
                className="w-full border-gray-300 bg-white pl-8 text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 sm:w-64"
              />
            </div>

            <Button
              variant="outline"
              onClick={fetchHolidays}
              disabled={loading}
              className="w-full border-gray-300 text-gray-900 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-800 sm:w-auto"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-black bg-white shadow-sm ring-1 ring-black/10 dark:bg-gray-900">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-sm">
              <thead className="bg-gray-100 dark:bg-gray-800">
                <tr className="border-b border-black">
                  <th className={`${tableHeaderCellClass} w-20`}>No</th>
                  <th className={`${tableHeaderCellClass} w-44`}>Date</th>
                  <th className={tableHeaderCellClass}>Holiday Name</th>
                  <th className={tableHeaderCellClass}>States</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="border-t border-black px-4 py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="mb-2 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Loading holidays...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredHolidays.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="border-t border-black px-4 py-12 text-center">
                      <p className="text-gray-500 dark:text-gray-300">
                        {searchTerm ? 'No holidays match your search' : 'No holidays found for this filter'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  holidaysPagination.paginatedRows.map((holiday, index) => (
                    <tr key={holiday.id} className="border-b border-black bg-white transition-colors hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800">
                      <td className={tableCellClass}>{holidaysPagination.pageStart + index + 1}</td>
                      <td className={`${tableCellClass} font-semibold`}>{formatHolidayDate(holiday.date)}</td>
                      <td className={`${tableCellClass} font-semibold`}>{holiday.name}</td>
                      <td className={tableCellClass}>{getStatesLabel(holiday.states)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <SettingsPagination
            currentPage={holidaysPagination.currentPage}
            rowsPerPage={holidaysPagination.rowsPerPage}
            totalItems={filteredHolidays.length}
            totalPages={holidaysPagination.totalPages}
            showingStart={holidaysPagination.showingStart}
            showingEnd={holidaysPagination.showingEnd}
            onPageChange={holidaysPagination.setCurrentPage}
            onRowsPerPageChange={holidaysPagination.setRowsPerPage}
          />
        </div>
      </div>
    </div>
  )
}
